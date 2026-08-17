/**
 * Google usage handlers (Gemini CLI + Antigravity)
 */

import { CLIENT_METADATA } from "../../config/appConstants.js";
import { ANTIGRAVITY_OAUTH_CLIENT } from "../../providers/shared.js";
import { U, parseResetTime, normalizeCloudCodeProjectId, fetchWithTimeout } from "./shared.js";
import { getAntigravityContentHeaders, getAntigravityOAuthHeaders } from "../antigravityHeaders.js";
import {
  getAntigravityClientProfile,
  resolveAntigravityClientVersion,
} from "../antigravityClientProfile.js";

// Antigravity API config (from Quotio) — urls from registry, oauth client + dynamic UA kept here
const ANTIGRAVITY_CONFIG = {
  ...U("antigravity"),
  ...ANTIGRAVITY_OAUTH_CLIENT,
};

const ANTIGRAVITY_QUOTA_SUMMARY_URLS = [
  "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:retrieveUserQuotaSummary",
  "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary",
  "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary",
];

export function parseAntigravityQuotaSummary(data) {
  const groups = data?.groups || data?.response?.groups;
  if (!Array.isArray(groups)) return {};

  const bucketsByKey = new Map();

  for (const group of groups) {
    const groupName = String(group?.displayName || "").toLowerCase();

    for (const bucket of group?.buckets || []) {
      const bucketId = String(bucket?.bucketId || "").toLowerCase();
      const family = bucketId.startsWith("gemini-") || groupName.includes("gemini")
        ? "gemini"
        : bucketId.startsWith("3p-") || groupName.includes("claude") || groupName.includes("gpt")
          ? "claude-gpt"
          : null;
      const rawWindow = String(bucket?.window || bucketId).toLowerCase();
      const window = rawWindow.includes("5h") ? "5h" : rawWindow.includes("week") ? "week" : null;
      if (!family || !window) continue;

      const oneofRemaining = bucket?.remaining?.case === "remainingFraction"
        ? bucket.remaining.value
        : undefined;
      const remainingFraction = Number(bucket?.remainingFraction ?? oneofRemaining);
      if (!Number.isFinite(remainingFraction)) continue;

      const remainingPercentage = Math.max(0, Math.min(100, remainingFraction * 100));
      bucketsByKey.set(`${family}-${window}`, {
        used: 100 - remainingPercentage,
        total: 100,
        displayValue: Math.round(remainingPercentage),
        resetAt: parseResetTime(bucket?.resetTime),
        remainingPercentage,
        unlimited: false,
      });
    }
  }

  const quotaOrder = [
    ["gemini-5h", "Gemini - 5h"],
    ["gemini-week", "Gemini - week"],
    ["claude-gpt-5h", "Claude/GPT - 5h"],
    ["claude-gpt-week", "Claude/GPT - week"],
  ];

  return Object.fromEntries(
    quotaOrder
      .filter(([key]) => bucketsByKey.has(key))
      .map(([key, displayName]) => [key, { ...bucketsByKey.get(key), displayName }]),
  );
}

/**
 * Gemini CLI Usage — fetch per-model quota via Cloud Code Assist API.
 * Uses retrieveUserQuota (same endpoint as `gemini /stats`) returning
 * per-model buckets with remainingFraction + resetTime.
 */
