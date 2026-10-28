import type { TriggerValues } from "../shared/settings";

/** A reference the panel should put into the chat box instead of opening a file. */
export interface PendingInsert {
  workspaceId: string;
  /** The chat box element and the caret position when the trigger was typed. */
  composer: unknown;
  start: number;
  end: number;
}

interface Shared {
  settings?: TriggerValues;
  pending?: PendingInsert;
  /** Panels listening for a trigger, so an already open panel can take focus. */
  focusListeners: Set<() => void>;
}

// Paseo mounts one sidebar item per plugin across hosts and one key listener per host; they meet here.
const key = "__paseoFileSearch";
const root = globalThis as { [key]?: Shared };
export const shared: Shared = (root[key] ??= { focusListeners: new Set() });
