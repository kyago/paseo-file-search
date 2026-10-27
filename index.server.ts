import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listFiles, matchFiles } from "./server/files.ts";
import { searchFiles } from "./shared/contracts";

export default function contribute(server: PluginServerContext) {
  server.handle(searchFiles, async ({ cwd, query, limit }) => {
    const files = await listFiles(cwd);
    const { hits, total } = matchFiles(files, query, limit);
    return { files: hits.map((path) => ({ path })), total, indexed: files.length };
  });
  return () => {};
}
