export const LIVE_PROVIDER_MODELS_CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map();
const inFlight = new Map();

function normalizeModels(models, staticModels = []) {
  const staticById = new Map(staticModels.map((model) => [model.id, model]));
  const seen = new Set();
  const normalized = [];

  for (const model of Array.isArray(models) ? models : []) {
    const id = model?.id || model?.slug || model?.model || model?.name;
    if (typeof id !== "string" || !id.trim() || seen.has(id.trim())) continue;
    const cleanId = id.trim();
    seen.add(cleanId);
    normalized.push({
      ...(staticById.get(cleanId) || {}),
      ...model,
      id: cleanId,
      name: model?.name || model?.displayName || model?.display_name || staticById.get(cleanId)?.name || cleanId,
    });
  }

  return normalized;
}

export async function resolveLiveProviderModels({
  provider,
  connectionId,
  loadModels,
  staticModels = [],
  forceRefresh = false,
}) {
  const key = `${provider}:${connectionId}`;
  const now = Date.now();
  const cached = cache.get(key);

  if (!forceRefresh && cached && now - cached.fetchedAt < LIVE_PROVIDER_MODELS_CACHE_TTL_MS) {
    return { ...cached, source: "live-cache", cached: true };
  }
  if (!forceRefresh && inFlight.has(key)) return inFlight.get(key);

  const request = (async () => {
    try {
      const loaded = await loadModels();
      const models = normalizeModels(loaded?.models ?? loaded, staticModels);
      if (models.length === 0) throw new Error(loaded?.warning || "Provider returned no models");

      const result = {
        models,
        source: "live",
        cached: false,
        fetchedAt: Date.now(),
        warning: loaded?.warning || null,
      };
      cache.set(key, result);
      return result;
    } catch (error) {
      if (cached?.models?.length) {
        return {
          ...cached,
          source: "stale-cache",
          cached: true,
          warning: `Live model refresh failed: ${error.message}`,
        };
      }
      return {
        models: normalizeModels(staticModels, staticModels),
        source: "static",
        cached: false,
        fetchedAt: null,
        warning: `Live models unavailable: ${error.message}`,
      };
    }
  })();

  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
}

export function clearLiveProviderModelsCache() {
  cache.clear();
  inFlight.clear();
}
