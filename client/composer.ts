import { Platform } from "react-native";
import { isCharacterTrigger, matchesShortcut, parseShortcut, spliceReference, startsWord, workspaceIdFromPath, type Shortcut } from "./composer-text";
import { shared } from "./shared-state";

// This plugin typechecks without the DOM library. Declare only what this module uses.
interface TextArea {
  tagName: string;
  value: string;
  selectionStart: number;
  selectionEnd: number;
  focus(): void;
  setSelectionRange(start: number, end: number): void;
  dispatchEvent(event: unknown): boolean;
  closest(selector: string): unknown;
}
interface KeyEvent {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
  repeat: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}
declare const document: { activeElement: TextArea | null; querySelector(selector: string): (TextArea & { click(): void }) | null };
declare const navigator: { platform: string; userAgent: string };
declare const window: {
  location: { pathname: string };
  addEventListener(type: string, listener: (event: KeyEvent) => void, capture: boolean): void;
  removeEventListener(type: string, listener: (event: KeyEvent) => void, capture: boolean): void;
};
declare const Event: new (type: string, init: { bubbles: boolean }) => unknown;
declare const Object: { getOwnPropertyDescriptor(target: unknown, key: string): { set?: (value: string) => void } | undefined; getPrototypeOf(target: unknown): unknown };

const COMPOSER = '[data-testid="message-input-root"] textarea';

const isComposer = (element: TextArea | null): element is TextArea =>
  Boolean(element && element.tagName === "TEXTAREA" && element.closest('[data-testid="message-input-root"]'));

const isMac = () => Platform.OS === "web" && /Mac/i.test(`${navigator.platform} ${navigator.userAgent}`);

let parsed: { text: string; shortcut: Shortcut | null } | null = null;
function currentShortcut(): Shortcut | null {
  const text = shared.settings?.shortcut ?? "";
  if (parsed?.text !== text) parsed = { text, shortcut: parseShortcut(text, isMac()) };
  return parsed.shortcut;
}

/**
 * Watches for the configured shortcut anywhere in a workspace, or for a single trigger character
 * typed at a word start in the chat box, and hands the workspace to `open`. Runs after Paseo's own
 * key handling, which only claims bound shortcuts. Returns the remover; a no-op off the web.
 */
export function installTrigger(open: (workspaceId: string) => void): () => void {
  if (Platform.OS !== "web") return () => {};
  const onKeyDown = (event: KeyEvent) => {
    const shortcut = currentShortcut();
    if (!shared.settings?.enabled || !shortcut || event.isComposing || event.defaultPrevented || event.repeat) return;
    const active = document.activeElement;
    const typed = isCharacterTrigger(shortcut);
    if (typed) {
      if (event.key !== shortcut.key || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!isComposer(active) || !startsWord(active.value, active.selectionStart)) return;
    } else if (!matchesShortcut(event, shortcut)) return;
    const workspaceId = workspaceIdFromPath(window.location.pathname);
    if (!workspaceId) return;
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - (shared.lastTriggerAt ?? 0) < 200) return;
    shared.lastTriggerAt = now;
    const composer = isComposer(active) ? active : document.querySelector(COMPOSER);
    shared.pending = composer ? { workspaceId, composer, start: composer.selectionStart, end: composer.selectionEnd } : undefined;
    open(workspaceId);
    for (const listener of shared.focusListeners) listener();
  };
  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}

/** Presses the pill with this accessibility label, if the page shows one. */
export function clickPill(title: string): boolean {
  if (Platform.OS !== "web") return false;
  const pill = document.querySelector(`[aria-label="${title}"]`);
  if (!pill) return false;
  pill.click();
  return true;
}

/**
 * Puts a quoted path into the chat box where the shortcut was pressed (or at the caret) and returns
 * focus there. React owns the box, so the value goes through the prototype setter and an input
 * event, the way React reads user typing.
 */
export function insertReference(path: string, pending?: { composer: unknown; start: number; end: number }): boolean {
  if (Platform.OS !== "web") return false;
  const composer = (pending?.composer as TextArea | undefined) ?? document.querySelector(COMPOSER);
  if (!composer) return false;
  const start = pending?.start ?? composer.selectionStart;
  const end = pending?.end ?? composer.selectionEnd;
  const { text, caret } = spliceReference(composer.value, Math.min(start, composer.value.length), Math.min(end, composer.value.length), path);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(composer), "value")?.set;
  if (!setter) return false;
  setter.call(composer, text);
  composer.dispatchEvent(new Event("input", { bubbles: true }));
  composer.focus();
  composer.setSelectionRange(caret, caret);
  return true;
}

/** For the settings screen: whether the text is a usable shortcut on this machine. */
export const isValidShortcut = (text: string) => parseShortcut(text, isMac()) !== null;
