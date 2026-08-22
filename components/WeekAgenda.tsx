import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, categoryColors } from '../lib/theme';
import { useData } from '../lib/store';
import { GridDay } from '../lib/dateGrid';

export function WeekAgenda({
  weekDays,
  onSelectDay,
}: {
  weekDays: GridDay[];
  onSelectDay: (dateKey: string) => void;
}) {
  const theme = useTheme();
  const { events, calendars, dailyNotes, toggleDailyNoteItem } = useData();

  const colorFor = (calendarId: string) => calendars.find((c) => c.id === calendarId)?.color ?? theme.textTertiary;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const day of weekDays) {
      map.set(
        day.key,
        events
          .filter((e) => e.date === day.key)
          .filter((e) => calendars.find((c) => c.id === e.calendarId)?.visible ?? false)
          .sort((a, b) => {
            if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
            return (a.startTime ?? '').localeCompare(b.startTime ?? '');
          })
      );
    }
    return map;
  }, [weekDays, events, calendars]);

  const notesByDay = useMemo(() => {
    const map = new Map<string, typeof dailyNotes>();
    for (const day of weekDays) {
      map.set(
        day.key,
        dailyNotes.filter((n) => n.date === day.key).sort((a, b) => a.createdAt - b.createdAt)
      );
    }
    return map;
  }, [weekDays, dailyNotes]);

  return (
    <View style={styles.weekRow}>
      {weekDays.map((day, i) => {
        const dayEvents = eventsByDay.get(day.key) ?? [];
        const dayNotes = notesByDay.get(day.key) ?? [];
        const isEmpty = dayEvents.length === 0 && dayNotes.length === 0;

        return (
          <View key={day.key} style={[styles.dayColumn, i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Pressable style={styles.dateBadge} onPress={() => onSelectDay(day.key)}>
              <Text style={[styles.weekdayAbbrev, { color: day.isToday ? theme.accent : theme.textTertiary }]}>
                {format(day.date, 'EEE').toUpperCase()}
              </Text>
              <View style={[styles.dayNumberWrap, day.isToday && { backgroundColor: theme.accent }]}>
                <Text style={[styles.dayNumber, { color: day.isToday ? '#fff' : theme.text }]}>
                  {format(day.date, 'd')}
                </Text>
              </View>
            </Pressable>

            <View style={styles.items}>
              {isEmpty ? (
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>–</Text>
              ) : (
                <>
                  {dayEvents.map((e) => (
                    <View key={e.id} style={styles.item}>
                      <View style={[styles.dot, { backgroundColor: colorFor(e.calendarId) }]} />
                      <Text style={[styles.itemText, { color: theme.text }]}>
                        {e.allDay ? e.title : `${e.startTime} ${e.title}`}
                      </Text>
                    </View>
                  ))}
                  {dayNotes.map((n) => (
                    <Pressable key={n.id} style={styles.item} onPress={() => toggleDailyNoteItem(n.id)}>
                      <Ionicons
                        name={n.done ? 'checkbox' : 'square-outline'}
                        size={11}
                        color={n.done ? theme.accent : theme.textTertiary}
                      />
                      <Text
                        style={[
                          styles.itemText,
                          { color: n.done ? theme.textTertiary : theme.text },
                          n.done && styles.itemTextDone,
                        ]}
                      >
                        {n.text}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'stretch' },
  dayColumn: { flex: 1, paddingHorizontal: 4 },
  dateBadge: { alignItems: 'center', gap: 4, marginBottom: 8 },
  weekdayAbbrev: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  dayNumberWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 13, fontWeight: '600' },
  items: { gap: 6 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 4 },
  itemText: { fontSize: 10.5, flex: 1, lineHeight: 13 },
  itemTextDone: { textDecorationLine: 'line-through' },
  emptyText: { fontSize: 12, textAlign: 'center' },
});
