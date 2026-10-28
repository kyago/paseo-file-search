import type { PluginButtonContentProps } from "@getpaseo/plugin/client";
import { SearchBox } from "./search-box";

/** The pill above the chat box opens this; a pick goes straight into the chat and closes it. */
export function SearchPopover(props: PluginButtonContentProps) {
  if (props.context !== "agent") return null;
  return <SearchBox theme={props.theme} layout={props.layout} host={props.host} workspaceId={props.workspaceId} mode="insert" plainList onInserted={props.close} />;
}
