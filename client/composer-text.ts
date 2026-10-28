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
