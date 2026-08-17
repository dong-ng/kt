import { describe, expect, it } from "vitest";

import { FORMATS } from "../../open-sse/translator/formats.js";
import { needsResponsesAbortTerminal } from "../../open-sse/utils/responsesStreamHelpers.js";

describe("Responses streaming terminal selection", () => {
  it("protects translated Antigravity streams consumed by Codex", () => {
    expect(needsResponsesAbortTerminal(FORMATS.OPENAI_RESPONSES)).toBe(true);
  });

  it("does not append Responses events for other client formats", () => {
    expect(needsResponsesAbortTerminal(FORMATS.CLAUDE)).toBe(false);
    expect(needsResponsesAbortTerminal(FORMATS.ANTIGRAVITY)).toBe(false);
  });
});
