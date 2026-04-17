export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isWorkingDay(date: Date): boolean {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

export function nextWorkingDay(date: Date): Date {
  const d = new Date(date);
  while (!isWorkingDay(d)) d.setDate(d.getDate() + 1);
  return d;
}

export function prevWorkingDay(date: Date): Date {
  const d = new Date(date);
  while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
  return d;
}

export function addWorkingDays(iso: string, n: number): string {
  const d = parseISO(iso);
  if (n === 0) return toISO(nextWorkingDay(d));
  const step = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    if (isWorkingDay(d)) remaining--;
  }
  return toISO(d);
}

export function diffWorkingDays(startISO: string, endISO: string): number {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (end < start) return -diffWorkingDays(endISO, startISO);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isWorkingDay(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function diffCalendarDays(startISO: string, endISO: string): number {
  const ms = parseISO(endISO).getTime() - parseISO(startISO).getTime();
  return Math.round(ms / 86400000);
}
