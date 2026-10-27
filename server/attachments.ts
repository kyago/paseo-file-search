import path from "node:path";
import { pathToFileURL } from "node:url";
import type { RpcOutput } from "@getpaseo/plugin";
import type { attachmentSearch } from "../shared/contracts";

export type AttachmentItem = RpcOutput<typeof attachmentSearch>["items"][number];

/**
 * A picker row and chip per hit. The chip reads `identifier title`, so the file name leads and the
 * folder follows. The agent receives `text`: the absolute path, quoted the way Paseo's own `@`
 * mention quotes it, since the agent's cwd may be another workspace.
 */
export function toAttachmentItems(workspace: string, root: string, hits: string[]): AttachmentItem[] {
  return hits.map((file) => {
    const absolute = path.join(root, file);
    const slash = file.lastIndexOf("/");
    return {
      id: absolute,
      identifier: file.slice(slash + 1),
      title: slash >= 0 ? file.slice(0, slash) : "",
      subtitle: `${workspace} · ${file}`,
      url: pathToFileURL(absolute).href,
      text: `참조 파일: "${absolute}"`,
      resourceType: "file",
    };
  });
}
