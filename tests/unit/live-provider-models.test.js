import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLiveProviderModelsCache,
  resolveLiveProviderModels,
} from "../../open-sse/services/liveProviderModels.js";

describe("live provider model cache", () => {
  beforeEach(() => clearLiveProviderModelsCache());

  it("caches live models and preserves matching static metadata", async () => {
    const loadModels = vi.fn(async () => ({
      models: [{ id: "model-new", displayName: "Live model" }],
    }));
    const options = {
      provider: "antigravity",
      connectionId: "account-1",
      staticModels: [{ id: "model-new", name: "Static model", thinking: true }],
      loadModels,
    };

    const first = await resolveLiveProviderModels(options);
    const second = await resolveLiveProviderModels(options);

    expect(first).toMatchObject({ source: "live", cached: false });
    expect(first.models[0]).toMatchObject({ id: "model-new", name: "Live model", thinking: true });
    expect(second).toMatchObject({ source: "live-cache", cached: true });
    expect(loadModels).toHaveBeenCalledTimes(1);
  });

  it("uses stale live data when a forced refresh fails", async () => {
    await resolveLiveProviderModels({
      provider: "github",
      connectionId: "account-1",
      loadModels: async () => [{ id: "gpt-live" }],
    });

    const result = await resolveLiveProviderModels({
      provider: "github",
      connectionId: "account-1",
      forceRefresh: true,
      loadModels: async () => { throw new Error("offline"); },
    });

    expect(result.source).toBe("stale-cache");
    expect(result.models.map((model) => model.id)).toEqual(["gpt-live"]);
    expect(result.warning).toContain("offline");
  });

  it("returns the static catalog when no live data exists", async () => {
    const result = await resolveLiveProviderModels({
      provider: "codex",
      connectionId: "account-1",
      staticModels: [{ id: "gpt-static", name: "Static fallback" }],
      loadModels: async () => [],
    });

    expect(result).toMatchObject({ source: "static", cached: false, fetchedAt: null });
    expect(result.models).toEqual([{ id: "gpt-static", name: "Static fallback" }]);
  });
});
