import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const triggerSettings = defineSettings({
  id: "trigger",
  scope: "host",
  version: 1,
  schema: z.object({
    // A key combination such as "Cmd+Shift+O" that opens the search panel from the chat (desktop
    // and web only). A single character instead makes that character the trigger at a word start.
    shortcut: z.string().min(1).max(40).default("Cmd+Shift+O"),
    enabled: z.boolean().default(true),
  }),
});

export type TriggerValues = z.infer<typeof triggerSettings.schema>;
