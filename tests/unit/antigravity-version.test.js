import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANTIGRAVITY_CLI_FALLBACK_VERSION,
  ANTIGRAVITY_IDE_FALLBACK_VERSION,
  clearAntigravityVersionCaches,
  getCachedAntigravityCliVersion,
  getCachedAntigravityIdeVersion,
  getAntigravityIdeVersionStatus,
  resolveAntigravityCliVersion,
  resolveAntigravityIdeVersion,
} from "../../open-sse/services/antigravityVersion.js";
import {
  antigravityCliUserAgent,
  antigravityIdeUserAgent,
} from "../../open-sse/services/antigravityHeaders.js";

describe("Antigravity version resolver", () => {
  afterEach(() => {
    clearAntigravityVersionCaches();
    vi.restoreAllMocks();
  });

  it("uses independent IDE and CLI fallback versions", () => {
    expect(getCachedAntigravityIdeVersion()).toBe(ANTIGRAVITY_IDE_FALLBACK_VERSION);
    expect(getCachedAntigravityCliVersion()).toBe(ANTIGRAVITY_CLI_FALLBACK_VERSION);
    expect(antigravityIdeUserAgent()).toBe("antigravity/ide/2.1.1 darwin/arm64");
    expect(antigravityCliUserAgent()).toContain("antigravity/cli/1.1.5");
  });

  it("selects the newest IDE feed entry and caches it", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { version: "2.2.0" },
      { version: "v2.4.0" },
      { version: "invalid" },
    ]), { status: 200 }));

    await expect(resolveAntigravityIdeVersion(fetchMock)).resolves.toBe("2.4.0");
    await expect(resolveAntigravityIdeVersion(fetchMock)).resolves.toBe("2.4.0");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(antigravityIdeUserAgent()).toBe("antigravity/ide/2.4.0 darwin/arm64");
    expect(getAntigravityIdeVersionStatus()).toMatchObject({
      version: "2.4.0",
      sourceVersion: "2.4.0",
      fallbackUsed: false,
    });
  });

  it("reads the CLI release independently and safely falls back on failure", async () => {
    const cliFetch = vi.fn(async () => new Response(
      JSON.stringify({ tag_name: "v1.3.0" }),
      { status: 200 },
    ));
    await expect(resolveAntigravityCliVersion(cliFetch)).resolves.toBe("1.3.0");
    expect(getCachedAntigravityIdeVersion()).toBe("2.1.1");

    clearAntigravityVersionCaches();
    await expect(resolveAntigravityIdeVersion(async () => {
      throw new Error("offline");
    })).resolves.toBe("2.1.1");
  });
});
