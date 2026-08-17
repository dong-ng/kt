import { afterEach, describe, expect, it, vi } from "vitest";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";
import {
  getAntigravityClientProfile,
  normalizeAntigravityClientProfile,
} from "../../open-sse/services/antigravityClientProfile.js";
import { clearAntigravityVersionCaches } from "../../open-sse/services/antigravityVersion.js";

describe("Antigravity client profiles", () => {
  afterEach(() => {
    clearAntigravityVersionCaches();
    vi.unstubAllGlobals();
  });

  it("defaults invalid and absent values to the IDE profile", () => {
    expect(normalizeAntigravityClientProfile()).toBe("ide");
    expect(normalizeAntigravityClientProfile("other")).toBe("ide");
    expect(getAntigravityClientProfile({ providerSpecificData: {} })).toBe("ide");
  });

  it("resolves the CLI version before building chat headers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ tag_name: "v1.4.0" }),
      { status: 200 },
    )));
    const credentials = {
      accessToken: "token",
      providerSpecificData: { clientProfile: "cli" },
    };
    const executor = new AntigravityExecutor();

    await executor.prepareRequest(credentials);
    const headers = executor.buildHeaders(credentials);

    expect(headers["User-Agent"]).toContain("antigravity/cli/1.4.0");
    expect(headers.Authorization).toBe("Bearer token");
    expect(headers["User-Agent"]).toContain("auth_method=consumer");
  });
});
