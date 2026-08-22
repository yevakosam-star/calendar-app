import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { loadJSON, saveJSON } from './storage';
import { calendarColors, localCalendarColor } from './theme';
import {
  CalendarEvent,
  CalendarSource,
  DailyNoteItem,
  GOOGLE_ACCOUNT_ID,
  GoogleAccount,
  ICS_ACCOUNT_ID,
  LOCAL_CALENDAR_ID,
  Note,
  TaskCategory,
  WorkingHours,
} from './types';
import { extractAuthResult, GOOGLE_AUTH_CONFIGURED, useGoogleAuthRequest } from './googleAuth';
import {
  fetchGoogleCalendarList,
  fetchGoogleEvents,
  fetchGoogleUserInfo,
  GoogleAuthExpiredError,
} from './googleCalendarApi';
import { fetchIcsText } from './icsFetch';
import { parseIcsToEvents } from './icsParser';

const DEFAULT_WORKING_HOURS: WorkingHours = { start: 9, end: 17 };

const LOCAL_CALENDAR: CalendarSource = {
  id: LOCAL_CALENDAR_ID,
  accountId: LOCAL_CALENDAR_ID,
  name: 'My Calendar',
  color: localCalendarColor,
  visible: true,
};

// Seeded once on first launch so new installs start with regional holidays already visible.
const DEFAULT_ICS_CALENDARS: { name: string; url: string }[] = [
  { name: 'Valencia Holidays', url: 'https://www.officeholidays.com/ics/spain/valenciana' },
];

type State = {
  accounts: GoogleAccount[];
  calendars: CalendarSource[];
  dailyNotes: DailyNoteItem[];
  notes: Note[];
  localEvents: CalendarEvent[];
  googleEvents: CalendarEvent[];
  googleAccessToken: string | null;
  googleTokenExpiresAt: number | null;
  googleLoading: boolean;
  googleError: string | null;
  googleNeedsReauth: boolean;
  icsEvents: CalendarEvent[];
  icsLoading: boolean;
  icsError: string | null;
  workingHours: WorkingHours;
  loaded: boolean;
};

type Ctx = State & {
  events: CalendarEvent[];
  googleAuthConfigured: boolean;
  googleAccount: GoogleAccount | undefined;
  signInWithGoogle: () => void;
  disconnectGoogle: () => void;
  refreshGoogleEvents: () => void;
  icsCalendars: CalendarSource[];
  addIcsCalendar: (name: string, url: string) => Promise<void>;
  removeIcsCalendar: (calendarId: string) => void;
  refreshIcsCalendars: () => void;
  toggleCalendarVisibility: (calendarId: string) => void;
  setCalendarColor: (calendarId: string, color: string) => void;
  addDailyNoteItem: (date: string, text: string, category: TaskCategory) => void;
  toggleDailyNoteItem: (id: string) => void;
  updateDailyNoteItem: (id: string, text: string) => void;
  setDailyNoteCategory: (id: string, category: TaskCategory) => void;
  deleteDailyNoteItem: (id: string) => void;
  setWorkingHours: (hours: WorkingHours) => void;
  addNote: () => string;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) => void;
  deleteNote: (id: string) => void;
  addLocalEvent: (event: {
    date: string;
    title: string;
    allDay: boolean;
    startTime?: string;
    endTime?: string;
  }) => void;
  updateLocalEvent: (id: string, patch: Partial<Pick<CalendarEvent, 'title' | 'startTime' | 'endTime' | 'allDay'>>) => void;
  deleteLocalEvent: (id: string) => void;
};

