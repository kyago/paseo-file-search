import { useSettings } from "@getpaseo/plugin/client";
import { SettingsCard, SettingsInput, SettingsRow, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { triggerSettings } from "../shared/settings";

export function TriggerSettingsScreen() {
  const settings = useSettings(triggerSettings);
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="채팅창 단축 기호">
        <SettingsCard>
          <SettingsRow label="설정" hint={settings.status === "loading" ? "불러오는 중…" : settings.error} />
        </SettingsCard>
      </SettingsSection>
    );
  }
  const { values, revision } = settings;
  return (
    <SettingsSection title="채팅창 단축 기호">
      <SettingsCard>
        <SettingsSwitch
          label="기호로 파일 검색 열기"
          hint="채팅 입력창에서 단어 첫머리에 기호를 치면 파일 검색 패널이 열리고, 고른 파일이 입력창에 참조로 들어갑니다. 데스크톱·웹에서만 동작합니다."
          error={settings.saveError ?? undefined}
          value={values.enabled}
          onValueChange={(enabled) => void settings.save({ ...values, enabled }, revision)}
        />
        <SettingsInput
          label="기호"
          hint="한 글자. @와 /는 Paseo가 이미 쓰므로 피하세요."
          initialValue={values.trigger}
          placeholder="#"
          onChangeText={(text) => {
            const trigger = text.trim().slice(0, 1);
            if (trigger && trigger !== values.trigger) void settings.save({ ...values, trigger }, revision);
          }}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
