/** Pure text helpers for the chat box, kept free of the DOM so they run under node:test. */

/** Paseo's own `@` mention writes the path quoted; a space on each side keeps it a separate word. */
export function spliceReference(text: string, start: number, end: number, path: string): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const quoted = `"${path.replace(/"/g, '\\"')}"`;
  const lead = before && !/\s$/.test(before) ? " " : "";
  const trail = after && !/^\s/.test(after) ? " " : " ";
  const next = `${before}${lead}${quoted}${trail}`;
  return { text: `${next}${after}`, caret: next.length };
}

/** True when a trigger typed here starts a word, the same rule Paseo applies to `@`. */
export function startsWord(text: string, caret: number): boolean {
  return caret === 0 || !/[\w+]/.test(text[caret - 1]);
}

/** The workspace id from a `/h/<server>/workspace/<workspace>` path, undoing Paseo's segment encoding. */
export function workspaceIdFromPath(pathname: string): string | null {
  const match = /^\/h\/[^/]+\/workspace\/([^/?#]+)/.exec(pathname);
  if (!match) return null;
  const segment = decodeURIComponent(match[1]);
  if (!segment.startsWith("b64_")) return segment;
  const base64 = segment.slice(4).replace(/-/g, "+").replace(/_/g, "/");
  try {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

declare function atob(data: string): string;
declare const TextDecoder: new () => { decode(bytes: Uint8Array): string };

export interface Shortcut {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** Lower-case key name: a letter, digit, "space", "enter", "/" and so on. */
  key: string;
}

export interface KeyLike {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIERS: Record<string, keyof Omit<Shortcut, "key">> = {
  cmd: "meta",
  command: "meta",
  meta: "meta",
  win: "meta",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  opt: "alt",
  shift: "shift",
};

/**
 * "Cmd+Shift+O" style text to a shortcut; "Mod" is Cmd on a Mac and Ctrl elsewhere. A bare single
 * character has no modifiers and is matched as a typed character instead. Null when malformed.
 */
export function parseShortcut(text: string, isMac: boolean): Shortcut | null {
  const parts = text.trim().split("+").map((part) => part.trim());
  if (parts.length === 0 || parts.some((part) => !part)) return null;
  const shortcut: Shortcut = { meta: false, ctrl: false, alt: false, shift: false, key: "" };
  for (const part of parts.slice(0, -1)) {
    const name = part.toLowerCase();
    const modifier = name === "mod" ? (isMac ? "meta" : "ctrl") : MODIFIERS[name];
    if (!modifier || shortcut[modifier]) return null;
    shortcut[modifier] = true;
  }
  const key = parts[parts.length - 1].toLowerCase();
  if (key === "" || MODIFIERS[key] || key === "mod") return null;
  if (!isCharacterTrigger(shortcut) && key.length > 1 && !/^(space|enter|tab|escape|backspace|delete|arrow(up|down|left|right)|f[1-9]|f1[0-2]|home|end|pageup|pagedown)$/.test(key)) return null;
  shortcut.key = key;
  return shortcut;
}

/** A shortcut with no modifiers and a one-character key is typed, not pressed. */
export const isCharacterTrigger = (shortcut: Shortcut) => !shortcut.meta && !shortcut.ctrl && !shortcut.alt && !shortcut.shift && [...shortcut.key].length === 1;

/** Letters and digits match by physical key, so Shift or Option producing another glyph still counts. */
export function matchesShortcut(event: KeyLike, shortcut: Shortcut): boolean {
  if (event.metaKey !== shortcut.meta || event.ctrlKey !== shortcut.ctrl || event.altKey !== shortcut.alt || event.shiftKey !== shortcut.shift) return false;
  const key = shortcut.key;
  if (/^[a-z]$/.test(key)) return event.code === `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return event.code === `Digit${key}`;
  if (key === "space") return event.code === "Space";
  return event.key.toLowerCase() === key;
}
