import type { ComponentType } from "react";
import type { PluginButtonContentProps, PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";

/** The pill's accessibility label; the shortcut finds it in the page by it. */
export const PILL_TITLE = "파일 검색 열기";

/**
 * Keeps one registration per live id: `list` names what should exist now, `add` registers one.
 * Re-listing is debounced behind the host's update stream, since the SDK registers buttons per
 * agent or workspace and never lists them for us.
 * ponytail: a full re-list per update; filter the update stream if it ever shows up in profiles.
 */
function keepInSync(
  list: () => Promise<Map<string, string>>,
  subscribe: (onChange: () => void) => () => void,
  add: (id: string, workspaceId: string) => PluginButtonRegistration,
): () => void {
  const registered = new Map<string, PluginButtonRegistration>();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sync = async () => {
    const live = await list();
    if (stopped) return;
    for (const [id, registration] of registered) {
      if (!live.has(id)) {
        registration.remove();
        registered.delete(id);
      }
    }
    for (const [id, workspaceId] of live) if (!registered.has(id)) registered.set(id, add(id, workspaceId));
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void sync().catch(() => {}), 300);
  };
  void sync().catch(() => {});
  const unsubscribe = subscribe(schedule);
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
    for (const registration of registered.values()) registration.remove();
    registered.clear();
  };
}

/** A "파일 검색" pill above the chat box of every live top-level agent on this host. */
export function installPills(client: PluginClientContext, Content: ComponentType<PluginButtonContentProps>): () => void {
  return keepInSync(
    async () => {
      const { entries } = await client.paseo.agents.list({ page: { limit: 100 }, filter: { includeArchived: false } });
      const live = new Map<string, string>();
      for (const { agent } of entries) if (agent.workspaceId && !agent.internal && !agent.archivedAt) live.set(agent.id, agent.workspaceId);
      return live;
    },
    (onChange) => client.paseo.agents.subscribe(onChange),
    (agentId, workspaceId) =>
      client.addComposerPill({
        id: "search",
        workspaceId,
        agentId,
        button: { title: PILL_TITLE, label: "파일 검색", icon: "Search", behavior: { kind: "popover", Content } },
      }),
  );
}
