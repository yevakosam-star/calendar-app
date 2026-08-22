import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { hexToRgba } from '../lib/color';
import { formatHourLabel, layoutTimedBlocks, parseTimeToMinutes } from '../lib/timeline';
import { CalendarEvent, CalendarSource, WorkingHours } from '../lib/types';

const HOUR_HEIGHT = 64;

export function DayTimeline({
  events,
  calendars,
  workingHours,
}: {
  events: CalendarEvent[];
  calendars: CalendarSource[];
  workingHours: WorkingHours;
}) {
  const theme = useTheme();

  const timed = useMemo(() => events.filter((e) => !e.allDay && e.startTime && e.endTime), [events]);
  const allDay = useMemo(() => events.filter((e) => e.allDay), [events]);

  const colorFor = (calendarId: string) => calendars.find((c) => c.id === calendarId)?.color ?? theme.textTertiary;
  const nameFor = (calendarId: string) => calendars.find((c) => c.id === calendarId)?.name ?? '';

  const { rangeStartHour, rangeEndHour } = useMemo(() => {
    const minutes = timed.flatMap((e) => [parseTimeToMinutes(e.startTime!), parseTimeToMinutes(e.endTime!)]);
    const minCandidate = Math.min(workingHours.start * 60, ...(minutes.length ? minutes : [8 * 60]));
    const maxCandidate = Math.max(workingHours.end * 60, ...(minutes.length ? minutes : [18 * 60]));
    return {
      rangeStartHour: Math.max(0, Math.floor(minCandidate / 60) - 1),
      rangeEndHour: Math.min(24, Math.ceil(maxCandidate / 60) + 1),
    };
  }, [timed, workingHours]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = rangeStartHour; h <= rangeEndHour; h++) list.push(h);
    return list;
  }, [rangeStartHour, rangeEndHour]);

  const totalHeight = (rangeEndHour - rangeStartHour) * HOUR_HEIGHT;

  const layout = useMemo(
    () =>
      layoutTimedBlocks(
        timed.map((e) => ({
          id: e.id,
          startMinutes: parseTimeToMinutes(e.startTime!),
          endMinutes: parseTimeToMinutes(e.endTime!),
        }))
      ),
    [timed]
  );

  const workingTop = (workingHours.start - rangeStartHour) * HOUR_HEIGHT;
  const workingHeight = (workingHours.end - workingHours.start) * HOUR_HEIGHT;

  return (
    <View>
      {allDay.length > 0 && (
        <View style={styles.allDayRow}>
          {allDay.map((e) => (
            <View key={e.id} style={[styles.allDayChip, { backgroundColor: hexToRgba(colorFor(e.calendarId), 0.14) }]}>
              <View style={[styles.allDayDot, { backgroundColor: colorFor(e.calendarId) }]} />
              <Text style={[styles.allDayText, { color: theme.text }]} numberOfLines={1}>
                {e.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.timelineRow}>
        <View style={{ width: 44 }}>
          {hours.map((h) => (
            <View key={h} style={{ height: HOUR_HEIGHT, marginTop: h === rangeStartHour ? 0 : 0 }}>
              <Text style={[styles.hourLabel, { color: theme.textTertiary }]}>{formatHourLabel(h)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.grid, { height: totalHeight }]}>
          {workingHeight > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.workingBand,
                {
                  top: workingTop,
                  height: workingHeight,
                  backgroundColor: theme.accentSoft,
                },
              ]}
            />
          )}

          {hours.map((h, i) =>
            i === 0 ? null : (
              <View
                key={h}
                pointerEvents="none"
                style={[styles.gridLine, { top: (h - rangeStartHour) * HOUR_HEIGHT, backgroundColor: theme.border }]}
              />
            )
          )}

          {timed.map((e) => {
            const startMinutes = parseTimeToMinutes(e.startTime!);
            const endMinutes = parseTimeToMinutes(e.endTime!);
            const top = ((startMinutes - rangeStartHour * 60) / 60) * HOUR_HEIGHT;
            const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 26);
            const pos = layout.find((l) => l.id === e.id);
            const columnCount = pos?.columnCount ?? 1;
            const column = pos?.column ?? 0;
            const widthPct = 100 / columnCount;
            const color = colorFor(e.calendarId);

            return (
              <View
                key={e.id}
                style={[
                  styles.eventBlock,
                  {
                    top,
                    height,
                    left: `${column * widthPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: hexToRgba(color, 0.16),
                    borderLeftColor: color,
                  },
                ]}
              >
                <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                  {e.title}
                </Text>
                {height > 34 && (
                  <Text style={[styles.eventMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                    {e.startTime}–{e.endTime} · {nameFor(e.calendarId)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  allDayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  allDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: 220,
  },
  allDayDot: { width: 6, height: 6, borderRadius: 3 },
  allDayText: { fontSize: 12, fontWeight: '500' },
  timelineRow: { flexDirection: 'row' },
  hourLabel: { fontSize: 11, marginTop: -6 },
  grid: { flex: 1, position: 'relative' },
  workingBand: { position: 'absolute', left: 0, right: 0, borderRadius: 8 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  eventBlock: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  eventTitle: { fontSize: 12.5, fontWeight: '600' },
  eventMeta: { fontSize: 10.5, marginTop: 1 },
});
