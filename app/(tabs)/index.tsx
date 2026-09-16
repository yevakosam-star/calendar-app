import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { addDays, addMonths, addWeeks, addYears, format, isSameDay, isSameMonth } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, categoryColors } from '../../lib/theme';
import { useData } from '../../lib/store';
import { getMonthGrid, getWeekDays, WEEKDAY_LABELS } from '../../lib/dateGrid';
import { PageContainer } from '../../lib/PageContainer';
import { DayAgenda } from '../../components/DayAgenda';
import { WeekAgenda } from '../../components/WeekAgenda';
import { YearGrid } from '../../components/YearGrid';

type ViewMode = 'day' | 'week' | 'month' | 'year';
const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function CalendarScreen() {
  const theme = useTheme();
  const { calendars, events, dailyNotes } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.visible).map((c) => c.id)),
    [calendars]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { color: string }[]>();
    for (const ev of events) {
      if (!visibleCalendarIds.has(ev.calendarId)) continue;
      const cal = calendars.find((c) => c.id === ev.calendarId);
      if (!cal) continue;
      const list = map.get(ev.date) ?? [];
      list.push({ color: cal.color });
      map.set(ev.date, list);
    }
    return map;
  }, [events, visibleCalendarIds, calendars]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, typeof dailyNotes>();
    for (const n of dailyNotes) {
      const list = map.get(n.date) ?? [];
      list.push(n);
      map.set(n.date, list);
    }
    return map;
  }, [dailyNotes]);

  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const todayEventCount = (eventsByDate.get(todayKey) ?? []).length;
  const todayTaskCount = dailyNotes.filter((n) => n.date === todayKey && !n.done).length;
  const todaySummary =
    todayEventCount === 0 && todayTaskCount === 0
      ? 'Nothing on the books'
      : [
          todayEventCount > 0 ? `${todayEventCount} event${todayEventCount === 1 ? '' : 's'}` : null,
          todayTaskCount > 0 ? `${todayTaskCount} task${todayTaskCount === 1 ? '' : 's'}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  const grid = useMemo(() => getMonthGrid(anchorDate), [anchorDate]);
  const weekRows = useMemo(() => {
    const rows: (typeof grid)[] = [];
    for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }, [grid]);
  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') return format(anchorDate, 'EEEE, MMMM d');
    if (viewMode === 'week') {
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      return isSameMonth(start, end)
        ? `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
        : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    if (viewMode === 'year') return format(anchorDate, 'yyyy');
    return format(anchorDate, 'MMMM yyyy');
  }, [viewMode, anchorDate, weekDays]);

  const stepBack = () => {
    setAnchorDate((d) => {
      if (viewMode === 'day') return addDays(d, -1);
      if (viewMode === 'week') return addWeeks(d, -1);
      if (viewMode === 'year') return addYears(d, -1);
      return addMonths(d, -1);
    });
  };

  const stepForward = () => {
    setAnchorDate((d) => {
      if (viewMode === 'day') return addDays(d, 1);
      if (viewMode === 'week') return addWeeks(d, 1);
      if (viewMode === 'year') return addYears(d, 1);
      return addMonths(d, 1);
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <PageContainer style={{ maxWidth: '100%' }}>
        <View style={styles.header}>
          <Text style={[styles.monthLabel, { color: theme.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={stepBack} style={[styles.iconButton, { borderColor: theme.border }]} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => setAnchorDate(new Date())}
              style={[styles.todayButton, { borderColor: theme.border }]}
              hitSlop={8}
            >
              <Text style={[styles.todayText, { color: theme.text }]}>Today</Text>
            </Pressable>
            <Pressable onPress={stepForward} style={[styles.iconButton, { borderColor: theme.border }]} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.modeRow}>
          {VIEW_MODES.map((m) => {
            const selected = viewMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setViewMode(m.key)}
                style={[
                  styles.modeChip,
                  { borderColor: selected ? theme.accent : theme.border },
                  selected && { backgroundColor: theme.accent },
                ]}
              >
                <Text style={[styles.modeChipText, { color: selected ? '#fff' : theme.text }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {(viewMode === 'month' || viewMode === 'year') && (
          <Pressable
            onPress={() => router.push(`/day/${todayKey}`)}
            style={[styles.todayCard, { backgroundColor: theme.accentSoft }]}
          >
            <View>
              <Text style={[styles.todayCardLabel, { color: theme.accent }]}>Today · {format(today, 'EEE, MMM d')}</Text>
              <Text style={[styles.todayCardSummary, { color: theme.text }]}>{todaySummary}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.accent} />
          </Pressable>
        )}

        {viewMode === 'month' && (
          <View style={{ flex: 1 }}>
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, i) => (
                <View key={i} style={styles.weekdayCell}>
                  <Text style={[styles.weekdayText, { color: theme.textTertiary }]}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.gridContainer, { borderColor: theme.border }]}>
              {weekRows.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((day) => {
                    const dots = (eventsByDate.get(day.key) ?? []).slice(0, 4);
                    const dayNotes = notesByDate.get(day.key) ?? [];
                    const notePreviews = dayNotes.slice(0, 3);
                    const extraCount = dayNotes.length - notePreviews.length;
                    const isCurrentDay = isSameDay(day.date, today);
                    return (
                      <Pressable
                        key={day.key}
                        onPress={() => router.push(`/day/${day.key}`)}
                        style={[styles.dayCell, { borderColor: theme.border }]}
                      >
                        <View style={styles.dayCellTop}>
                          <View style={[styles.dayNumberWrap, isCurrentDay && { backgroundColor: theme.accent }]}>
                            <Text
                              style={[
                                styles.dayNumber,
                                { color: day.inMonth ? theme.text : theme.textTertiary },
                                isCurrentDay && { color: '#fff' },
                              ]}
                            >
                              {format(day.date, 'd')}
                            </Text>
                          </View>
                          <View style={styles.dotsRow}>
                            {dots.map((d, i) => (
                              <View key={i} style={[styles.dot, { backgroundColor: d.color }]} />
                            ))}
                          </View>
                        </View>
                        <View style={styles.notePreviewList}>
                          {notePreviews.map((n) => (
                            <View key={n.id} style={styles.notePreviewRow}>
                              <View style={[styles.notePreviewDot, { backgroundColor: categoryColors[n.category] }]} />
                              <Text
                                style={[
                                  styles.notePreviewText,
                                  { color: n.done ? theme.textTertiary : theme.text },
                                  n.done && { textDecorationLine: 'line-through' },
                                ]}
                                numberOfLines={1}
                              >
                                {n.text}
                              </Text>
                            </View>
                          ))}
                          {extraCount > 0 && (
                            <Text style={[styles.notePreviewMore, { color: theme.textTertiary }]}>
                              +{extraCount} more
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {viewMode === 'day' && (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <DayAgenda date={format(anchorDate, 'yyyy-MM-dd')} />
          </ScrollView>
        )}

        {viewMode === 'week' && (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <WeekAgenda weekDays={weekDays} onSelectDay={(key) => router.push(`/day/${key}`)} />
          </ScrollView>
        )}

        {viewMode === 'year' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <YearGrid
              year={anchorDate.getFullYear()}
              eventDateKeys={new Set(eventsByDate.keys())}
              onSelectMonth={(monthDate) => {
                setAnchorDate(monthDate);
                setViewMode('month');
              }}
              onSelectDay={(key) => router.push(`/day/${key}`)}
            />
          </ScrollView>
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
    paddingBottom: 12,
  },
  monthLabel: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, flex: 1, marginRight: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { fontSize: 14, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  modeChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipText: { fontSize: 14, fontWeight: '600' },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  todayCardLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  todayCardSummary: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  weekdayRow: { flexDirection: 'row', paddingHorizontal: 12 },
  weekdayCell: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  weekdayText: { fontSize: 13, fontWeight: '700' },
  gridContainer: {
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  weekRow: { flex: 1, flexDirection: 'row' },
  dayCell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 2,
    overflow: 'hidden',
  },
  dayCellTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { fontSize: 15, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3, maxWidth: 32 },
  dot: { width: 5.5, height: 5.5, borderRadius: 2.75 },
  notePreviewList: { marginTop: 5, gap: 3 },
  notePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notePreviewDot: { width: 5, height: 5, borderRadius: 2.5 },
  notePreviewText: { fontSize: 12, flexShrink: 1 },
  notePreviewMore: { fontSize: 11, marginTop: 1 },
});
