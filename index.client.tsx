import type { PluginClientContext } from "@getpaseo/plugin/client";
import { SearchPanel } from "./client/search-panel";

export default function contribute(client: PluginClientContext) {
  const removers = [
    // A tab in the Explorer sidebar (or the main pane) with the search box.
    client.addWorkspacePanel({ id: "search", title: "파일 검색", icon: "Search", locations: ["explorer", "workspace"], Component: SearchPanel }),
    // Cmd+K entry: type "파일" or "file" to reach it.
    client.addCommandCenterItem({
      id: "open-search",
      title: "파일 검색 (이름·경로)",
      icon: "Search",
      keywords: ["file", "search", "find", "파일", "찾기", "검색"],
      context: "workspace",
      onSelect({ openPanel }) {
        openPanel("search", { location: "explorer" });
      },
    }),
  ];
  return () => {
    for (const remove of removers) void remove();
  };
}
