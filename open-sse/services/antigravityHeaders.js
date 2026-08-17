import {
  getCachedAntigravityCliVersion,
  getCachedAntigravityIdeVersion,
} from "./antigravityVersion.js";

export const ANTIGRAVITY_IDE_NODE_API_CLIENT = "google-api-nodejs-client/10.3.0";
export const ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT = "gl-node/22.21.1";

const ANTIGRAVITY_OS_TYPE = "darwin";
const ANTIGRAVITY_ARCH = "arm64";

export function antigravityIdeUserAgent(version = getCachedAntigravityIdeVersion()) {
  return `antigravity/ide/${version} ${ANTIGRAVITY_OS_TYPE}/${ANTIGRAVITY_ARCH}`;
}

export function antigravityCliUserAgent(
  version = getCachedAntigravityCliVersion(),
  authMethod = "consumer",
) {
  return `antigravity/cli/${version} (aidev_client; os_type=${ANTIGRAVITY_OS_TYPE}; arch=${ANTIGRAVITY_ARCH}; auth_method=${authMethod})`;
}

export function antigravityIdeNodeUserAgent(version = getCachedAntigravityIdeVersion()) {
  return `antigravity/${version} ${ANTIGRAVITY_OS_TYPE}/${ANTIGRAVITY_ARCH} ${ANTIGRAVITY_IDE_NODE_API_CLIENT}`;
}

export function getAntigravityOAuthUserAgent(profile = "ide", version) {
  return profile === "cli"
    ? antigravityCliUserAgent(version)
    : antigravityIdeNodeUserAgent(version);
}

export function getAntigravityContentHeaders(profile = "ide", accessToken = null, version) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": profile === "cli"
      ? antigravityCliUserAgent(version)
      : antigravityIdeUserAgent(version),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

export function getAntigravityOAuthHeaders(profile = "ide", accessToken = null, version) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": getAntigravityOAuthUserAgent(profile, version),
  };
  if (profile === "ide") {
    headers["X-Goog-Api-Client"] = ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT;
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

export function getAntigravityIdeNodeHeaders(accessToken = null) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": antigravityIdeNodeUserAgent(),
    "X-Goog-Api-Client": ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

export function getAntigravityLoadCodeAssistMetadata() {
  return { ideType: "ANTIGRAVITY" };
}
