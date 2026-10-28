import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listEntries, matchFiles } from "./server/files.ts";
import { clientLog, searchFiles } from "./shared/contracts";
import { triggerSettings } from "./shared/settings";

const FOLDERS = 8;

export default function contribute(server: PluginServerContext) {
  // The client reads these through settings RPCs the daemon only exposes once the server registers them.
  server.registerSettings(triggerSettings);
  server.handle(clientLog, ({ message }) => {
    console.log(`[client] ${message}`);
    return {};
  });
  // Matching folders lead, so a reference to a whole folder is one pick; files follow.
  server.handle(searchFiles, async ({ cwd, query, limit }) => {
    const { files, dirs } = await listEntries(cwd);
    const folders = matchFiles(dirs, query, FOLDERS).hits.map((path) => ({ path, kind: "directory" as const }));
    const { hits, total } = matchFiles(files, query, limit);
    return { files: [...folders, ...hits.map((path) => ({ path, kind: "file" as const }))], total: total + folders.length, indexed: files.length };
  });
  return () => {};
}