export async function getGeminiUsage(accessToken, providerSpecificData, proxyOptions = null) {
  if (!accessToken) {
    return { plan: "Free", message: "Gemini CLI access token not available." };
  }

  try {
    // Resolve project id: prefer connection-stored id, else loadCodeAssist lookup.
    // #1271: OAuth save stores projectId on the connection, not providerSpecificData.
    let projectId = normalizeCloudCodeProjectId(providerSpecificData?.projectId);
    let plan = "Free";

    if (!projectId) {
      const subInfo = await getGeminiSubscriptionInfo(accessToken, proxyOptions);
      projectId = normalizeCloudCodeProjectId(subInfo?.cloudaicompanionProject);
      plan = subInfo?.currentTier?.name || plan;
    }

    if (!projectId) {
      return {
        plan,
        message: "Gemini CLI project ID not available. Reconnect Gemini CLI, or configure a Google Cloud project with Gemini Code Assist access before checking quota.",
      };
    }

    const response = await fetchWithTimeout(
      U("gemini-cli").quotaUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: projectId }),
      },
      10000,
      proxyOptions
    );

    if (!response.ok) {
      return { plan, message: `Gemini CLI quota error (${response.status}).` };
    }

    const data = await response.json();
    const quotas = {};

    if (Array.isArray(data.buckets)) {
      for (const bucket of data.buckets) {
        if (!bucket.modelId || bucket.remainingFraction == null) continue;

        const remainingFraction = Number(bucket.remainingFraction) || 0;
        const total = 1000; // Normalized base, matches antigravity convention
        const remaining = Math.round(total * remainingFraction);
        const used = Math.max(0, total - remaining);

        quotas[bucket.modelId] = {
          used,
          total,
          resetAt: parseResetTime(bucket.resetTime),
          remainingPercentage: remainingFraction * 100,
          unlimited: false,
        };
      }
    }

    return { plan, quotas };
  } catch (error) {
    return { message: `Gemini CLI error: ${error.message}` };
  }
}

/**
 * Get Gemini CLI subscription info via loadCodeAssist
 */
async function getGeminiSubscriptionInfo(accessToken, proxyOptions = null) {
  try {
    const response = await fetchWithTimeout(
      U("gemini-cli").loadCodeAssistUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata: CLIENT_METADATA }),
      },
      10000,
      proxyOptions
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Antigravity Usage - Fetch quota from Google Cloud Code API
 */
export async function getAntigravityUsage(accessToken, providerSpecificData, proxyOptions = null) {
  try {
    const profile = getAntigravityClientProfile({ providerSpecificData });
    const clientVersion = await resolveAntigravityClientVersion(profile);
    // Fetch subscription info once — reuse for both projectId and plan
    const subscriptionInfo = await getAntigravitySubscriptionInfo(
      accessToken,
      profile,
      clientVersion,
      proxyOptions,
    );
    const projectId = subscriptionInfo?.cloudaicompanionProject || null;

    let quotas = {};
    let lastStatus = null;

    for (const quotaUrl of ANTIGRAVITY_QUOTA_SUMMARY_URLS) {
      const response = await fetchWithTimeout(quotaUrl, {
        method: "POST",
        headers: {
          ...getAntigravityContentHeaders(profile, accessToken, clientVersion),
          "X-Client-Name": "antigravity",
          "X-Client-Version": clientVersion,
        },
        body: JSON.stringify(projectId ? { project: projectId } : {}),
      }, 10000, proxyOptions);

      lastStatus = response.status;
      if (response.ok) {
        quotas = parseAntigravityQuotaSummary(await response.json());
        if (Object.keys(quotas).length > 0) break;
      } else if (response.status === 401 || response.status === 403) {
        break;
      }
    }

    if (Object.keys(quotas).length === 0) {
      const reason = lastStatus === 401
        ? "authentication expired"
        : lastStatus === 403
          ? "access forbidden"
          : "grouped quota is unavailable";
      return {
        plan: subscriptionInfo?.currentTier?.name || "Unknown",
        message: `Antigravity ${reason}. Chat may still work.`,
        quotas: {},
        subscriptionInfo,
      };
    }

    return {
      plan: subscriptionInfo?.currentTier?.name || "Unknown",
      quotas,
      subscriptionInfo,
    };
  } catch (error) {
    console.error("[Antigravity Usage] Error:", error.message, error.cause);
    return { message: `Antigravity error: ${error.message}` };
  }
}

/**
 * Get Antigravity subscription info
 */
async function getAntigravitySubscriptionInfo(accessToken, profile, clientVersion, proxyOptions = null) {
  try {
    const response = await fetchWithTimeout(ANTIGRAVITY_CONFIG.loadProjectApiUrl, {
      method: "POST",
      headers: getAntigravityOAuthHeaders(profile, accessToken, clientVersion),
      body: JSON.stringify({ metadata: CLIENT_METADATA, mode: 1 }),
    }, 10000, proxyOptions);

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("[Antigravity Subscription] Error:", error.message);
    return null;
  }
}
