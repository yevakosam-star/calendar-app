import { Pressable, StyleSheet, Text, View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../lib/theme';
import { useData } from '../../lib/store';
import { Note } from '../../lib/types';
import { PageContainer } from '../../lib/PageContainer';

export default function NotesScreen() {
  const theme = useTheme();
  const { notes, addNote } = useData();

  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  const createNote = () => {
    const id = addNote();
    router.push(`/note/${id}`);
  };

  const renderItem = ({ item }: { item: Note }) => (
    <Pressable
      onPress={() => router.push(`/note/${item.id}`)}
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
    >
      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
        {item.title.trim() || 'Untitled'}
      </Text>
      {!!item.body.trim() && (
        <Text style={[styles.cardBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
      )}
      <Text style={[styles.cardMeta, { color: theme.textTertiary }]}>
        {formatDistanceToNow(item.updatedAt, { addSuffix: true })}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <PageContainer>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Separate from your daily notes
          </Text>
        </View>
        <Pressable onPress={createNote} style={[styles.addButton, { backgroundColor: theme.accent }]} hitSlop={8}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={28} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No notes yet</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardBody: { fontSize: 13, lineHeight: 18 },
  cardMeta: { fontSize: 11, marginTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 80 },
  emptyText: { fontSize: 14 },
});
