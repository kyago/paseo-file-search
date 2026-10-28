import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginButtonContentProps } from "@getpaseo/plugin/client";
import { useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { copyText, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, type TextInput as NativeTextInput, View } from "react-native";
import { searchFiles } from "../shared/contracts";
import { insertReference } from "./composer";
import { openWorkspaceFile } from "./open-file";
import { shared } from "./shared-state";

type Entry = { path: string; kind: "file" | "directory" };
const SHOWN = 20;

/** The popover behind the pill and the header icon: a pick goes into the chat box; "열기" opens the file tab. */
export function SearchBox({ theme, layout, host, workspaceId, close }: PluginButtonContentProps) {
  const styles = useMemo(() => buildStyles(theme, layout.compact), [theme, layout.compact]);
  const cwd = useWorkspace(workspaceId, (workspace) => workspace.directory);
  const search = useRpc(searchFiles);
  const toast = useToast();
  const input = useRef<NativeTextInput>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  // Arrow keys move this over the results while the search box keeps focus; Enter picks it.
  const [active, setActive] = useState(0);
  // Paseo's popover moves focus to its own surface right after opening, so autoFocus alone loses;
  // keep taking focus back for a moment after mount.
  useEffect(() => {
    const timers = [0, 60, 150, 300, 600].map((ms) => setTimeout(() => input.current?.focus(), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const onTrigger = () => {
      if (shared.pending?.workspaceId !== workspaceId) return;
      setText("");
      input.current?.focus();
    };
    shared.focusListeners.add(onTrigger);
    return () => void shared.focusListeners.delete(onTrigger);
  }, [workspaceId]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 150);
    return () => clearTimeout(timer);
  }, [text]);
  const results = useQuery({
    queryKey: ["file-search", cwd, query],
    enabled: Boolean(cwd && query),
    placeholderData: (previous) => previous,
    queryFn: () => search({ cwd: cwd!, query, limit: 100 }),
  });
  const shown: Entry[] = query ? (results.data?.files ?? []).slice(0, SHOWN) : [];
  useEffect(() => setActive(0), [results.data]);

  const insert = (path: string) => {
    const pending = shared.pending?.workspaceId === workspaceId ? shared.pending : undefined;
    if (!insertReference(path, pending)) {
      void copyText(`"${path}"`).then(
        () => toast.show("이 기기에서는 입력창에 넣을 수 없어 경로를 복사했습니다."),
        () => toast.error("채팅 입력창을 찾지 못했습니다."),
      );
    }
    shared.pending = undefined;
    close();
  };
  const open = (path: string) => {
    close();
    if (openWorkspaceFile({ serverId: host.id, workspaceId, path })) return;
    void copyText(path).then(
      () => toast.show("이 기기에서는 파일 탭을 열 수 없어 경로를 복사했습니다."),
      () => toast.error("경로를 복사하지 못했습니다."),
    );
  };

  return (
    <View style={styles.box}>
      <TextInput
        ref={input}
        style={styles.input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => shown[active] && insert(shown[active].path)}
        onKeyPress={(event) => {
          const key = event.nativeEvent.key;
          if (key !== "ArrowDown" && key !== "ArrowUp") return;
          event.preventDefault();
          if (shown.length) setActive((index) => Math.min(shown.length - 1, Math.max(0, index + (key === "ArrowDown" ? 1 : -1))));
        }}
        placeholder="파일·폴더 이름 검색"
        placeholderTextColor={theme.colors.foregroundMuted}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {results.error ? <Text style={styles.muted}>{String(results.error)}</Text> : null}
      {query && results.data ? (
        <Text style={styles.muted}>
          {results.data.total}건{results.data.total > shown.length ? ` 중 ${shown.length}건 표시` : ""}
        </Text>
      ) : null}
      {shown.map((entry, index) => (
        <FileRow key={entry.path} entry={entry} active={index === active} onPress={() => insert(entry.path)} onOpen={() => open(entry.path)} styles={styles} />
      ))}
    </View>
  );
}

function FileRow({ entry, active, onPress, onOpen, styles }: { entry: Entry; active: boolean; onPress: () => void; onOpen: () => void; styles: Styles }) {
  const slash = entry.path.lastIndexOf("/");
  const name = entry.kind === "directory" ? `${entry.path.slice(slash + 1)}/` : entry.path.slice(slash + 1);
  const directory = slash >= 0 ? entry.path.slice(0, slash) : "";
  return (
    <View style={styles.rowWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${entry.path} 채팅에 참조 넣기`} onPress={onPress} style={({ pressed }) => [styles.row, active || pressed ? styles.rowActive : null]}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {directory ? (
          <Text style={styles.muted} numberOfLines={1}>
            {directory}
          </Text>
        ) : null}
      </Pressable>
      {entry.kind === "file" ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${entry.path} 파일 탭에서 열기`} onPress={onOpen} style={({ pressed }) => [styles.chip, pressed ? styles.rowActive : null]}>
          <Text style={styles.muted}>열기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof buildStyles>;

function buildStyles(theme: PluginTheme, compact: boolean) {
  return {
    // The popover surface brings its own background and padding; widen it so names fit.
    box: { width: compact ? undefined : 380, gap: 6 },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: theme.colors.foreground,
      fontSize: 14,
    },
    rowWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    row: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },
    rowActive: { backgroundColor: theme.colors.surface2 },
    chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border },
    name: { color: theme.colors.foreground, fontSize: 14 },
    muted: { color: theme.colors.foregroundMuted, fontSize: 12 },
  } as const;
}
