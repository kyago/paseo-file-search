import assert from "node:assert/strict";
import { test } from "node:test";
import { spliceReference, startsWord, workspaceIdFromPath } from "../client/composer-text.ts";

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
