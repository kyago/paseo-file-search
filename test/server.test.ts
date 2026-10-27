import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { toAttachmentItems } from "../server/attachments.ts";
import { directoriesOf, listFiles, matchFiles } from "../server/files.ts";

const files = [
  "memory/facts/paseo-usage.md",
  "memory/daily/2026-10-17.md",
  "reports/cheongyak-report-2026-10-17.html",
  "google-timeline-visualizer/app/src/main/java/dev/mahlernim/timelinevisualizer/journal/route/SemanticGeometryCodec.kt",
  "manuals/lg-styler-SC5GMR80A/SC5GMR80A-사용설명서.pdf",
  "google-timeline-visualizer/docs/images/restore-timeline-en.svg",
];

test("every word must appear; no subsequence noise", () => {
  assert.deepEqual(matchFiles(files, "usage").hits, ["memory/facts/paseo-usage.md"]);
  assert.deepEqual(matchFiles(files, "paseo usage").hits, ["memory/facts/paseo-usage.md"]);
  assert.deepEqual(matchFiles(files, "memory 10-17").hits, ["memory/daily/2026-10-17.md"]);
  assert.deepEqual(matchFiles(files, "tv").hits, []);
  assert.deepEqual(matchFiles(files, "   ").hits, []);
});

test("file-name hits outrank directory hits; prefix outranks substring", () => {
  assert.deepEqual(matchFiles(files, "2026-10-17").hits, ["memory/daily/2026-10-17.md", "reports/cheongyak-report-2026-10-17.html"]);
  assert.deepEqual(matchFiles(files, "timeline").hits.at(-1), "google-timeline-visualizer/app/src/main/java/dev/mahlernim/timelinevisualizer/journal/route/SemanticGeometryCodec.kt");
});

test("Korean matches across NFC/NFD and case", () => {
  const decomposed = "manuals/lg-styler-SC5GMR80A/SC5GMR80A-사용설명서.pdf".normalize("NFD");
  assert.equal(matchFiles([decomposed], "사용설명서").total, 1);
  assert.equal(matchFiles([decomposed], "sc5gmr80a 설명서").total, 1);
  assert.equal(matchFiles(files, "paseo usage", 1).total, 1);
});

test("listFiles honours .gitignore and skips hidden entries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fs-"));
  await mkdir(path.join(root, "src", ".hidden"), { recursive: true });
  await mkdir(path.join(root, "out"), { recursive: true });
  await writeFile(path.join(root, ".gitignore"), "out/\n");
  await writeFile(path.join(root, "src", "a.ts"), "");
  await writeFile(path.join(root, "src", ".hidden", "b.ts"), "");
  await writeFile(path.join(root, "out", "c.js"), "");
  const listed = (await listFiles(root)).sort();
  assert.deepEqual(listed, ["src/a.ts"]);
});

test("attachment items carry a valid file URL and the quoted absolute path", () => {
  const [item, rootFile] = toAttachmentItems("secretary", "/Users/me/my repo", ["memory/facts/paseo-usage.md", "README.md"]);
  assert.equal(item.identifier, "paseo-usage.md");
  assert.equal(item.title, "memory/facts");
  assert.equal(item.subtitle, "secretary · memory/facts/paseo-usage.md");
  assert.equal(new URL(item.url).pathname, "/Users/me/my%20repo/memory/facts/paseo-usage.md");
  assert.equal(item.text, '참조 파일: "/Users/me/my repo/memory/facts/paseo-usage.md"');
  assert.equal(rootFile.title, "");
});

test("folders come from file paths and attach as folder references", () => {
  const dirs = directoriesOf(["memory/facts/paseo-usage.md", "memory/daily/2026-10-17.md", "README.md"]);
  assert.deepEqual(dirs.sort(), ["memory", "memory/daily", "memory/facts"]);
  assert.deepEqual(matchFiles(dirs, "memory").hits, ["memory", "memory/daily", "memory/facts"]);
  const [item] = toAttachmentItems("secretary", "/Users/me/repo", ["memory/facts"], "directory");
  assert.equal(item.identifier, "facts/");
  assert.equal(item.title, "memory");
  assert.equal(item.resourceType, "directory");
  assert.equal(item.text, '참조 폴더: "/Users/me/repo/memory/facts"');
});
