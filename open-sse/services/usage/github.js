/**
 * GitHub Copilot usage handler
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { PROVIDER_OAUTH } from "../../providers/index.js";
import { U, parseResetTime } from "./shared.js";

// GitHub API config — single source from registry oauth block
const GITHUB_CONFIG = {
  apiVersion: PROVIDER_OAUTH.github?.apiVersion,
  userAgent: PROVIDER_OAUTH.github?.userAgent,
};

/**
 * GitHub Copilot Usage
 * Uses GitHub accessToken (not copilotToken) to call copilot_internal/user API
 */
export async function getGitHubUsage(accessToken, providerSpecificData, proxyOptions = null) {
  try {
    if (!accessToken) {
      throw new Error("No GitHub access token available. Please re-authorize the connection.");
    }

    // copilot_internal/user API requires GitHub OAuth token, not copilotToken
    const response = await proxyAwareFetch(U("github").url, {
      headers: {
        "Authorization": `token ${accessToken}`,
        "Accept": "application/json",
        "X-GitHub-Api-Version": GITHUB_CONFIG.apiVersion,
        "User-Agent": GITHUB_CONFIG.userAgent,
        "Editor-Version": "vscode/1.100.0",
        "Editor-Plugin-Version": "copilot-chat/0.26.7",
      },
    }, proxyOptions);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    const data = await response.json();

    // Handle different response formats (paid vs free)
    if (data.quota_snapshots) {
      // Paid plan format
      const snapshots = data.quota_snapshots;
      const resetAt = parseResetTime(data.quota_reset_date);
      const quotas = {};

      for (const [key, snapshot] of Object.entries(snapshots)) {
        if (!snapshot || typeof snapshot !== "object") continue;
        quotas[key] = { ...formatGitHubQuotaSnapshot(snapshot), resetAt };
      }

      return {
        plan: data.copilot_plan,
        resetDate: data.quota_reset_date,
        quotas,
      };
    } else if (data.monthly_quotas || data.limited_user_quotas) {
      // Free/limited plan format
      const monthlyQuotas = data.monthly_quotas || {};
      const usedQuotas = data.limited_user_quotas || {};
      const resetAt = parseResetTime(data.limited_user_reset_date);
      const formatLimitedQuota = (key) => {
        const total = Number(monthlyQuotas[key]) || 0;
        const used = Number(usedQuotas[key]) || 0;
        const remaining = Math.max(0, total - used);
        return {
          used,
          total,
          displayValue: remaining,
          remainingPercentage: total > 0 ? (remaining / total) * 100 : 0,
          unlimited: false,
          resetAt,
        };
      };

      return {
        plan: data.copilot_plan || data.access_type_sku,
        resetDate: data.limited_user_reset_date,
        quotas: {
          chat: formatLimitedQuota("chat"),
          completions: formatLimitedQuota("completions"),
        },
      };
    }

    return { message: "GitHub Copilot connected. Unable to parse quota data." };
  } catch (error) {
    throw new Error(`Failed to fetch GitHub usage: ${error.message}`);
  }
}

function formatGitHubQuotaSnapshot(quota) {
  if (!quota) return null;

  const unlimited = quota.unlimited === true;
  const total = Number(quota.entitlement) || 0;
  const remaining = Number(quota.remaining) || 0;
  const used = unlimited ? 0 : Math.max(0, total - remaining);

  return {
    used,
    total,
    displayValue: unlimited ? "∞" : remaining,
    remainingPercentage: unlimited || total === 0
      ? 100
      : Math.max(0, Math.min(100, (remaining / total) * 100)),
    unlimited,
  };
}
