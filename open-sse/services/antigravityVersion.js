import versionCore from "../../src/shared/antigravityVersionCore.cjs";

export const {
  ANTIGRAVITY_CLI_FALLBACK_VERSION,
  ANTIGRAVITY_CLI_RELEASE_URL,
  ANTIGRAVITY_IDE_FALLBACK_VERSION,
  ANTIGRAVITY_IDE_RELEASE_FEED_URL,
  ANTIGRAVITY_VERSION_CACHE_TTL_MS,
  ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS,
  clearAntigravityVersionCaches,
  getAntigravityCliVersionStatus,
  getAntigravityIdeVersionStatus,
  getCachedAntigravityCliVersion,
  getCachedAntigravityIdeVersion,
  resolveAntigravityCliVersion,
  resolveAntigravityIdeVersion,
  seedAntigravityCliVersionCache,
  seedAntigravityIdeVersionCache,
} = versionCore;
