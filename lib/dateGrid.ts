import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type GridDay = {
  date: Date;
  key: string; // yyyy-MM-dd
  inMonth: boolean;
  isToday: boolean;
};

export function getMonthGrid(monthDate: Date): GridDay[] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days: GridDay[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push({
      date: cursor,
      key: format(cursor, 'yyyy-MM-dd'),
      inMonth: isSameMonth(cursor, monthDate),
      isToday: isToday(cursor),
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function getWeekDays(anyDateInWeek: Date): GridDay[] {
  const start = startOfWeek(anyDateInWeek, { weekStartsOn: 1 });
  const days: GridDay[] = [];
  for (let i = 0; i < 7; i++) {
    const cursor = addDays(start, i);
    days.push({
      date: cursor,
      key: format(cursor, 'yyyy-MM-dd'),
      inMonth: isSameMonth(cursor, anyDateInWeek),
      isToday: isToday(cursor),
    });
  }
  return days;
}

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
