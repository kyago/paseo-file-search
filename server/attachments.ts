import path from "node:path";
import { pathToFileURL } from "node:url";
import type { RpcOutput } from "@getpaseo/plugin";
import type { attachmentSearch } from "../shared/contracts";

export type AttachmentItem = RpcOutput<typeof attachmentSearch>["items"][number];

/**
 * A picker row and chip per hit. The chip reads `identifier title`, so the name leads (with a
 * trailing slash for a folder) and the parent folder follows. The agent receives `text`: the
 * absolute path, quoted the way Paseo's own `@` mention quotes it, since the agent's cwd may be
 * another workspace.
 */
export function toAttachmentItems(workspace: string, root: string, hits: string[], kind: "file" | "directory" = "file"): AttachmentItem[] {
  const folder = kind === "directory";
  return hits.map((entry) => {
    const absolute = path.join(root, entry);
    const slash = entry.lastIndexOf("/");
    return {
      id: folder ? `${absolute}/` : absolute,
      identifier: entry.slice(slash + 1) + (folder ? "/" : ""),
      title: slash >= 0 ? entry.slice(0, slash) : "",
      subtitle: `${workspace} · ${entry}${folder ? "/" : ""}`,
      url: pathToFileURL(absolute).href,
      text: `${folder ? "참조 폴더" : "참조 파일"}: "${absolute}"`,
      resourceType: kind,
    };
  });
}
