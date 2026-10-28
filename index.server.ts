import type { PluginServerContext } from "@getpaseo/plugin/server";
import { toAttachmentItems } from "./server/attachments.ts";
import { listEntries, matchFiles } from "./server/files.ts";
import { attachmentSearch, searchFiles } from "./shared/contracts";
import { triggerSettings } from "./shared/settings";

const PICKER_LIMIT = 30;
const PICKER_FOLDERS = 8;
const PANEL_FOLDERS = 8;

export default function contribute(server: PluginServerContext) {
  // The client reads these through settings RPCs the daemon only exposes once the server registers them.
  server.registerSettings(triggerSettings);
  server.handle(searchFiles, async ({ cwd, query, limit }) => {
    const { files, dirs } = await listEntries(cwd);
    const folders = matchFiles(dirs, query, PANEL_FOLDERS).hits.map((path) => ({ path, kind: "directory" as const }));
    const { hits, total } = matchFiles(files, query, limit);
    return { files: [...folders, ...hits.map((path) => ({ path, kind: "file" as const }))], total: total + folders.length, indexed: files.length };
  });

  // Folders that match lead, so a reference to a whole folder is one pick; files follow.
  server.handle(attachmentSearch, async ({ query }, { paseo }) => {
    if (!query.trim()) return { items: [] };
    const { entries } = await paseo.workspaces.list();
    const roots = new Map<string, string>();
    for (const workspace of entries) {
      if (workspace.archivingAt) continue;
      const root = workspace.workspaceDirectory ?? workspace.projectRootPath;
      if (!roots.has(root)) roots.set(root, workspace.title ?? workspace.name);
    }
    const items = await Promise.all(
      [...roots].map(async ([root, name]) => {
        const { files, dirs } = await listEntries(root);
        return [
          ...toAttachmentItems(name, root, matchFiles(dirs, query, PICKER_FOLDERS).hits, "directory"),
          ...toAttachmentItems(name, root, matchFiles(files, query, PICKER_LIMIT).hits),
        ];
      }),
    );
    return { items: items.flat().slice(0, PICKER_LIMIT) };
  });

  return () => {};
}
