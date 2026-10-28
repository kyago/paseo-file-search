import type { PluginTheme } from "@getpaseo/plugin";
import type { PluginHostProps } from "@getpaseo/plugin/client";
import { useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { copyText, FlatList, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, type TextInput as NativeTextInput, View } from "react-native";
import { searchFiles } from "../shared/contracts";
import { insertReference } from "./composer";
import { openWorkspaceFile } from "./open-file";
import { shared } from "./shared-state";

type Entry = { path: string; kind: "file" | "directory" };

interface SearchBoxProps extends Pick<PluginHostProps, "theme" | "layout" | "host"> {
  workspaceId: string;
  /** "insert" puts the pick into the chat box; "open" opens files and narrows into folders. */
  mode: "insert" | "open";
  /** Popovers must not nest a virtualised list inside their own scroll view. */
  plainList?: boolean;
  onInserted?: () => void;
}

export function SearchBox({ theme, layout, host, workspaceId, mode, plainList, onInserted }: SearchBoxProps) {
  const styles = useMemo(() => buildStyles(theme, layout.compact), [theme, layout.compact]);
  const cwd = useWorkspace(workspaceId, (workspace) => workspace.directory);
  const search = useRpc(searchFiles);
  const toast = useToast();
  const input = useRef<NativeTextInput>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  // Arrow keys move this over the results while the search box keeps focus; Enter picks it.
  const [active, setActive] = useState(0);
  useEffect(() => {
    const onTrigger = () => {
      if (shared.pending?.workspaceId !== workspaceId) return;
      setText("");
      input.current?.focus();
    };
    shared.focusListeners.add(onTrigger);
    return () => void shared.focusListeners.delete(onTrigger);
  }, [workspaceId]);
  // Paseo's popover moves focus to its own surface right after opening, so autoFocus alone loses;
  // keep taking focus back for a moment after mount.
  useEffect(() => {
    const timers = [0, 60, 150, 300, 600].map((ms) => setTimeout(() => input.current?.focus(), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
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
  const files: Entry[] = query ? (results.data?.files ?? []) : [];
  const shown = plainList ? files.slice(0, 20) : files;
  const list = useRef<{ scrollToIndex(params: { index: number; viewPosition?: number }): void }>(null);
  useEffect(() => setActive(0), [results.data]);
  const move = (step: number) => {
    if (shown.length === 0) return;
    const next = Math.min(shown.length - 1, Math.max(0, active + step));
    setActive(next);
    if (!plainList) {
      try {
        list.current?.scrollToIndex({ index: next, viewPosition: 0.5 });
      } catch {}
    }
  };

  const open = (path: string) => {
    if (openWorkspaceFile({ serverId: host.id, workspaceId, path })) return;
    void copyText(path).then(
      () => toast.show("이 기기에서는 파일 탭을 열 수 없어 경로를 복사했습니다."),
      () => toast.error("경로를 복사하지 못했습니다."),
    );
  };
  const insert = (path: string) => {
    const pending = shared.pending?.workspaceId === workspaceId ? shared.pending : undefined;
    if (!insertReference(path, pending)) {
      void copyText(`"${path}"`).then(
        () => toast.show("이 기기에서는 입력창에 넣을 수 없어 경로를 복사했습니다."),
        () => toast.error("채팅 입력창을 찾지 못했습니다."),
      );
    }
    shared.pending = undefined;
    onInserted?.();
  };
  // A folder narrows the search to itself (nothing in Paseo opens a folder); as a reference it is like a file.
  const narrow = (path: string) => {
    setText(`${path}/`);
    input.current?.focus();
  };
  const pick = (entry: Entry) => (mode === "insert" ? insert(entry.path) : entry.kind === "directory" ? narrow(entry.path) : open(entry.path));
  const row = (entry: Entry, index: number) => (
    <FileRow key={entry.path} entry={entry} active={index === active} onPress={() => pick(entry)} onInsert={() => insert(entry.path)} styles={styles} />
  );

  return (
    <View style={[styles.screen, plainList ? styles.popover : null]}>
      <TextInput
        ref={input}
        style={[styles.input, plainList ? styles.inputBare : null]}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => shown[active] && pick(shown[active])}
        onKeyPress={(event) => {
          const key = event.nativeEvent.key;
          if (key !== "ArrowDown" && key !== "ArrowUp") return;
          event.preventDefault();
          move(key === "ArrowDown" ? 1 : -1);
        }}
        placeholder={plainList ? "파일·폴더 이름 검색" : "파일 이름·경로 (띄어쓰기 = 모두 포함)"}
        placeholderTextColor={theme.colors.foregroundMuted}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {plainList && !query ? null : (
        <Text style={styles.muted}>
          {results.error
            ? String(results.error)
            : !query
              ? mode === "insert"
                ? "Enter는 첫 번째 결과를 채팅에 참조로 넣습니다. 폴더도 됩니다."
                : "검색어를 입력하세요. Enter는 첫 번째 결과를 열고, 폴더는 그 안으로 좁힙니다."
              : results.data
                ? `${results.data.total}건 (색인 ${results.data.indexed}개${results.data.total > shown.length ? `, ${shown.length}건 표시` : ""})`
                : "찾는 중…"}
        </Text>
      )}
      {plainList ? (
        <View>{shown.map(row)}</View>
      ) : (
        <FlatList
          ref={list}
          data={shown}
          keyExtractor={(entry) => entry.path}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={() => {}}
          renderItem={({ item, index }) => row(item, index)}
        />
      )}
    </View>
  );
}

function FileRow({ entry, active, onPress, onInsert, styles }: { entry: Entry; active: boolean; onPress: () => void; onInsert: () => void; styles: Styles }) {
  const slash = entry.path.lastIndexOf("/");
  const name = entry.kind === "directory" ? `${entry.path.slice(slash + 1)}/` : entry.path.slice(slash + 1);
  const directory = slash >= 0 ? entry.path.slice(0, slash) : "";
  return (
    <View style={styles.rowWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${entry.path} 선택`} onPress={onPress} style={({ pressed }) => [styles.row, active || pressed ? styles.rowPressed : null]}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {directory ? (
          <Text style={styles.muted} numberOfLines={1}>
            {directory}
          </Text>
        ) : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${entry.path} 채팅에 참조 넣기`} onPress={onInsert} style={({ pressed }) => [styles.chip, pressed ? styles.rowPressed : null]}>
        <Text style={styles.muted}>채팅</Text>
      </Pressable>
    </View>
  );
}

type Styles = ReturnType<typeof buildStyles>;

function buildStyles(theme: PluginTheme, compact: boolean) {
  const gap = compact ? 8 : 12;
  return {
    screen: { flex: 1, padding: gap, gap: gap / 2, backgroundColor: theme.colors.surface0 },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: theme.colors.foreground,
      backgroundColor: theme.colors.surface1,
      fontSize: 14,
    },
    // The popover surface already has its own background and padding; widen it so names fit.
    popover: { width: 380, padding: 0 },
    inputBare: { backgroundColor: "transparent" },
    rowWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    row: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },
    rowPressed: { backgroundColor: theme.colors.surface2 },
    chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border },
    name: { color: theme.colors.foreground, fontSize: 14 },
    muted: { color: theme.colors.foregroundMuted, fontSize: 12 },
  } as const;
}
