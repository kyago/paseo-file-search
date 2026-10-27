import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** File names under a workspace root that contain every word of the query. */
export const searchFiles = defineRpc({
  name: "files.search",
  input: z.object({ cwd: z.string(), query: z.string(), limit: z.number().int().min(1).max(500).default(100) }),
  output: z.object({
    files: z.array(z.object({ path: z.string() })),
    /** Matches before the limit was applied. */
    total: z.number(),
    /** Files in the index for this root. */
    indexed: z.number(),
  }),
});

/**
 * The same search for the composer's attachment picker, which only sends a query, so the daemon
 * searches every open workspace. Item shape is what Paseo's picker expects.
 */
export const attachmentSearch = defineRpc({
  name: "files.attachments",
  input: z.object({ query: z.string() }),
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string(),
        subtitle: z.string().optional(),
        url: z.string(),
        text: z.string(),
        resourceType: z.string(),
      }),
    ),
  }),
});