const DataContext = createContext<Ctx | null>(null);

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    accounts: [],
    calendars: [],
    dailyNotes: [],
    notes: [],
    localEvents: [],
    googleEvents: [],
    googleAccessToken: null,
    googleTokenExpiresAt: null,
    googleLoading: false,
    googleError: null,
    googleNeedsReauth: false,
    icsEvents: [],
    icsLoading: false,
    icsError: null,
    workingHours: DEFAULT_WORKING_HOURS,
    loaded: false,
  });

  const [request, response, promptAsync] = useGoogleAuthRequest();

  useEffect(() => {
    (async () => {
      const [accounts, calendars, dailyNotes, notes, localEvents, googleEvents, icsEvents, googleToken, workingHours] =
        await Promise.all([
          loadJSON<GoogleAccount[]>('accounts', []),
          loadJSON<CalendarSource[]>('calendars', []),
          loadJSON<DailyNoteItem[]>('dailyNotes', []),
          loadJSON<Note[]>('notes', []),
          loadJSON<CalendarEvent[]>('localEvents', []),
          loadJSON<CalendarEvent[]>('googleEvents', []),
          loadJSON<CalendarEvent[]>('icsEvents', []),
          loadJSON<{ accessToken: string; expiresAt: number } | null>('googleToken', null),
          loadJSON<WorkingHours>('workingHours', DEFAULT_WORKING_HOURS),
        ]);
      const migratedNotes = dailyNotes.map((n) => ({ ...n, category: n.category ?? ('personal' as TaskCategory) }));
      // Keep only calendars/accounts belonging to the local calendar, a real Google connection,
      // or an imported ICS link — drops any stale demo data from earlier mock-account versions.
      const cleanAccounts = accounts.filter((a) => a.id === GOOGLE_ACCOUNT_ID);
      const cleanCalendars = calendars.filter(
        (c) => c.id === LOCAL_CALENDAR_ID || c.accountId === GOOGLE_ACCOUNT_ID || c.accountId === ICS_ACCOUNT_ID
      );
      const calendarsWithLocal = cleanCalendars.some((c) => c.id === LOCAL_CALENDAR_ID)
        ? cleanCalendars
        : [LOCAL_CALENDAR, ...cleanCalendars];

      const tokenValid = googleToken && googleToken.expiresAt > Date.now();

      setState({
        accounts: cleanAccounts,
        calendars: calendarsWithLocal,
        dailyNotes: migratedNotes,
        notes,
        localEvents,
        googleEvents: tokenValid ? googleEvents : [],
        googleAccessToken: tokenValid ? googleToken!.accessToken : null,
        googleTokenExpiresAt: tokenValid ? googleToken!.expiresAt : null,
        googleLoading: false,
        googleError: null,
        googleNeedsReauth: cleanAccounts.length > 0 && !tokenValid,
        icsEvents,
        icsLoading: false,
        icsError: null,
        workingHours,
        loaded: true,
      });
    })();
  }, []);

  useEffect(() => {
    if (state.loaded) saveJSON('accounts', state.accounts);
  }, [state.accounts, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('calendars', state.calendars);
  }, [state.calendars, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('dailyNotes', state.dailyNotes);
  }, [state.dailyNotes, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('notes', state.notes);
  }, [state.notes, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('localEvents', state.localEvents);
  }, [state.localEvents, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('googleEvents', state.googleEvents);
  }, [state.googleEvents, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('icsEvents', state.icsEvents);
  }, [state.icsEvents, state.loaded]);
  useEffect(() => {
    if (!state.loaded) return;
    saveJSON(
      'googleToken',
      state.googleAccessToken && state.googleTokenExpiresAt
        ? { accessToken: state.googleAccessToken, expiresAt: state.googleTokenExpiresAt }
        : null
    );
  }, [state.googleAccessToken, state.googleTokenExpiresAt, state.loaded]);
  useEffect(() => {
    if (state.loaded) saveJSON('workingHours', state.workingHours);
  }, [state.workingHours, state.loaded]);

  const fetchAllGoogleEvents = useCallback(async (accessToken: string, cals: CalendarSource[]) => {
    const timeMin = addDays(new Date(), -60).toISOString();
    const timeMax = addDays(new Date(), 180).toISOString();
    const results = await Promise.all(cals.map((c) => fetchGoogleEvents(accessToken, c.id, timeMin, timeMax)));
    return results.flat();
  }, []);

  // Handles the redirect back from Google's consent screen.
  useEffect(() => {
    const result = extractAuthResult(response ?? null);
    if (!result) {
      if (response?.type === 'error') {
        setState((prev) => ({
          ...prev,
          googleLoading: false,
          googleError: response.error?.message ?? 'Google sign-in failed',
        }));
      }
      return;
    }

    (async () => {
      setState((prev) => ({ ...prev, googleLoading: true, googleError: null, googleNeedsReauth: false }));
      try {
        const profile = await fetchGoogleUserInfo(result.accessToken);
        const list = await fetchGoogleCalendarList(result.accessToken);
        const newCalendars: CalendarSource[] = list.map((entry, i) => ({
          id: entry.id,
          accountId: GOOGLE_ACCOUNT_ID,
          name: entry.summary,
          color: entry.backgroundColor || calendarColors[i % calendarColors.length],
          visible: true,
        }));
        const events = await fetchAllGoogleEvents(result.accessToken, newCalendars);

        setState((prev) => ({
          ...prev,
          accounts: [
            ...prev.accounts.filter((a) => a.id !== GOOGLE_ACCOUNT_ID),
            {
              id: GOOGLE_ACCOUNT_ID,
              email: profile.email,
              displayName: profile.name ?? profile.email,
              connectedAt: Date.now(),
            },
          ],
          calendars: [...prev.calendars.filter((c) => c.accountId !== GOOGLE_ACCOUNT_ID), ...newCalendars],
          googleEvents: events,
          googleAccessToken: result.accessToken,
          googleTokenExpiresAt: result.expiresAt,
          googleLoading: false,
          googleNeedsReauth: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          googleLoading: false,
          googleError: err instanceof Error ? err.message : 'Failed to connect to Google',
        }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const events = useMemo(
    () => [...state.localEvents, ...state.googleEvents, ...state.icsEvents],
    [state.localEvents, state.googleEvents, state.icsEvents]
  );

  const icsCalendars = useMemo(
    () => state.calendars.filter((c) => c.accountId === ICS_ACCOUNT_ID),
    [state.calendars]
  );

  const googleAccount = state.accounts.find((a) => a.id === GOOGLE_ACCOUNT_ID);

  const signInWithGoogle = useCallback(() => {
    setState((prev) => ({ ...prev, googleError: null }));
    promptAsync();
  }, [promptAsync]);

  const disconnectGoogle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== GOOGLE_ACCOUNT_ID),
      calendars: prev.calendars.filter((c) => c.accountId !== GOOGLE_ACCOUNT_ID),
      googleEvents: [],
      googleAccessToken: null,
      googleTokenExpiresAt: null,
      googleNeedsReauth: false,
    }));
  }, []);

  const refreshGoogleEvents = useCallback(() => {
    setState((prev) => {
      if (!prev.googleAccessToken) return prev;
      const cals = prev.calendars.filter((c) => c.accountId === GOOGLE_ACCOUNT_ID);
      fetchAllGoogleEvents(prev.googleAccessToken, cals)
        .then((events) => setState((p) => ({ ...p, googleEvents: events, googleError: null })))
        .catch((err) => {
          if (err instanceof GoogleAuthExpiredError) {
            setState((p) => ({ ...p, googleNeedsReauth: true, googleAccessToken: null }));
          } else {
            setState((p) => ({ ...p, googleError: err instanceof Error ? err.message : 'Failed to refresh' }));
          }
        });
      return { ...prev, googleLoading: true };
    });
  }, [fetchAllGoogleEvents]);

  const fetchIcsEventsForCalendar = useCallback(async (calendar: CalendarSource): Promise<CalendarEvent[]> => {
    if (!calendar.sourceUrl) return [];
    const text = await fetchIcsText(calendar.sourceUrl);
    const windowStart = addDays(new Date(), -60);
    const windowEnd = addDays(new Date(), 180);
    return parseIcsToEvents(text, calendar.id, windowStart, windowEnd);
  }, []);

  const addIcsCalendar = useCallback(
    async (name: string, url: string) => {
      const trimmedName = name.trim();
      const trimmedUrl = url.trim();
      if (!trimmedName || !trimmedUrl) return;
      setState((prev) => ({ ...prev, icsLoading: true, icsError: null }));
      try {
        const newCalendar: CalendarSource = {
          id: `ics-${uid()}`,
          accountId: ICS_ACCOUNT_ID,
          name: trimmedName,
          color: calendarColors[0],
          visible: true,
          sourceUrl: trimmedUrl,
        };
        const fetchedEvents = await fetchIcsEventsForCalendar(newCalendar);
        setState((prev) => {
          const usedColors = prev.calendars.length;
          const coloredCalendar = { ...newCalendar, color: calendarColors[usedColors % calendarColors.length] };
          return {
            ...prev,
            calendars: [...prev.calendars, coloredCalendar],
            icsEvents: [...prev.icsEvents.filter((e) => e.calendarId !== newCalendar.id), ...fetchedEvents],
            icsLoading: false,
          };
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          icsLoading: false,
          icsError: err instanceof Error ? err.message : 'Failed to import calendar',
        }));
      }
    },
    [fetchIcsEventsForCalendar]
  );

  const removeIcsCalendar = useCallback((calendarId: string) => {
    setState((prev) => ({
      ...prev,
      calendars: prev.calendars.filter((c) => c.id !== calendarId),
      icsEvents: prev.icsEvents.filter((e) => e.calendarId !== calendarId),
    }));
  }, []);

  const refreshIcsCalendars = useCallback(() => {
    setState((prev) => {
      const cals = prev.calendars.filter((c) => c.accountId === ICS_ACCOUNT_ID);
      if (cals.length === 0) return prev;
      Promise.all(cals.map((c) => fetchIcsEventsForCalendar(c)))
        .then((results) => {
          setState((p) => ({ ...p, icsEvents: results.flat(), icsLoading: false, icsError: null }));
        })
        .catch((err) => {
          setState((p) => ({
            ...p,
            icsLoading: false,
            icsError: err instanceof Error ? err.message : 'Failed to refresh calendars',
          }));
        });
      return { ...prev, icsLoading: true };
    });
  }, [fetchIcsEventsForCalendar]);

  // Refresh imported calendars once on cold start so data isn't stale from last session.
  useEffect(() => {
    if (state.loaded && icsCalendars.length > 0) {
      refreshIcsCalendars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loaded]);

  // Seed default imported calendars once, ever, on first launch — never re-added if the user removes them.
  useEffect(() => {
    if (!state.loaded) return;
    (async () => {
      const seeded = await loadJSON<boolean>('defaultIcsSeeded', false);
      if (seeded) return;
      await saveJSON('defaultIcsSeeded', true);
      for (const cal of DEFAULT_ICS_CALENDARS) {
        await addIcsCalendar(cal.name, cal.url);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loaded]);

  const toggleCalendarVisibility = useCallback((calendarId: string) => {
    setState((prev) => ({
      ...prev,
      calendars: prev.calendars.map((c) => (c.id === calendarId ? { ...c, visible: !c.visible } : c)),
    }));
  }, []);

  const setCalendarColor = useCallback((calendarId: string, color: string) => {
    setState((prev) => ({
      ...prev,
      calendars: prev.calendars.map((c) => (c.id === calendarId ? { ...c, color } : c)),
    }));
  }, []);

  const addDailyNoteItem = useCallback((date: string, text: string, category: TaskCategory) => {
    if (!text.trim()) return;
    setState((prev) => ({
      ...prev,
      dailyNotes: [
        ...prev.dailyNotes,
        { id: uid(), date, text: text.trim(), done: false, category, createdAt: Date.now() },
      ],
    }));
  }, []);

  const toggleDailyNoteItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      dailyNotes: prev.dailyNotes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
    }));
  }, []);

  const updateDailyNoteItem = useCallback((id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      dailyNotes: prev.dailyNotes.map((n) => (n.id === id ? { ...n, text } : n)),
    }));
  }, []);

  const setDailyNoteCategory = useCallback((id: string, category: TaskCategory) => {
    setState((prev) => ({
      ...prev,
      dailyNotes: prev.dailyNotes.map((n) => (n.id === id ? { ...n, category } : n)),
    }));
  }, []);

  const deleteDailyNoteItem = useCallback((id: string) => {
    setState((prev) => ({ ...prev, dailyNotes: prev.dailyNotes.filter((n) => n.id !== id) }));
  }, []);

  const setWorkingHours = useCallback((hours: WorkingHours) => {
    const start = Math.min(Math.max(hours.start, 0), 22);
    const end = Math.min(Math.max(hours.end, start + 1), 24);
    setState((prev) => ({ ...prev, workingHours: { start, end } }));
  }, []);

  const addNote = useCallback(() => {
    const id = uid();
    const now = Date.now();
    setState((prev) => ({
      ...prev,
      notes: [{ id, title: '', body: '', createdAt: now, updatedAt: now }, ...prev.notes],
    }));
    return id;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
  }, []);

  const addLocalEvent = useCallback(
    (event: { date: string; title: string; allDay: boolean; startTime?: string; endTime?: string }) => {
      if (!event.title.trim()) return;
      setState((prev) => ({
        ...prev,
        localEvents: [
          ...prev.localEvents,
          {
            id: uid(),
            calendarId: LOCAL_CALENDAR_ID,
            date: event.date,
            title: event.title.trim(),
            allDay: event.allDay,
            startTime: event.allDay ? undefined : event.startTime,
            endTime: event.allDay ? undefined : event.endTime,
          },
        ],
      }));
    },
    []
  );

  const updateLocalEvent = useCallback(
    (id: string, patch: Partial<Pick<CalendarEvent, 'title' | 'startTime' | 'endTime' | 'allDay'>>) => {
      setState((prev) => ({
        ...prev,
        localEvents: prev.localEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    []
  );

  const deleteLocalEvent = useCallback((id: string) => {
    setState((prev) => ({ ...prev, localEvents: prev.localEvents.filter((e) => e.id !== id) }));
  }, []);

  const value: Ctx = {
    ...state,
    events,
    googleAuthConfigured: GOOGLE_AUTH_CONFIGURED && !!request,
    googleAccount,
    signInWithGoogle,
    disconnectGoogle,
    refreshGoogleEvents,
    icsCalendars,
    addIcsCalendar,
    removeIcsCalendar,
    refreshIcsCalendars,
    toggleCalendarVisibility,
    setCalendarColor,
    addDailyNoteItem,
    toggleDailyNoteItem,
    updateDailyNoteItem,
    setDailyNoteCategory,
    deleteDailyNoteItem,
    setWorkingHours,
    addNote,
    updateNote,
    deleteNote,
    addLocalEvent,
    updateLocalEvent,
    deleteLocalEvent,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
