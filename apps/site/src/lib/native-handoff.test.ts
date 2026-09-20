import { describe, expect, it } from "vitest";

import { safeTerminalNext } from "./native-handoff";

describe("safeTerminalNext", () => {
  it.each([null, undefined, "", "   "])(
    "falls back to the terminal for empty next value %#",
    (nextPath) => {
      expect(safeTerminalNext(nextPath)).toBe("/terminal");
    }
  );

  it.each([
    "https://evil.example/terminal",
    "http://evil.example/terminal",
    "terminal",
    "  terminal  ",
    "//evil.example/terminal",
    "   //evil.example/terminal",
  ])("rejects external or non-absolute redirect target %s", (nextPath) => {
    expect(safeTerminalNext(nextPath)).toBe("/terminal");
  });

  it.each([
    ["/terminal/", "/terminal"],
    ["/terminal/?mode=native", "/terminal?mode=native"],
    ["  /terminal/?mode=native  ", "/terminal?mode=native"],
  ])("normalizes historical terminal slash path %s", (nextPath, expected) => {
    expect(safeTerminalNext(nextPath)).toBe(expected);
  });

  it.each(["/terminal", "/app", "/app?tab=terminal", "/settings/profile"])(
    "allows internal absolute path %s",
    (nextPath) => {
      expect(safeTerminalNext(nextPath)).toBe(nextPath);
    }
  );
});
