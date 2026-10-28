import type { PluginClientContext } from "@getpaseo/plugin/client";
import { clickPill, installTrigger } from "./client/composer";
import { installPills, PILL_TITLE } from "./client/pills";
import { SearchBox } from "./client/search-box";
import { SettingsBridge } from "./client/settings-bridge";
import { TriggerSettingsScreen } from "./client/settings-screen";
import { shared } from "./client/shared-state";
import { clientLog } from "./shared/contracts";

export default function contribute(client: PluginClientContext) {
  shared.log = (message) => void client.rpc(clientLog, { message }).catch(() => {});
  const removers = [
    // A "파일 검색" pill above every chat box; its popover searches, inserts a reference, or opens the file.
    installPills(client, SearchBox),
    client.addSettingsScreen({ id: "trigger", title: "Options", icon: "Keyboard", Component: TriggerSettingsScreen }),
    client.addSidebarFooterItem({ id: "settings-bridge", title: "파일 검색 단축키 설정", Component: SettingsBridge }),
    // The shortcut presses the pill of the open chat. A brand-new session has no agent, so no pill yet.
    installTrigger(() => void clickPill(PILL_TITLE)),
  ];
  return () => {
    for (const remove of removers) void remove();
  };
}
