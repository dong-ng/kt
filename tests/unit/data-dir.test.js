import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDataDir } from "../../src/lib/dataDir.js";

const originalEnv = { ...process.env };

describe("data directory isolation", () => {
  beforeEach(() => {
    delete process.env.DATA_DIR;
    delete process.env.KTROUTER_RUNTIME;
    vi.spyOn(process, "cwd").mockReturnValue("D:\\ktrouter");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("keeps source builds in the project data directory", () => {
    process.env.NODE_ENV = "production";
    expect(getDataDir()).toBe(path.join("D:\\ktrouter", "data"));
  });

  it("uses the user profile only for the packaged CLI runtime", () => {
    process.env.KTROUTER_RUNTIME = "cli";
    process.env.APPDATA = "C:\\Users\\Test\\AppData\\Roaming";
    expect(getDataDir()).toBe("C:\\Users\\Test\\AppData\\Roaming\\ktrouter");
  });
});
