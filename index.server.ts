import type { PluginServerContext } from "@getpaseo/plugin/server";
import { toAttachmentItems } from "./server/attachments.ts";
import { listFiles, matchFiles } from "./server/files.ts";
import { attachmentSearch, searchFiles } from "./shared/contracts";

const PICKER_LIMIT = 30;

export default function contribute(server: PluginServerContext) {
  server.handle(searchFiles, async ({ cwd, query, limit }) => {
    const files = await listFiles(cwd);
    const { hits, total } = matchFiles(files, query, limit);
    return { files: hits.map((path) => ({ path })), total, indexed: files.length };
  });

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
      [...roots].map(async ([root, name]) => toAttachmentItems(name, root, matchFiles(await listFiles(root), query, PICKER_LIMIT).hits)),
    );
    return { items: items.flat().slice(0, PICKER_LIMIT) };
  });

  return () => {};
}
