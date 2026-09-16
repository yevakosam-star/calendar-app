import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { calendarColors, useTheme } from '../../lib/theme';
import { useData } from '../../lib/store';
import { PageContainer } from '../../lib/PageContainer';
import { LOCAL_CALENDAR_ID } from '../../lib/types';

function formatHour(hour: number): string {
  const h = hour % 24;
  const period = h < 12 || h === 24 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

export default function CalendarsScreen() {
  const theme = useTheme();
  const {
    calendars,
    toggleCalendarVisibility,
    setCalendarColor,
    workingHours,
    setWorkingHours,
    googleAuthConfigured,
    googleAccount,
    googleLoading,
    googleError,
    googleNeedsReauth,
    signInWithGoogle,
    disconnectGoogle,
    refreshGoogleEvents,
    icsCalendars,
    addIcsCalendar,
    removeIcsCalendar,
    refreshIcsCalendars,
    icsLoading,
    icsError,
  } = useData();

  const localCalendar = calendars.find((c) => c.id === LOCAL_CALENDAR_ID);
  const googleCalendars = calendars.filter((c) => c.accountId === 'google');
  const canSignIn = Platform.OS === 'web';

  const [showIcsForm, setShowIcsForm] = useState(false);
  const [icsName, setIcsName] = useState('');
  const [icsUrl, setIcsUrl] = useState('');

  const submitIcsCalendar = async () => {
    if (!icsName.trim() || !icsUrl.trim()) return;
    await addIcsCalendar(icsName, icsUrl);
    setIcsName('');
    setIcsUrl('');
    setShowIcsForm(false);
  };

  const cycleLocalColor = () => {
    if (!localCalendar) return;
    const idx = calendarColors.indexOf(localCalendar.color);
    const next = calendarColors[(idx + 1) % calendarColors.length];
    setCalendarColor(localCalendar.id, next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <PageContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Calendars</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Connect Google Calendar to see everything in one place.
        </Text>

        {localCalendar && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Your calendar</Text>
            <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>
              Events you create directly in the app.
            </Text>
            <View style={[styles.accountCard, { borderColor: theme.border, marginTop: 12 }]}>
              <View style={styles.calendarRow}>
                <Pressable onPress={cycleLocalColor} hitSlop={8}>
                  <View style={[styles.colorDot, styles.colorDotLarge, { backgroundColor: localCalendar.color }]} />
                </Pressable>
                <Text style={[styles.calendarName, { color: theme.text }]}>{localCalendar.name}</Text>
                <Switch
                  value={localCalendar.visible}
                  onValueChange={() => toggleCalendarVisibility(localCalendar.id)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Working hours</Text>
          <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>
            Shown as a shaded block behind your day so calls stand out.
          </Text>
          <View style={[styles.hoursRow, { borderColor: theme.border }]}>
            <View style={styles.hoursStepper}>
              <Pressable
                onPress={() => setWorkingHours({ ...workingHours, start: workingHours.start - 1 })}
                style={[styles.stepperButton, { borderColor: theme.border }]}
                hitSlop={8}
              >
                <Ionicons name="remove" size={16} color={theme.text} />
              </Pressable>
              <Text style={[styles.hoursValue, { color: theme.text }]}>{formatHour(workingHours.start)}</Text>
              <Pressable
                onPress={() => setWorkingHours({ ...workingHours, start: workingHours.start + 1 })}
                style={[styles.stepperButton, { borderColor: theme.border }]}
                hitSlop={8}
              >
                <Ionicons name="add" size={16} color={theme.text} />
              </Pressable>
            </View>
            <Text style={[styles.hoursDash, { color: theme.textTertiary }]}>to</Text>
            <View style={styles.hoursStepper}>
              <Pressable
                onPress={() => setWorkingHours({ ...workingHours, end: workingHours.end - 1 })}
                style={[styles.stepperButton, { borderColor: theme.border }]}
                hitSlop={8}
              >
                <Ionicons name="remove" size={16} color={theme.text} />
              </Pressable>
              <Text style={[styles.hoursValue, { color: theme.text }]}>{formatHour(workingHours.end)}</Text>
              <Pressable
                onPress={() => setWorkingHours({ ...workingHours, end: workingHours.end + 1 })}
                style={[styles.stepperButton, { borderColor: theme.border }]}
                hitSlop={8}
              >
                <Ionicons name="add" size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Google Calendar</Text>

          {!googleAuthConfigured && (
            <View style={[styles.noticeBox, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.noticeText, { color: theme.accent }]}>
                Not set up yet — add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file to enable Google sign-in.
              </Text>
            </View>
          )}

          {googleAuthConfigured && !canSignIn && (
            <View style={[styles.noticeBox, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.noticeText, { color: theme.accent }]}>
                Google sign-in is available on the web version for now.
              </Text>
            </View>
          )}

          {googleError && (
            <View style={[styles.noticeBox, { backgroundColor: `${theme.danger}1A`, marginTop: 12 }]}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
              <Text style={[styles.noticeText, { color: theme.danger }]}>{googleError}</Text>
            </View>
          )}

          {googleAuthConfigured && canSignIn && !googleAccount && (
            <Pressable
              onPress={signInWithGoogle}
              disabled={googleLoading}
              style={[styles.signInButton, { backgroundColor: theme.text, marginTop: 12 }]}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={16} color={theme.background} />
                  <Text style={[styles.signInText, { color: theme.background }]}>Sign in with Google</Text>
                </>
              )}
            </Pressable>
          )}

          {googleAccount && (
            <View style={[styles.accountCard, { borderColor: theme.border, marginTop: 12 }]}>
              <View style={styles.accountHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, { color: theme.text }]}>{googleAccount.displayName}</Text>
                  <Text style={[styles.accountEmail, { color: theme.textTertiary }]}>{googleAccount.email}</Text>
                </View>
                <Pressable onPress={disconnectGoogle} hitSlop={8}>
                  <Text style={[styles.disconnect, { color: theme.danger }]}>Disconnect</Text>
                </Pressable>
              </View>

              {googleNeedsReauth ? (
                <Pressable onPress={signInWithGoogle} style={[styles.reauthRow]}>
                  <Ionicons name="refresh" size={14} color={theme.accent} />
                  <Text style={[styles.reauthText, { color: theme.accent }]}>
                    Session expired — tap to reconnect
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View style={{ gap: 2, marginTop: 8 }}>
                    {googleCalendars.map((cal) => (
                      <View key={cal.id} style={styles.calendarRow}>
                        <View style={[styles.colorDot, { backgroundColor: cal.color }]} />
                        <Text style={[styles.calendarName, { color: theme.text }]}>{cal.name}</Text>
                        <Switch
                          value={cal.visible}
                          onValueChange={() => toggleCalendarVisibility(cal.id)}
                          trackColor={{ false: theme.border, true: theme.accent }}
                          thumbColor="#fff"
                        />
                      </View>
                    ))}
                  </View>
                  <Pressable onPress={refreshGoogleEvents} disabled={googleLoading} style={styles.refreshRow}>
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={13} color={theme.textSecondary} />
                        <Text style={[styles.refreshText, { color: theme.textSecondary }]}>Refresh</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Imported calendars</Text>
            <Pressable onPress={() => setShowIcsForm((v) => !v)} hitSlop={8} style={styles.addLinkButton}>
              <Ionicons name={showIcsForm ? 'close' : 'add'} size={15} color={theme.accent} />
              <Text style={[styles.addLinkButtonText, { color: theme.accent }]}>
                {showIcsForm ? 'Cancel' : 'Add by link'}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>
            Paste a calendar's secret iCal link (Google Calendar → Settings → your calendar → Integrate calendar).
            Read-only.
          </Text>

          {showIcsForm && (
            <View style={[styles.eventForm, { borderColor: theme.border }]}>
              <TextInput
                value={icsName}
                onChangeText={setIcsName}
                placeholder="Calendar name"
                placeholderTextColor={theme.textTertiary}
                style={[styles.icsInput, { color: theme.text, borderColor: theme.border }]}
              />
              <TextInput
                value={icsUrl}
                onChangeText={setIcsUrl}
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.icsInput, { color: theme.text, borderColor: theme.border }]}
              />
              <Pressable
                onPress={submitIcsCalendar}
                disabled={icsLoading || !icsName.trim() || !icsUrl.trim()}
                style={[
                  styles.eventSubmit,
                  { backgroundColor: icsLoading || !icsName.trim() || !icsUrl.trim() ? theme.border : theme.accent },
                ]}
              >
                {icsLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.eventSubmitText,
                      { color: !icsName.trim() || !icsUrl.trim() ? theme.textTertiary : '#fff' },
                    ]}
                  >
                    Add calendar
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {icsError && (
            <View style={[styles.noticeBox, { backgroundColor: `${theme.danger}1A` }]}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
              <Text style={[styles.noticeText, { color: theme.danger }]}>{icsError}</Text>
            </View>
          )}

          {icsCalendars.length > 0 && (
            <View style={[styles.accountCard, { borderColor: theme.border, marginTop: 12 }]}>
              <View style={{ gap: 2 }}>
                {icsCalendars.map((cal) => (
                  <View key={cal.id} style={styles.calendarRow}>
                    <View style={[styles.colorDot, { backgroundColor: cal.color }]} />
                    <Text style={[styles.calendarName, { color: theme.text }]}>{cal.name}</Text>
                    <Switch
                      value={cal.visible}
                      onValueChange={() => toggleCalendarVisibility(cal.id)}
                      trackColor={{ false: theme.border, true: theme.accent }}
                      thumbColor="#fff"
                    />
                    <Pressable onPress={() => removeIcsCalendar(cal.id)} hitSlop={8} style={{ marginLeft: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable onPress={refreshIcsCalendars} disabled={icsLoading} style={styles.refreshRow}>
                {icsLoading ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={13} color={theme.textSecondary} />
                    <Text style={[styles.refreshText, { color: theme.textSecondary }]}>Refresh</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 4 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  noticeText: { fontSize: 12, flex: 1, lineHeight: 17 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionHint: { fontSize: 12, marginTop: 4 },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  hoursStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperButton: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hoursValue: { fontSize: 14, fontWeight: '600', minWidth: 46, textAlign: 'center' },
  hoursDash: { fontSize: 13 },
  accountCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  accountHeader: { flexDirection: 'row', alignItems: 'center' },
  accountName: { fontSize: 15, fontWeight: '600' },
  accountEmail: { fontSize: 12, marginTop: 1 },
  disconnect: { fontSize: 12, fontWeight: '500' },
  calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  colorDotLarge: { width: 16, height: 16, borderRadius: 8 },
  calendarName: { fontSize: 14, flex: 1 },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  signInText: { fontSize: 14, fontWeight: '600' },
  reauthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  reauthText: { fontSize: 12.5, fontWeight: '500' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  refreshText: { fontSize: 12, fontWeight: '500' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLinkButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addLinkButtonText: { fontSize: 12.5, fontWeight: '600' },
  eventForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12, gap: 10 },
  icsInput: { fontSize: 14, borderBottomWidth: 1, paddingVertical: 6 },
  eventSubmit: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  eventSubmitText: { fontSize: 14, fontWeight: '600' },
});
