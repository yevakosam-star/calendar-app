export const LOCAL_CALENDAR_ID = 'local';
export const GOOGLE_ACCOUNT_ID = 'google';
export const ICS_ACCOUNT_ID = 'ics';

export type GoogleAccount = {
  id: string;
  email: string;
  displayName: string;
  connectedAt: number;
};

export type CalendarSource = {
  id: string;
  accountId: string;
  name: string;
  color: string;
  visible: boolean;
  sourceUrl?: string;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  date: string; // yyyy-MM-dd
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;
  location?: string;
};

export type TaskCategory = 'work' | 'personal' | 'content';

export type DailyNoteItem = {
  id: string;
  date: string; // yyyy-MM-dd
  text: string;
  done: boolean;
  category: TaskCategory;
  createdAt: number;
};

export type WorkingHours = {
  start: number; // hour 0-23
  end: number; // hour 1-24
};

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

