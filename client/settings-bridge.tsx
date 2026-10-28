import { useSettings } from "@getpaseo/plugin/client";
import { useEffect } from "react";
import { triggerSettings } from "../shared/settings";
import { shared } from "./shared-state";

/** Renders nothing; it only hands the trigger settings (a hook) to the key listener, which runs outside React. */
export function SettingsBridge() {
  const settings = useSettings(triggerSettings);
  useEffect(() => {
    shared.log?.(`settings bridge: ${settings.status}${settings.status === "ready" ? " " + JSON.stringify(settings.values) : ""}`);
    if (settings.status === "ready") shared.settings = settings.values;
  }, [settings]);
  return null;
}
