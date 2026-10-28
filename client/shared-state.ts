import type { TriggerValues } from "../shared/settings";

/** A reference the search should put into the chat box instead of opening a file. */
export interface PendingInsert {
  workspaceId: string;
  /** The chat box element and the caret position when the shortcut was pressed. */
  composer: unknown;
  start: number;
  end: number;
}

interface Shared {
  settings?: TriggerValues;
  pending?: PendingInsert;
  /** Search boxes listening for the shortcut, so an already open one can take focus. */
  focusListeners: Set<() => void>;
  /** Every host installs a key listener; this keeps one key press from firing twice. */
  lastTriggerAt?: number;
}

// Paseo mounts one sidebar item per plugin across hosts and one key listener per host; they meet here.
const key = "__paseoFileSearch";
const root = globalThis as { [key]?: Shared };
export const shared: Shared = (root[key] ??= { focusListeners: new Set() });
