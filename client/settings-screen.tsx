import { useSettings } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsInput, SettingsRow, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { useState } from "react";
import { triggerSettings } from "../shared/settings";
import { isValidShortcut } from "./composer";

export function TriggerSettingsScreen() {
  const settings = useSettings(triggerSettings);
  const [invalid, setInvalid] = useState<string | null>(null);
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="채팅창 단축키">
        <SettingsCard>
          <SettingsRow label="설정" hint={settings.status === "loading" ? "불러오는 중…" : settings.error} />
        </SettingsCard>
      </SettingsSection>
    );
  }
  const { values, revision } = settings;
  return (
    <SettingsSection title="채팅창 단축키">
      <SettingsCard>
        <SettingsSwitch
          label="단축키로 파일 검색 열기"
          hint="워크스페이스에서 단축키를 누르면 파일 검색 패널이 열리고, 고른 파일이 채팅 입력창에 참조로 들어갑니다. 데스크톱·웹에서만 동작합니다."
          error={settings.saveError ?? undefined}
          value={values.enabled}
          onValueChange={(enabled) => void settings.save({ ...values, enabled }, revision)}
        />
        <SettingsInput
          label="단축키"
          hint="예: Cmd+Shift+O, Ctrl+Alt+F, Mod+Shift+Space (Mod = Mac은 Cmd, 그 외 Ctrl). Paseo가 이미 쓰는 조합은 피하세요. 한 글자만 적으면 그 글자를 입력창 단어 첫머리에 칠 때 열립니다."
          error={invalid ?? undefined}
          initialValue={values.shortcut}
          placeholder="Cmd+Shift+O"
          onChangeText={(text) => {
            const shortcut = text.trim();
            if (!shortcut || shortcut === values.shortcut) return setInvalid(null);
            if (!isValidShortcut(shortcut)) return setInvalid("형식을 알 수 없습니다. 예: Cmd+Shift+O");
            setInvalid(null);
            void settings.save({ ...values, shortcut }, revision);
          }}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
