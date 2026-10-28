import type { ComponentType } from "react";
import type { PluginButtonContentProps, PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";

/** The pill's accessibility label; the shortcut finds the pill in the page by it. */
export const PILL_TITLE = "파일 검색 열기";

/**
 * Keeps one "파일 검색" pill above the chat box of every live top-level agent on this host.
 * Pills are registered per agent, so the agent list is re-read (debounced) on every agent update.
 * ponytail: a full re-list per update; filter the update stream if it ever shows up in profiles.
 */
export function installPills(client: PluginClientContext, Content: ComponentType<PluginButtonContentProps>): () => void {
  const pills = new Map<string, PluginButtonRegistration>();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const sync = async () => {
    const { entries } = await client.paseo.agents.list({ page: { limit: 100 }, filter: { includeArchived: false } });
    if (stopped) return;
    const live = new Map<string, string>();
    for (const { agent } of entries) {
      if (agent.workspaceId && !agent.internal && !agent.archivedAt) live.set(agent.id, agent.workspaceId);
    }
    for (const [agentId, pill] of pills) {
      if (!live.has(agentId)) {
        pill.remove();
        pills.delete(agentId);
      }
    }
    for (const [agentId, workspaceId] of live) {
      if (pills.has(agentId)) continue;
      pills.set(
        agentId,
        client.addComposerPill({
          id: "search",
          workspaceId,
          agentId,
          button: { title: PILL_TITLE, label: "파일 검색", icon: "Search", behavior: { kind: "popover", Content } },
        }),
      );
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void sync().catch(() => {}), 300);
  };

  void sync().catch(() => {});
  const unsubscribe = client.paseo.agents.subscribe(schedule);
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
    for (const pill of pills.values()) pill.remove();
    pills.clear();
  };
}
