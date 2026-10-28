import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** Files and folders under a workspace root whose path contains every word of the query; matching folders lead. */
export const searchFiles = defineRpc({
  name: "files.search",
  input: z.object({ cwd: z.string(), query: z.string(), limit: z.number().int().min(1).max(500).default(100) }),
  output: z.object({
    files: z.array(z.object({ path: z.string(), kind: z.enum(["file", "directory"]) })),
    /** Matches before the limit was applied. */
    total: z.number(),
    /** Files in the index for this root. */
    indexed: z.number(),
  }),
});

/** Client-side diagnostics land in `paseo plugin logs file-search`; the app has no console we can read. */
export const clientLog = defineRpc({ name: "files.log", input: z.object({ message: z.string() }), output: z.object({}) });
