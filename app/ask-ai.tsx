import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { useTheme, categoryColors, categoryLabels } from '../lib/theme';
import { useData } from '../lib/store';
import { PageContainer } from '../lib/PageContainer';
import { parseSchedule } from '../lib/aiApi';
import { AiItem } from '../lib/types';

type Stage = 'input' | 'loading' | 'review' | 'error';

export default function AskAiScreen() {
  const theme = useTheme();
  const { addLocalEvent, addDailyNoteItem } = useData();
  const isWeb = Platform.OS === 'web';

  const [stage, setStage] = useState<Stage>('input');
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<{ base64: string; mediaType: string; uri: string } | null>(null);
  const [items, setItems] = useState<AiItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const canSubmit = (message.trim().length > 0 || !!photo) && stage !== 'loading';

  const pickImage = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });

    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    setPhoto({ base64: asset.base64!, mediaType: asset.mimeType ?? 'image/jpeg', uri: asset.uri });
  };

  const submit = async () => {
    setStage('loading');
    setError(null);
    try {
      const results = await parseSchedule({
        message: message.trim() || undefined,
        imageBase64: photo?.base64,
        imageMediaType: photo?.mediaType,
      });
      if (results.length === 0) {
        setError("Couldn't find anything to add — try rephrasing, or a clearer photo.");
        setStage('error');
        return;
      }
      setItems(results);
      setSelected(new Set(results.map((_, i) => i)));
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStage('error');
    }
  };

  const toggleSelected = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const confirmAdd = () => {
    items.forEach((item, i) => {
      if (!selected.has(i)) return;
      if (item.kind === 'event') {
        addLocalEvent({
          date: item.date,
          title: item.title,
          allDay: !!item.allDay,
          startTime: item.startTime,
          endTime: item.endTime,
        });
      } else {
        addDailyNoteItem(item.date, item.title, item.category ?? 'personal');
      }
    });
    router.back();
  };

  const startOver = () => {
    setStage('input');
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <PageContainer>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Ask AI</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.closeButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isWeb && (
            <View style={[styles.noticeBox, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.noticeText, { color: theme.accent }]}>
                Ask AI is available on the web version for now.
              </Text>
            </View>
          )}

          {stage === 'input' && (
            <>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Describe what to add, or attach a photo of a schedule — a syllabus, a printed timetable, a
                whiteboard. You'll get a chance to review before anything is added.
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="e.g. Team standup every weekday at 9am starting tomorrow"
                placeholderTextColor={theme.textTertiary}
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                multiline
              />

              {photo && (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <Pressable onPress={() => setPhoto(null)} style={[styles.removePhoto, { backgroundColor: theme.surface }]}>
                    <Ionicons name="close" size={14} color={theme.text} />
                  </Pressable>
                </View>
              )}

              <View style={styles.photoButtonsRow}>
                <Pressable
                  onPress={() => pickImage(true)}
                  style={[styles.photoButton, { borderColor: theme.border }]}
                >
                  <Ionicons name="camera-outline" size={16} color={theme.text} />
                  <Text style={[styles.photoButtonText, { color: theme.text }]}>Take photo</Text>
                </Pressable>
                <Pressable
                  onPress={() => pickImage(false)}
                  style={[styles.photoButton, { borderColor: theme.border }]}
                >
                  <Ionicons name="image-outline" size={16} color={theme.text} />
                  <Text style={[styles.photoButtonText, { color: theme.text }]}>Choose photo</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={submit}
                disabled={!canSubmit}
                style={[styles.submitButton, { backgroundColor: canSubmit ? theme.accent : theme.border }]}
              >
                <Text style={[styles.submitButtonText, { color: canSubmit ? '#fff' : theme.textTertiary }]}>
                  Ask AI
                </Text>
              </Pressable>
            </>
          )}

          {stage === 'loading' && (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.centerText, { color: theme.textSecondary }]}>Reading your request…</Text>
            </View>
          )}

          {stage === 'error' && (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={22} color={theme.danger} />
              <Text style={[styles.centerText, { color: theme.text }]}>{error}</Text>
              <Pressable onPress={startOver} style={[styles.tryAgainButton, { borderColor: theme.border }]}>
                <Text style={[styles.tryAgainText, { color: theme.text }]}>Try again</Text>
              </Pressable>
            </View>
          )}

          {stage === 'review' && (
            <>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Review what AI found, uncheck anything you don't want, then add it.
              </Text>
              <View style={{ gap: 8, marginTop: 12 }}>
                {items.map((item, i) => {
                  const isSelected = selected.has(i);
                  const parsedDate = parseISO(item.date);
                  const dateLabel = format(parsedDate, 'EEE, MMM d');
                  const timeLabel = item.kind === 'event' ? (item.allDay ? 'All day' : `${item.startTime}–${item.endTime}`) : null;
                  const dotColor = item.kind === 'task' ? categoryColors[item.category ?? 'personal'] : theme.accent;

                  return (
                    <Pressable
                      key={i}
                      onPress={() => toggleSelected(i)}
                      style={[
                        styles.reviewRow,
                        { borderColor: isSelected ? theme.accent : theme.border, opacity: isSelected ? 1 : 0.5 },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? theme.accent : theme.textTertiary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reviewTitle, { color: theme.text }]}>{item.title}</Text>
                        <View style={styles.reviewMetaRow}>
                          <View style={[styles.reviewDot, { backgroundColor: dotColor }]} />
                          <Text style={[styles.reviewMeta, { color: theme.textTertiary }]}>
                            {dateLabel}
                            {timeLabel ? ` · ${timeLabel}` : item.kind === 'task' ? ` · ${categoryLabels[item.category ?? 'personal']} task` : ''}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={confirmAdd}
                disabled={selected.size === 0}
                style={[styles.submitButton, { backgroundColor: selected.size > 0 ? theme.accent : theme.border }]}
              >
                <Text style={[styles.submitButtonText, { color: selected.size > 0 ? '#fff' : theme.textTertiary }]}>
                  Add {selected.size} to calendar
                </Text>
              </Pressable>
              <Pressable onPress={startOver} style={styles.startOverLink}>
                <Text style={[styles.startOverText, { color: theme.textSecondary }]}>Start over</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, marginBottom: 16 },
  noticeText: { fontSize: 12, flex: 1, lineHeight: 17 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  textInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  photoButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  photoButtonText: { fontSize: 13, fontWeight: '500' },
  photoPreviewRow: { marginTop: 14, alignSelf: 'flex-start' },
  photoPreview: { width: 96, height: 96, borderRadius: 10 },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 20 },
  submitButtonText: { fontSize: 15, fontWeight: '600' },
  centerState: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  centerText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  tryAgainButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, marginTop: 6 },
  tryAgainText: { fontSize: 13, fontWeight: '600' },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  reviewTitle: { fontSize: 14.5, fontWeight: '600' },
  reviewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  reviewDot: { width: 6, height: 6, borderRadius: 3 },
  reviewMeta: { fontSize: 12 },
  startOverLink: { alignItems: 'center', marginTop: 14 },
  startOverText: { fontSize: 13, fontWeight: '500' },
});
