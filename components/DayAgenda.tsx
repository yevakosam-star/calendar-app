import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, parseISO } from 'date-fns';
import { useTheme, categoryColors, categoryLabels } from '../lib/theme';
import { useData } from '../lib/store';
import { CalendarEvent, DailyNoteItem, LOCAL_CALENDAR_ID, TaskCategory } from '../lib/types';
import { DayTimeline } from './DayTimeline';

const CATEGORY_ORDER: TaskCategory[] = ['work', 'personal', 'content'];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function DayAgenda({ date }: { date: string }) {
  const theme = useTheme();
  const {
    calendars,
    events,
    dailyNotes,
    workingHours,
    addDailyNoteItem,
    toggleDailyNoteItem,
    deleteDailyNoteItem,
    updateDailyNoteItem,
    setDailyNoteCategory,
    addLocalEvent,
    updateLocalEvent,
    deleteLocalEvent,
  } = useData();
  const [draft, setDraft] = useState('');
  const [draftCategory, setDraftCategory] = useState<TaskCategory>('personal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(date);
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:00');

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => e.date === date)
        .filter((e) => calendars.find((c) => c.id === e.calendarId)?.visible ?? false),
    [events, date, calendars]
  );

  const dayNotes = useMemo(
    () => dailyNotes.filter((n) => n.date === date).sort((a, b) => a.createdAt - b.createdAt),
    [dailyNotes, date]
  );

  const notesByCategory = useMemo(() => {
    const map: Record<TaskCategory, DailyNoteItem[]> = { work: [], personal: [], content: [] };
    for (const n of dayNotes) map[n.category].push(n);
    return map;
  }, [dayNotes]);

  const submitDraft = () => {
    if (!draft.trim()) return;
    addDailyNoteItem(date, draft, draftCategory);
    setDraft('');
  };

  const commitEdit = (item: DailyNoteItem) => {
    updateDailyNoteItem(item.id, editingText);
    setEditingId(null);
  };

  const cycleCategory = (item: DailyNoteItem) => {
    const idx = CATEGORY_ORDER.indexOf(item.category);
    setDailyNoteCategory(item.id, CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length]);
  };

  const canSubmitEvent = eventTitle.trim().length > 0 && (eventAllDay || (TIME_PATTERN.test(eventStart) && TIME_PATTERN.test(eventEnd)));

  const resetEventForm = () => {
    setEventTitle('');
    setEventDate(date);
    setEventAllDay(false);
    setEventStart('09:00');
    setEventEnd('10:00');
    setEditingEventId(null);
    setShowEventForm(false);
  };

  const openAddEvent = () => {
    setEventDate(date);
    setShowEventForm(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    if (event.calendarId !== LOCAL_CALENDAR_ID) return;
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDate(event.date);
    setEventAllDay(event.allDay);
    setEventStart(event.startTime ?? '09:00');
    setEventEnd(event.endTime ?? '10:00');
    setShowEventForm(true);
  };

  const submitEvent = () => {
    if (!canSubmitEvent) return;
    if (editingEventId) {
      updateLocalEvent(editingEventId, {
        title: eventTitle,
        date: eventDate,
        allDay: eventAllDay,
        startTime: eventAllDay ? undefined : eventStart,
        endTime: eventAllDay ? undefined : eventEnd,
      });
    } else {
      addLocalEvent({
        date: eventDate,
        title: eventTitle,
        allDay: eventAllDay,
        startTime: eventStart,
        endTime: eventEnd,
      });
    }
    resetEventForm();
  };

  const deleteEditingEvent = () => {
    if (!editingEventId) return;
    deleteLocalEvent(editingEventId);
    resetEventForm();
  };

  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Schedule</Text>
        <Pressable
          onPress={() => (showEventForm ? resetEventForm() : openAddEvent())}
          hitSlop={8}
          style={styles.addEventButton}
        >
          <Ionicons name={showEventForm ? 'close' : 'add'} size={16} color={theme.accent} />
          <Text style={[styles.addEventButtonText, { color: theme.accent }]}>
            {showEventForm ? 'Cancel' : 'Add event'}
          </Text>
        </Pressable>
      </View>

      {showEventForm && (
        <View style={[styles.eventForm, { borderColor: theme.border }]}>
          <TextInput
            value={eventTitle}
            onChangeText={setEventTitle}
            placeholder="Event title"
            placeholderTextColor={theme.textTertiary}
            style={[styles.eventTitleInput, { color: theme.text, borderColor: theme.border }]}
            autoFocus
          />
          {editingEventId && (
            <View style={styles.dateStepperRow}>
              <Pressable
                onPress={() => setEventDate(format(addDays(parseISO(eventDate), -1), 'yyyy-MM-dd'))}
                style={[styles.dateStepperButton, { borderColor: theme.border }]}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={14} color={theme.text} />
              </Pressable>
              <Text style={[styles.dateStepperLabel, { color: theme.text }]}>
                {format(parseISO(eventDate), 'EEE, MMM d, yyyy')}
              </Text>
              <Pressable
                onPress={() => setEventDate(format(addDays(parseISO(eventDate), 1), 'yyyy-MM-dd'))}
                style={[styles.dateStepperButton, { borderColor: theme.border }]}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={14} color={theme.text} />
              </Pressable>
            </View>
          )}
          <View style={styles.eventAllDayRow}>
            <Text style={[styles.eventAllDayLabel, { color: theme.text }]}>All day</Text>
            <Switch
              value={eventAllDay}
              onValueChange={setEventAllDay}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#fff"
            />
          </View>
          {!eventAllDay && (
            <View style={styles.eventTimesRow}>
              <TextInput
                value={eventStart}
                onChangeText={setEventStart}
                placeholder="09:00"
                placeholderTextColor={theme.textTertiary}
                style={[styles.eventTimeInput, { color: theme.text, borderColor: theme.border }]}
              />
              <Text style={{ color: theme.textTertiary }}>–</Text>
              <TextInput
                value={eventEnd}
                onChangeText={setEventEnd}
                placeholder="10:00"
                placeholderTextColor={theme.textTertiary}
                style={[styles.eventTimeInput, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
          )}
          <View style={styles.eventFormActionsRow}>
            {editingEventId && (
              <Pressable onPress={deleteEditingEvent} style={[styles.eventDeleteButton, { borderColor: theme.border }]}>
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
              </Pressable>
            )}
            <Pressable
              onPress={submitEvent}
              disabled={!canSubmitEvent}
              style={[
                styles.eventSubmit,
                { flex: 1, backgroundColor: canSubmitEvent ? theme.accent : theme.border },
              ]}
            >
              <Text style={[styles.eventSubmitText, { color: canSubmitEvent ? '#fff' : theme.textTertiary }]}>
                {editingEventId ? 'Save changes' : 'Add to calendar'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        <DayTimeline
          events={dayEvents}
          calendars={calendars}
          workingHours={workingHours}
          editableCalendarId={LOCAL_CALENDAR_ID}
          onPressEvent={openEditEvent}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>Notes for the day</Text>
      <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>
        Jot down tasks with no fixed time. Tap the dot to change category.
      </Text>

      <View style={{ marginTop: 12, gap: 16 }}>
        {CATEGORY_ORDER.filter((cat) => notesByCategory[cat].length > 0).map((cat) => (
          <View key={cat}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColors[cat] }]} />
              <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>{categoryLabels[cat]}</Text>
            </View>
            <View style={{ gap: 2 }}>
              {notesByCategory[cat].map((item) => (
                <View key={item.id} style={styles.noteRow}>
                  <Pressable onPress={() => cycleCategory(item)} hitSlop={8}>
                    <View style={[styles.smallDot, { backgroundColor: categoryColors[item.category] }]} />
                  </Pressable>
                  <Pressable onPress={() => toggleDailyNoteItem(item.id)} hitSlop={8}>
                    <Ionicons
                      name={item.done ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={item.done ? theme.accent : theme.textTertiary}
                    />
                  </Pressable>
                  {editingId === item.id ? (
                    <TextInput
                      value={editingText}
                      onChangeText={setEditingText}
                      onSubmitEditing={() => commitEdit(item)}
                      onBlur={() => commitEdit(item)}
                      autoFocus
                      style={[styles.noteInput, { color: theme.text, borderColor: theme.border }]}
                    />
                  ) : (
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => {
                        setEditingId(item.id);
                        setEditingText(item.text);
                      }}
                    >
                      <Text
                        style={[
                          styles.noteText,
                          { color: item.done ? theme.textTertiary : theme.text },
                          item.done && styles.noteTextDone,
                        ]}
                      >
                        {item.text}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => deleteDailyNoteItem(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
        {dayNotes.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.textTertiary, marginTop: 0 }]}>No tasks yet</Text>
        )}
      </View>

      <View style={styles.categoryPicker}>
        {CATEGORY_ORDER.map((cat) => {
          const selected = draftCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setDraftCategory(cat)}
              style={[
                styles.categoryChip,
                {
                  borderColor: selected ? categoryColors[cat] : theme.border,
                  backgroundColor: selected ? `${categoryColors[cat]}1A` : 'transparent',
                },
              ]}
            >
              <View style={[styles.smallDot, { backgroundColor: categoryColors[cat] }]} />
              <Text style={[styles.categoryChipText, { color: theme.text }]}>{categoryLabels[cat]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.addRow, { borderColor: theme.border }]}>
        <Ionicons name="add" size={18} color={theme.textTertiary} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submitDraft}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Enter') submitDraft();
          }}
          placeholder="Add a task…"
          placeholderTextColor={theme.textTertiary}
          style={[styles.addInput, { color: theme.text }]}
          returnKeyType="done"
        />
        {draft.trim().length > 0 && (
          <Pressable onPress={submitDraft} hitSlop={8}>
            <Ionicons name="arrow-up-circle" size={22} color={theme.accent} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addEventButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addEventButtonText: { fontSize: 12.5, fontWeight: '600' },
  eventForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10, gap: 10 },
  eventTitleInput: { fontSize: 15, borderBottomWidth: 1, paddingVertical: 4 },
  eventAllDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventAllDayLabel: { fontSize: 14 },
  eventTimesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventTimeInput: { flex: 1, fontSize: 14, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, textAlign: 'center' },
  eventSubmit: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  eventSubmitText: { fontSize: 14, fontWeight: '600' },
  eventFormActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateStepperButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStepperLabel: { fontSize: 13, fontWeight: '600' },
  sectionHint: { fontSize: 13, marginTop: 2 },
  emptyText: { fontSize: 14, marginTop: 8, marginBottom: 4 },
  divider: { height: 1, marginTop: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  smallDot: { width: 8, height: 8, borderRadius: 4 },
  noteText: { fontSize: 15 },
  noteTextDone: { textDecorationLine: 'line-through' },
  noteInput: { flex: 1, fontSize: 15, borderBottomWidth: 1, paddingVertical: 2 },
  categoryPicker: { flexDirection: 'row', gap: 8, marginTop: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 12, fontWeight: '500' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  addInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
});
