import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clearAntigravityVersionCaches,
  seedAntigravityIdeVersionCache,
} from "../../open-sse/services/antigravityVersion.js";

const proxyAwareFetch = vi.fn(async (url) => ({
  ok: true,
  status: 200,
  json: async () => url.includes(":loadCodeAssist")
    ? { cloudaicompanionProject: "project-1", currentTier: { name: "Pro" } }
    : {
        groups: [{
          displayName: "Gemini",
          buckets: [{ bucketId: "gemini-5h", remainingFraction: 0.5, window: "5h" }],
        }],
      },
  text: async () => "{}",
}));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch,
}));

describe("Antigravity usage headers", () => {
  beforeEach(() => {
    proxyAwareFetch.mockClear();
    clearAntigravityVersionCaches();
    seedAntigravityIdeVersionCache("2.1.1");
  });

  it("uses the official IDE user agent and omits router-only source headers", async () => {
    const { getAntigravityUsage } = await import("../../open-sse/services/usage/google.js");

    await getAntigravityUsage("access-token", {});

    expect(proxyAwareFetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of proxyAwareFetch.mock.calls) {
      expect(options.headers["User-Agent"]).toBe(
        url.includes(":loadCodeAssist")
          ? "antigravity/2.1.1 darwin/arm64 google-api-nodejs-client/10.3.0"
          : "antigravity/ide/2.1.1 darwin/arm64",
      );
      expect(options.headers).not.toHaveProperty("x-request-source");
    }
  });
});
