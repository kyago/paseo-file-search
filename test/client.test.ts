import assert from "node:assert/strict";
import { test } from "node:test";
import { isCharacterTrigger, matchesShortcut, parseShortcut, spliceReference, startsWord, workspaceIdFromPath } from "../client/composer-text.ts";

test("a reference lands quoted at the trigger position with spaces around it", () => {
  assert.deepEqual(spliceReference("", 0, 0, "memory/facts/a.md"), { text: '"memory/facts/a.md" ', caret: 20 });
  assert.deepEqual(spliceReference("정리해줘 ", 5, 5, "a b.md"), { text: '정리해줘 "a b.md" ', caret: 14 });
  assert.equal(spliceReference("앞뒤", 1, 1, "x").text, '앞 "x" 뒤');
  assert.equal(spliceReference("say \"hi\"", 4, 8, "q\"t").text, 'say "q\\"t" ');
});

test("the trigger only counts at a word start, like Paseo's @", () => {
  assert.equal(startsWord("", 0), true);
  assert.equal(startsWord("hello ", 6), true);
  assert.equal(startsWord("hello", 5), false);
  assert.equal(startsWord("c++", 3), false);
});

test("workspace id comes out of the route, plain or base64url", () => {
  assert.equal(workspaceIdFromPath("/h/local/workspace/ws_abc-123?open=x"), "ws_abc-123");
  assert.equal(workspaceIdFromPath("/h/local/workspace/b64_L1VzZXJzL21lL215IHJlcG8"), "/Users/me/my repo");
  assert.equal(workspaceIdFromPath("/sessions"), null);
});

test("shortcut text parses modifiers, Mod per platform, and rejects nonsense", () => {
  assert.deepEqual(parseShortcut("Cmd+Shift+O", true), { meta: true, ctrl: false, alt: false, shift: true, key: "o" });
  assert.deepEqual(parseShortcut("mod+space", true), { meta: true, ctrl: false, alt: false, shift: false, key: "space" });
  assert.deepEqual(parseShortcut("Mod+Alt+F", false), { meta: false, ctrl: true, alt: true, shift: false, key: "f" });
  assert.equal(parseShortcut("Cmd+", true), null);
  assert.equal(parseShortcut("Cmd+Cmd+O", true), null);
  assert.equal(parseShortcut("Shift", true), null);
  assert.equal(parseShortcut("Cmd+Shift+Foo", true), null);
  const typed = parseShortcut("#", true)!;
  assert.equal(isCharacterTrigger(typed), true);
  assert.equal(isCharacterTrigger(parseShortcut("Cmd+Shift+O", true)!), false);
});

test("shortcut matching uses the physical key for letters and digits", () => {
  const combo = parseShortcut("Cmd+Shift+O", true)!;
  const press = (over: Partial<Parameters<typeof matchesShortcut>[0]>) => ({ key: "O", code: "KeyO", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true, ...over });
  assert.equal(matchesShortcut(press({}), combo), true);
  assert.equal(matchesShortcut(press({ key: "ø", altKey: true }), combo), false);
  assert.equal(matchesShortcut(press({ shiftKey: false, key: "o" }), combo), false);
  assert.equal(matchesShortcut(press({ code: "KeyP", key: "P" }), combo), false);
  const space = parseShortcut("Ctrl+Space", false)!;
  assert.equal(matchesShortcut({ key: " ", code: "Space", metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, space), true);
});
