import { ScrollView, StyleSheet, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { PageContainer } from '../../lib/PageContainer';
import { DayAgenda } from '../../components/DayAgenda';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useTheme();
  const parsedDate = date ? parseISO(date) : new Date();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <PageContainer>
        <View style={styles.header}>
          <View>
            <Text style={[styles.weekday, { color: theme.textSecondary }]}>{format(parsedDate, 'EEEE')}</Text>
            <Text style={[styles.dateTitle, { color: theme.text }]}>{format(parsedDate, 'MMMM d, yyyy')}</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.closeButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <DayAgenda date={date!} />
          </View>
        </ScrollView>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  weekday: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  dateTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
