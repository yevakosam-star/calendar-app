import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useData } from '../../lib/store';
import { PageContainer } from '../../lib/PageContainer';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { notes, updateNote, deleteNote } = useData();
  const note = useMemo(() => notes.find((n) => n.id === id), [notes, id]);

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');

  useEffect(() => {
    if (!id) return;
    const handle = setTimeout(() => {
      updateNote(id, { title, body });
    }, 300);
    return () => clearTimeout(handle);
  }, [title, body, id, updateNote]);

  const confirmDelete = () => {
    const doDelete = () => {
      deleteNote(id!);
      router.back();
    };
    if (Platform.OS === 'web') {
      doDelete();
    } else {
      Alert.alert('Delete note', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary, padding: 20 }}>Note not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <PageContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.iconButton, { backgroundColor: theme.surface }]}>
          <Ionicons name="chevron-down" size={20} color={theme.text} />
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={10} style={[styles.iconButton, { backgroundColor: theme.surface }]}>
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={theme.textTertiary}
          style={[styles.titleInput, { color: theme.text }]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start writing…"
          placeholderTextColor={theme.textTertiary}
          style={[styles.bodyInput, { color: theme.text }]}
          multiline
          textAlignVertical="top"
        />
      </View>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  titleInput: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  bodyInput: { flex: 1, fontSize: 16, lineHeight: 24 },
});
