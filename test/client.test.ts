import assert from "node:assert/strict";
import { test } from "node:test";
import { isCharacterTrigger, matchesShortcut, matchesWords, parseShortcut, quotePath, sessionReference, spliceReference, startsWord, workspaceIdFromPath } from "../client/composer-text.ts";

test("a reference lands quoted at the trigger position with spaces around it", () => {
  const splice = (text: string, start: number, end: number, path: string) => spliceReference(text, start, end, quotePath(path));
  assert.deepEqual(splice("", 0, 0, "memory/facts/a.md"), { text: '"memory/facts/a.md" ', caret: 20 });
  assert.deepEqual(splice("정리해줘 ", 5, 5, "a b.md"), { text: '정리해줘 "a b.md" ', caret: 14 });
  assert.equal(splice("앞뒤", 1, 1, "x").text, '앞 "x" 뒤');
  assert.equal(splice("say \"hi\"", 4, 8, "q\"t").text, 'say "q\\"t" ');
});

test("a session reference carries the title and the id an agent can message", () => {
  assert.equal(sessionReference('가계부 "봇"', "e336ab32"), `[Paseo 세션 "가계부 '봇'" agentId=e336ab32]`);
  assert.equal(spliceReference("이건 에게 물어봐", 3, 3, sessionReference("A", "x")).text, '이건 [Paseo 세션 "A" agentId=x] 에게 물어봐');
});

test("session titles match when every typed word appears, in any order", () => {
  assert.equal(matchesWords("부부 지출 자동수집 가계부 봇·웹앱", "가계부 부부"), true);
  assert.equal(matchesWords("Keycloak SMTP 설정", "smtp keycloak"), true);
  assert.equal(matchesWords("부부 지출".normalize("NFD"), "지출"), true);
  assert.equal(matchesWords("부부 지출", "가계부"), false);
  assert.equal(matchesWords("부부 지출", "  "), false);
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
