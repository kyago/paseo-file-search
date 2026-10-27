import { Platform } from "react-native";

// This plugin typechecks without the DOM library. Declare only what this module uses.
declare const window: {
  location: { pathname: string };
  history: { pushState(data: unknown, unused: string, url: string): void };
  dispatchEvent(event: unknown): boolean;
};
declare const PopStateEvent: new (type: string) => unknown;
declare function btoa(text: string): string;
declare const TextEncoder: new () => { encode(text: string): Uint8Array };

/** Paseo's URL-safe base64 for the file part of a workspace `?open=file:` intent. */
const base64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

/**
 * Opens a workspace file in Paseo's own file tab. The plugin SDK has no file navigation, but the
 * workspace route accepts `?open=file:<path>`, and the router follows history changes on web and
 * desktop. Returns false where there is no browser history to drive (the phone apps).
 */
export function openWorkspaceFile(input: { serverId: string; workspaceId: string; path: string }): boolean {
  if (Platform.OS !== "web") return false;
  const current = /^\/h\/[^/]+\/workspace\/[^/]+/.exec(window.location.pathname)?.[0];
  const base = current ?? `/h/${encodeURIComponent(input.serverId)}/workspace/${encodeURIComponent(input.workspaceId)}`;
  window.history.pushState(null, "", `${base}?open=${encodeURIComponent(`file:${base64Url(input.path)}`)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  return true;
}
