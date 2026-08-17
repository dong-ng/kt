import { createRequire } from "node:module";
import { beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  applyAntigravityIdeVersionOverride,
  clearAntigravityVersionCaches,
  resolveAntigravityIdeVersion,
  rewriteAntigravityUserAgent,
} = require("../../src/mitm/antigravityIdeVersion.js");

describe("Antigravity MITM version override", () => {
  beforeEach(() => clearAntigravityVersionCaches());

  it("preserves both native and IDE user-agent shapes", () => {
    expect(rewriteAntigravityUserAgent("antigravity/1.20.0 darwin/arm64", "2.4.0"))
      .toBe("antigravity/2.4.0 darwin/arm64");
    expect(rewriteAntigravityUserAgent("antigravity/ide/2.1.1 darwin/arm64", "2.4.0"))
      .toBe("antigravity/ide/2.4.0 darwin/arm64");
  });

  it("uses the fetched version for metadata and headers", async () => {
    await resolveAntigravityIdeVersion(async () => new Response(
      JSON.stringify([{ version: "2.5.0" }]),
      { status: 200 },
    ));

    const result = applyAntigravityIdeVersionOverride(
      Buffer.from(JSON.stringify({ metadata: { ideType: "ANTIGRAVITY", ideVersion: "1.23.2" } })),
      { "user-agent": "antigravity/1.23.2 darwin/arm64" },
    );
    expect(result.version).toBe("2.5.0");
    expect(result.headers["user-agent"]).toBe("antigravity/2.5.0 darwin/arm64");
    expect(JSON.parse(result.bodyBuffer.toString()).metadata.ideVersion).toBe("2.5.0");
  });
});
