import { addDays, addMonths, addYears, format } from 'date-fns';
import { CalendarEvent } from './types';

type IcsProp = { value: string; params: Record<string, string> };
type IcsProps = Record<string, IcsProp>;

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MAX_OCCURRENCES_PER_EVENT = 400;

function unfoldLines(text: string): string[] {
  const raw = text.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseLine(line: string): { name: string; prop: IcsProp } | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const left = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const [name, ...paramParts] = left.split(';');
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name: name.toUpperCase(), prop: { value, params } };
}

function parseIcsDate(value: string, params: Record<string, string>): { date: Date; allDay: boolean } {
  const clean = value.trim();
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(clean)) {
    const y = +clean.slice(0, 4);
    const mo = +clean.slice(4, 6) - 1;
    const d = +clean.slice(6, 8);
    return { date: new Date(y, mo, d), allDay: true };
  }
  const y = +clean.slice(0, 4);
  const mo = +clean.slice(4, 6) - 1;
  const d = +clean.slice(6, 8);
  const h = +clean.slice(9, 11) || 0;
  const mi = +clean.slice(11, 13) || 0;
  const s = +clean.slice(13, 15) || 0;
  const date = clean.endsWith('Z') ? new Date(Date.UTC(y, mo, d, h, mi, s)) : new Date(y, mo, d, h, mi, s);
  return { date, allDay: false };
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseRRule(value: string): Record<string, string> {
  const parts = value.split(';');
  const rule: Record<string, string> = {};
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k && v) rule[k.toUpperCase()] = v;
  }
  return rule;
}

function addInterval(date: Date, freq: string, interval: number): Date {
  switch (freq) {
    case 'DAILY':
      return addDays(date, interval);
    case 'WEEKLY':
      return addDays(date, 7 * interval);
    case 'MONTHLY':
      return addMonths(date, interval);
    case 'YEARLY':
      return addYears(date, interval);
    default:
      return addDays(date, interval);
  }
}

function expandOccurrences(
  startDate: Date,
  rrule: Record<string, string> | null,
  windowStart: Date,
  windowEnd: Date
): Date[] {
  if (!rrule) return startDate >= windowStart && startDate <= windowEnd ? [startDate] : [startDate];

  const freq = rrule.FREQ;
  const interval = rrule.INTERVAL ? parseInt(rrule.INTERVAL, 10) : 1;
  const count = rrule.COUNT ? parseInt(rrule.COUNT, 10) : undefined;
  const until = rrule.UNTIL ? parseIcsDate(rrule.UNTIL, {}).date : undefined;
  const byDay = rrule.BYDAY ? rrule.BYDAY.split(',') : undefined;

  const occurrences: Date[] = [];

  if (freq === 'WEEKLY' && byDay && byDay.length > 0) {
    const targetWeekdays = new Set(byDay.map((d) => WEEKDAY_CODES.indexOf(d)));
    let weekCursor = startDate;
    let produced = 0;
    for (let week = 0; week < MAX_OCCURRENCES_PER_EVENT; week++) {
      for (let dow = 0; dow < 7; dow++) {
        const candidate = addDays(weekCursor, dow - weekCursor.getDay());
        if (candidate < startDate) continue;
        if (!targetWeekdays.has(candidate.getDay())) continue;
        if (until && candidate > until) return occurrences;
        if (count && produced >= count) return occurrences;
        if (candidate >= windowStart && candidate <= windowEnd) occurrences.push(candidate);
        produced++;
      }
      weekCursor = addDays(weekCursor, 7 * interval);
      if (weekCursor > windowEnd) break;
    }
    return occurrences;
  }

  let cursor = startDate;
  let produced = 0;
  while (produced < MAX_OCCURRENCES_PER_EVENT) {
    if (until && cursor > until) break;
    if (count && produced >= count) break;
    if (cursor > windowEnd) break;
    if (cursor >= windowStart) occurrences.push(cursor);
    produced++;
    cursor = addInterval(cursor, freq, interval);
  }
  return occurrences;
}

export function parseIcsToEvents(
  icsText: string,
  calendarId: string,
  windowStart: Date,
  windowEnd: Date
): CalendarEvent[] {
  const lines = unfoldLines(icsText);
  const events: CalendarEvent[] = [];

  let inEvent = false;
  let current: IcsProps = {};

  const flush = () => {
    if (!inEvent) return;
    inEvent = false;
    const dtstart = current.DTSTART;
    if (!dtstart) return;
    const { date: startDate, allDay } = parseIcsDate(dtstart.value, dtstart.params);
    const dtend = current.DTEND;
    const endDate = dtend ? parseIcsDate(dtend.value, dtend.params).date : startDate;
    const durationMs = endDate.getTime() - startDate.getTime();
    const title = current.SUMMARY ? unescapeText(current.SUMMARY.value) : '(No title)';
    const uid = current.UID?.value ?? `${title}-${dtstart.value}`;
    const rrule = current.RRULE ? parseRRule(current.RRULE.value) : null;

    const occurrences = expandOccurrences(startDate, rrule, windowStart, windowEnd);

    occurrences.forEach((occStart, i) => {
      if (allDay) {
        events.push({
          id: `${uid}-${i}`,
          calendarId,
          title,
          date: format(occStart, 'yyyy-MM-dd'),
          allDay: true,
        });
      } else {
        const occEnd = new Date(occStart.getTime() + durationMs);
        events.push({
          id: `${uid}-${i}`,
          calendarId,
          title,
          date: format(occStart, 'yyyy-MM-dd'),
          allDay: false,
          startTime: format(occStart, 'HH:mm'),
          endTime: format(occEnd, 'HH:mm'),
        });
      }
    });
  };

  for (const rawLine of lines) {
    const parsed = parseLine(rawLine);
    if (!parsed) continue;
    const { name, prop } = parsed;

    if (name === 'BEGIN' && prop.value === 'VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (name === 'END' && prop.value === 'VEVENT') {
      flush();
      continue;
    }
    if (inEvent) {
      current[name] = prop;
    }
  }

  return events;
}
