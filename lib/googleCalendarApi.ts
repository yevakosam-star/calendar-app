import { format, parseISO } from 'date-fns';
import { CalendarEvent } from './types';

const BASE = 'https://www.googleapis.com/calendar/v3';

export type GoogleUserInfo = { email: string; name?: string };

async function googleFetch(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new GoogleAuthExpiredError();
  if (!res.ok) throw new Error(`Google API request failed (${res.status})`);
  return res.json();
}

export class GoogleAuthExpiredError extends Error {
  constructor() {
    super('Google access token expired');
    this.name = 'GoogleAuthExpiredError';
  }
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const data = await googleFetch('https://www.googleapis.com/oauth2/v2/userinfo', accessToken);
  return { email: data.email, name: data.name };
}

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
};

export async function fetchGoogleCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const data = await googleFetch(`${BASE}/users/me/calendarList`, accessToken);
  return (data.items ?? []).map((item: Record<string, unknown>) => ({
    id: item.id,
    summary: item.summary ?? item.id,
    backgroundColor: item.backgroundColor,
    primary: item.primary,
  }));
}

export async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const url = new URL(`${BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  const data = await googleFetch(url.toString(), accessToken);
  return (data.items ?? [])
    .map((raw: Record<string, any>) => mapGoogleEvent(raw, calendarId))
    .filter((e: CalendarEvent | null): e is CalendarEvent => e !== null);
}

function mapGoogleEvent(raw: Record<string, any>, calendarId: string): CalendarEvent | null {
  if (!raw.id || raw.status === 'cancelled') return null;
  const start = raw.start;
  const end = raw.end;
  if (!start) return null;

  if (start.date) {
    return {
      id: raw.id,
      calendarId,
      title: raw.summary ?? '(No title)',
      date: start.date,
      allDay: true,
    };
  }

  if (start.dateTime) {
    const startDate = parseISO(start.dateTime);
    const endDate = end?.dateTime ? parseISO(end.dateTime) : startDate;
    return {
      id: raw.id,
      calendarId,
      title: raw.summary ?? '(No title)',
      date: format(startDate, 'yyyy-MM-dd'),
      allDay: false,
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
    };
  }

  return null;
}
