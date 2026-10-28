import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useEffect, useState } from "react";
import { SearchBox } from "./search-box";
import { shared } from "./shared-state";

/** The Explorer tab. After the shortcut it inserts into the chat; opened by hand it opens files. */
export function SearchPanel({ theme, layout, workspaceId, host }: PluginWorkspacePanelProps) {
  const [inserting, setInserting] = useState(() => shared.pending?.workspaceId === workspaceId);
  useEffect(() => {
    const onTrigger = () => shared.pending?.workspaceId === workspaceId && setInserting(true);
    shared.focusListeners.add(onTrigger);
    return () => void shared.focusListeners.delete(onTrigger);
  }, [workspaceId]);
  return <SearchBox theme={theme} layout={layout} host={host} workspaceId={workspaceId} mode={inserting ? "insert" : "open"} onInserted={() => setInserting(false)} />;
}
