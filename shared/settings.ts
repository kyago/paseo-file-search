import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const triggerSettings = defineSettings({
  id: "trigger",
  scope: "host",
  version: 1,
  schema: z.object({
    // Typing this at a word start in the chat box opens the search panel (desktop and web only).
    trigger: z.string().min(1).max(2).default("#"),
    enabled: z.boolean().default(true),
  }),
});

export type TriggerValues = z.infer<typeof triggerSettings.schema>;
