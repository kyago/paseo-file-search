import type { PluginTheme } from "@getpaseo/plugin";
import { type PluginWorkspacePanelProps, useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { copyText, FlatList, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, type TextInput as NativeTextInput, View } from "react-native";
import { searchFiles } from "../shared/contracts";
import { insertReference } from "./composer";
import { openWorkspaceFile } from "./open-file";
import { shared } from "./shared-state";

export function SearchPanel({ theme, layout, workspaceId, host }: PluginWorkspacePanelProps) {
  const styles = useMemo(() => buildStyles(theme, layout.compact), [theme, layout.compact]);
  const cwd = useWorkspace(workspaceId, (workspace) => workspace.directory);
  const search = useRpc(searchFiles);
  const toast = useToast();
  const input = useRef<NativeTextInput>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  // Typed trigger in the chat box: Enter puts the pick into the chat instead of opening it.
  const [inserting, setInserting] = useState(() => shared.pending?.workspaceId === workspaceId);
  useEffect(() => {
    const onTrigger = () => {
      if (shared.pending?.workspaceId !== workspaceId) return;
      setInserting(true);
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
  const files = query ? (results.data?.files ?? []) : [];

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
      toast.error("채팅 입력창을 찾지 못했습니다.");
      return;
    }
    shared.pending = undefined;
    setInserting(false);
  };
  const submit = () => files[0] && (inserting ? insert(files[0].path) : open(files[0].path));

  return (
    <View style={styles.screen}>
      <TextInput
        ref={input}
        style={styles.input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder="파일 이름·경로 (띄어쓰기 = 모두 포함)"
        placeholderTextColor={theme.colors.foregroundMuted}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <Text style={styles.muted}>
        {results.error
          ? String(results.error)
          : !query
            ? inserting
              ? "Enter는 첫 번째 결과를 채팅에 참조로 넣습니다."
              : "검색어를 입력하세요. Enter는 첫 번째 결과를 엽니다."
            : results.data
              ? `${results.data.total}건 (색인 ${results.data.indexed}개${results.data.total > files.length ? `, ${files.length}건 표시` : ""})`
              : "찾는 중…"}
      </Text>
      <FlatList
        data={files}
        keyExtractor={(file) => file.path}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <FileRow path={item.path} onPress={() => (inserting ? insert(item.path) : open(item.path))} onInsert={() => insert(item.path)} styles={styles} />
        )}
      />
    </View>
  );
}

function FileRow({ path, onPress, onInsert, styles }: { path: string; onPress: () => void; onInsert: () => void; styles: Styles }) {
  const slash = path.lastIndexOf("/");
  const name = path.slice(slash + 1);
  const directory = slash >= 0 ? path.slice(0, slash) : "";
  return (
    <View style={styles.rowWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${path} 열기`} onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {directory ? (
          <Text style={styles.muted} numberOfLines={1}>
            {directory}
          </Text>
        ) : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${path} 채팅에 참조 넣기`} onPress={onInsert} style={({ pressed }) => [styles.chip, pressed ? styles.rowPressed : null]}>
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
    rowWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    row: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },
    rowPressed: { backgroundColor: theme.colors.surface2 },
    chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border },
    name: { color: theme.colors.foreground, fontSize: 14 },
    muted: { color: theme.colors.foregroundMuted, fontSize: 12 },
  } as const;
}
