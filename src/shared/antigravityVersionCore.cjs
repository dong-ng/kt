"use strict";

const ANTIGRAVITY_IDE_RELEASE_FEED_URL =
  "https://antigravity-auto-updater-974169037036.us-central1.run.app/releases";
const ANTIGRAVITY_CLI_RELEASE_URL =
  "https://api.github.com/repos/google-antigravity/antigravity-cli/releases/latest";

const ANTIGRAVITY_VERSION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS = 5_000;
const ANTIGRAVITY_IDE_FALLBACK_VERSION = "2.1.1";
const ANTIGRAVITY_CLI_FALLBACK_VERSION = "1.1.5";

const products = {
  ide: {
    cache: null,
    inFlight: null,
    fallbackVersion: ANTIGRAVITY_IDE_FALLBACK_VERSION,
    sourceUrl: ANTIGRAVITY_IDE_RELEASE_FEED_URL,
    parsePayload(payload) {
      if (!Array.isArray(payload)) return null;
      return pickNewestVersion(...payload.map((entry) => entry?.version));
    },
  },
  cli: {
    cache: null,
    inFlight: null,
    fallbackVersion: ANTIGRAVITY_CLI_FALLBACK_VERSION,
    sourceUrl: ANTIGRAVITY_CLI_RELEASE_URL,
    parsePayload(payload) {
      if (!payload || typeof payload !== "object") return null;
      return normalizeVersion(payload.tag_name ?? payload.name);
    },
  },
};

function normalizeVersion(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().replace(/^v/i, "").match(/^(\d+\.\d+\.\d+)\b/);
  return match ? match[1] : null;
}

function compareSemver(a, b) {
  const aParts = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const bParts = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

function pickNewestVersion(...versions) {
  return versions
    .map(normalizeVersion)
    .filter(Boolean)
    .reduce((best, version) => (!best || compareSemver(version, best) > 0 ? version : best), null);
}

async function fetchJsonWithTimeout(fetchImpl, url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "KTRouter-AntigravityVersion/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Version source ${url} returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveProductVersion(product, fetchImpl) {
  const state = products[product];
  const now = Date.now();
  if (state.cache && now - state.cache.fetchedAt < ANTIGRAVITY_VERSION_CACHE_TTL_MS) {
    return state.cache.version;
  }
  if (state.inFlight) return state.inFlight;
  if (typeof fetchImpl !== "function") return getCachedProductVersion(product);

  state.inFlight = (async () => {
    let sourceVersion = null;
    try {
      sourceVersion = state.parsePayload(await fetchJsonWithTimeout(fetchImpl, state.sourceUrl));
    } catch {
      sourceVersion = null;
    }

    const version = pickNewestVersion(
      sourceVersion,
      state.cache?.version,
      state.fallbackVersion,
    ) ?? state.fallbackVersion;
    if (sourceVersion) {
      state.cache = { fetchedAt: Date.now(), sourceVersion, version };
    }
    return version;
  })();

  try {
    return await state.inFlight;
  } finally {
    state.inFlight = null;
  }
}

function getCachedProductVersion(product) {
  const state = products[product];
  return state.cache?.version ?? state.fallbackVersion;
}

function seedProductVersionCache(product, version, fetchedAt) {
  const state = products[product];
  const normalized = normalizeVersion(version);
  if (!normalized) throw new TypeError(`Invalid Antigravity version: ${version}`);
  state.cache = { fetchedAt, sourceVersion: normalized, version: normalized };
}

function getProductVersionStatus(product) {
  const state = products[product];
  const cache = state.cache;
  const version = getCachedProductVersion(product);
  return {
    product,
    version,
    sourceVersion: cache?.sourceVersion ?? null,
    sourceUrl: state.sourceUrl,
    fetchedAt: cache?.fetchedAt ?? null,
    expiresAt: cache?.fetchedAt ? cache.fetchedAt + ANTIGRAVITY_VERSION_CACHE_TTL_MS : null,
    fallbackVersion: state.fallbackVersion,
    fallbackUsed: !cache || compareSemver(version, cache.sourceVersion) > 0,
  };
}

function clearAntigravityVersionCaches() {
  for (const state of Object.values(products)) {
    state.cache = null;
    state.inFlight = null;
  }
}

module.exports = {
  ANTIGRAVITY_CLI_FALLBACK_VERSION,
  ANTIGRAVITY_CLI_RELEASE_URL,
  ANTIGRAVITY_IDE_FALLBACK_VERSION,
  ANTIGRAVITY_IDE_RELEASE_FEED_URL,
  ANTIGRAVITY_VERSION_CACHE_TTL_MS,
  ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS,
  clearAntigravityVersionCaches,
  getAntigravityCliVersionStatus: () => getProductVersionStatus("cli"),
  getAntigravityIdeVersionStatus: () => getProductVersionStatus("ide"),
  getCachedAntigravityCliVersion: () => getCachedProductVersion("cli"),
  getCachedAntigravityIdeVersion: () => getCachedProductVersion("ide"),
  resolveAntigravityCliVersion: (fetchImpl = globalThis.fetch) => resolveProductVersion("cli", fetchImpl),
  resolveAntigravityIdeVersion: (fetchImpl = globalThis.fetch) => resolveProductVersion("ide", fetchImpl),
  seedAntigravityCliVersionCache: (version, fetchedAt = Date.now()) => seedProductVersionCache("cli", version, fetchedAt),
  seedAntigravityIdeVersionCache: (version, fetchedAt = Date.now()) => seedProductVersionCache("ide", version, fetchedAt),
};
