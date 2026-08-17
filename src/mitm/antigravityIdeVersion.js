"use strict";

const versionCore = require("../shared/antigravityVersionCore.cjs");

function shouldRewriteMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  if (String(metadata.ideName || "").toLowerCase() === "antigravity") return true;
  if (String(metadata.ideType || "").toUpperCase() === "ANTIGRAVITY") return true;
  return Object.prototype.hasOwnProperty.call(metadata, "ideVersion");
}

function rewriteAntigravityUserAgent(userAgent, version) {
  if (typeof userAgent !== "string" || !userAgent.includes("antigravity/")) return userAgent;
  return userAgent.replace(
    /antigravity\/(ide\/)?[^\s]+/,
    (_match, idePrefix) => `antigravity/${idePrefix || ""}${version}`,
  );
}

function applyAntigravityIdeVersionOverride(bodyBuffer, headers) {
  versionCore.resolveAntigravityIdeVersion().catch(() => {});
  const version = versionCore.getCachedAntigravityIdeVersion();
  const nextHeaders = { ...headers };
  const nextUserAgent = rewriteAntigravityUserAgent(nextHeaders["user-agent"], version);
  const userAgentChanged = nextUserAgent !== nextHeaders["user-agent"];
  if (userAgentChanged) nextHeaders["user-agent"] = nextUserAgent;

  try {
    const parsed = JSON.parse(bodyBuffer.toString());
    if (!shouldRewriteMetadata(parsed?.metadata)) {
      return { bodyBuffer, headers: nextHeaders, applied: userAgentChanged, version };
    }
    parsed.metadata.ideVersion = version;
    return {
      bodyBuffer: Buffer.from(JSON.stringify(parsed)),
      headers: nextHeaders,
      applied: true,
      version,
    };
  } catch {
    return { bodyBuffer, headers: nextHeaders, applied: userAgentChanged, version };
  }
}

module.exports = {
  ...versionCore,
  applyAntigravityIdeVersionOverride,
  rewriteAntigravityUserAgent,
};
