import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const INDEX_TTL_MS = 10_000;
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "venv", "__pycache__", "dist", "build", "target"]);

/** The daemon subprocess does not inherit a login shell's PATH, so look in the usual places first. */
const RG_CANDIDATES = [process.env.FILE_SEARCH_RG, "/opt/homebrew/bin/rg", "/usr/local/bin/rg", "rg"].filter((c): c is string => Boolean(c));

async function withRipgrep(root: string): Promise<string[] | null> {
  for (const bin of RG_CANDIDATES) {
    try {
      const { stdout } = await run(bin, ["--files", "--no-require-git", "--color", "never", "-0"], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
      return stdout.split("\0").filter(Boolean);
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function withGit(root: string): Promise<string[] | null> {
  try {
    const { stdout } = await run("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
    return stdout.split("\0").filter(Boolean);
  } catch {
    return null;
  }
}

async function withWalk(root: string): Promise<string[]> {
  const files: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) await walk(full);
      } else if (entry.isFile()) files.push(path.relative(root, full));
    }
  };
  await walk(root);
  return files;
}

const index = new Map<string, { at: number; files: string[]; dirs: string[] }>();

/** Every ancestor directory of the given relative file paths, each once. */
export function directoriesOf(files: string[]): string[] {
  const dirs = new Set<string>();
  for (const file of files) {
    for (let slash = file.indexOf("/"); slash >= 0; slash = file.indexOf("/", slash + 1)) dirs.add(file.slice(0, slash));
  }
  return [...dirs];
}

/**
 * Relative paths of every file under `root`, honouring .gitignore: ripgrep's walker when it is
 * installed, else git's index, else a plain directory walk. Directories are derived from the
 * files, so an empty or fully ignored folder is absent. Cached briefly, since the list is
 * requested on every keystroke.
 */
export async function listEntries(root: string): Promise<{ files: string[]; dirs: string[] }> {
  const cached = index.get(root);
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return cached;
  const files = (await withRipgrep(root)) ?? (await withGit(root)) ?? (await withWalk(root));
  const entry = { at: Date.now(), files, dirs: directoriesOf(files) };
  index.set(root, entry);
  return entry;
}

export const listFiles = async (root: string): Promise<string[]> => (await listEntries(root)).files;

/** Lower-case NFC, so Korean typed in the app matches names macOS stores decomposed. */
const fold = (text: string) => text.normalize("NFC").toLowerCase();

/**
 * Paths containing every query word. Words that hit the file name rank above words that only
 * hit a directory, prefixes above substrings, then shallower and shorter paths first.
 */
export function matchFiles(files: string[], query: string, limit = 100): { hits: string[]; total: number } {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return { hits: [], total: 0 };
  const scored: { path: string; score: number; depth: number }[] = [];
  for (const file of files) {
    const lower = fold(file);
    const name = lower.slice(lower.lastIndexOf("/") + 1);
    let score = 0;
    for (const word of words) {
      if (name.startsWith(word)) continue;
      if (name.includes(word)) score += 1;
      else if (lower.includes(word)) score += 3;
      else {
        score = -1;
        break;
      }
    }
    if (score >= 0) scored.push({ path: file, score, depth: lower.split("/").length });
  }
  scored.sort((a, b) => a.score - b.score || a.depth - b.depth || a.path.length - b.path.length || a.path.localeCompare(b.path));
  return { hits: scored.slice(0, limit).map((entry) => entry.path), total: scored.length };
}
