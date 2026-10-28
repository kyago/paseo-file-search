import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installTrigger } from "./client/composer";
import { SearchPanel } from "./client/search-panel";
import { SettingsBridge } from "./client/settings-bridge";
import { TriggerSettingsScreen } from "./client/settings-screen";
import { attachmentSearch } from "./shared/contracts";

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
    // The composer's attach menu: the stand-in for `@`, which plugins cannot extend.
    client.addAttachmentSource({
      id: "files",
      title: "파일 검색",
      icon: "Search",
      pickerTitle: "파일 참조 붙이기",
      searchPlaceholder: "파일 이름·경로 (띄어쓰기 = 모두 포함)",
      search: attachmentSearch,
    }),
    client.addSettingsScreen({ id: "trigger", title: "Options", icon: "Keyboard", Component: TriggerSettingsScreen }),
    client.addSidebarFooterItem({ id: "settings-bridge", title: "파일 검색 기호 설정", Component: SettingsBridge }),
    // Every host installs a listener; only the host holding the workspace can open the panel, the rest throw and are ignored.
    installTrigger((workspaceId) => {
      try {
        client.openPanel("search", { workspaceId, location: "explorer" });
      } catch {}
    }),
  ];
  return () => {
    for (const remove of removers) void remove();
  };
}
