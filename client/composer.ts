import { Platform } from "react-native";
import { spliceReference, startsWord, workspaceIdFromPath } from "./composer-text";
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
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}
declare const document: { activeElement: TextArea | null; querySelector(selector: string): TextArea | null };
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

/**
 * Watches the chat box for the trigger character at a word start and hands the workspace to
 * `open`. Runs after Paseo's own key handling, which only claims bound shortcuts. Returns the
 * remover; a no-op off the web, where there is no DOM.
 */
export function installTrigger(open: (workspaceId: string) => void): () => void {
  if (Platform.OS !== "web") return () => {};
  const onKeyDown = (event: KeyEvent) => {
    const settings = shared.settings;
    if (!settings?.enabled || event.key !== settings.trigger) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing || event.defaultPrevented) return;
    const composer = document.activeElement;
    if (!isComposer(composer) || !startsWord(composer.value, composer.selectionStart)) return;
    const workspaceId = workspaceIdFromPath(window.location.pathname);
    if (!workspaceId) return;
    event.preventDefault();
    event.stopPropagation();
    shared.pending = { workspaceId, composer, start: composer.selectionStart, end: composer.selectionEnd };
    open(workspaceId);
    for (const listener of shared.focusListeners) listener();
  };
  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}

/**
 * Puts a quoted path into the chat box where the trigger was typed (or at the caret) and returns
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
