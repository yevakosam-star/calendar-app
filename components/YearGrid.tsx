import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../lib/theme';
import { getMonthGrid, WEEKDAY_LABELS } from '../lib/dateGrid';

export function YearGrid({
  year,
  eventDateKeys,
  onSelectMonth,
  onSelectDay,
}: {
  year: number;
  eventDateKeys: Set<string>;
  onSelectMonth: (monthDate: Date) => void;
  onSelectDay: (dateKey: string) => void;
}) {
  const theme = useTheme();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <View style={styles.grid}>
      {months.map((monthDate) => {
        const days = getMonthGrid(monthDate);
        return (
          <View key={monthDate.getMonth()} style={styles.card}>
            <Pressable onPress={() => onSelectMonth(monthDate)} hitSlop={4}>
              <Text style={[styles.monthLabel, { color: theme.text }]}>{format(monthDate, 'MMMM')}</Text>
            </Pressable>
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, i) => (
                <Text key={i} style={[styles.weekdayLabel, { color: theme.textTertiary }]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.daysRow}>
              {days.map((day) => (
                <Pressable
                  key={day.key}
                  style={styles.dayCell}
                  onPress={() => day.inMonth && onSelectDay(day.key)}
                  disabled={!day.inMonth}
                >
                  <View style={[styles.dayNumberWrap, day.isToday && { backgroundColor: theme.accent }]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: day.inMonth ? theme.textSecondary : theme.textTertiary },
                        day.isToday && { color: '#fff', fontWeight: '700' },
                      ]}
                    >
                      {day.inMonth ? format(day.date, 'd') : ''}
                    </Text>
                  </View>
                  {day.inMonth && eventDateKeys.has(day.key) && (
                    <View style={[styles.eventDot, { backgroundColor: theme.accent }]} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 0 },
  card: { width: '50%', paddingHorizontal: 4, marginBottom: 24 },
  monthLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { width: `${100 / 7}%`, fontSize: 8, fontWeight: '600', textAlign: 'center' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayNumberWrap: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 9.5 },
  eventDot: { position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: 1.5 },
});
