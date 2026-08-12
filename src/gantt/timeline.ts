import type { ProjectState, ZoomLevel } from '../types';
import { diffCalendarDays, parseISO, toISO } from '../scheduling/workingDays';
import { activeBaseline } from '../state/baselineDiff';
import { ZOOM_CONFIG } from './zoom';

export interface TimelineMetrics {
  originISO: string;
  endISO: string;
  totalDays: number;
  pxPerDay: number;
  width: number;
}

export function computeTimeline(state: ProjectState): TimelineMetrics {
  const tasks = Object.values(state.tasks);
  const starts = tasks.map((t) => t.start);
  const finishes = tasks.map((t) => t.finish);
  // When comparing against a baseline, widen the window so ghost bars whose baseline
  // extent falls outside the live plan's range still render inside the chart.
  const baseline = activeBaseline(state);
  if (baseline) {
    for (const snap of Object.values(baseline.tasks)) {
      starts.push(snap.start);
      finishes.push(snap.finish);
    }
  }
  starts.sort();
  finishes.sort();
  const minStart = starts[0] ?? '2026-01-01';
  const maxFinish = finishes[finishes.length - 1] ?? minStart;

  const origin = parseISO(minStart);
  origin.setDate(origin.getDate() - 7);
  while (origin.getDay() !== 1) origin.setDate(origin.getDate() - 1);

  const end = parseISO(maxFinish);
  end.setDate(end.getDate() + 14);

  const originISO = toISO(origin);
  const endISO = toISO(end);
  const totalDays = diffCalendarDays(originISO, endISO) + 1;
  const pxPerDay = ZOOM_CONFIG[state.zoom].pxPerDay;
  return { originISO, endISO, totalDays, pxPerDay, width: totalDays * pxPerDay };
}

export function dayOffset(originISO: string, targetISO: string): number {
  return diffCalendarDays(originISO, targetISO);
}

export function pxForDate(metrics: TimelineMetrics, iso: string): number {
  return dayOffset(metrics.originISO, iso) * metrics.pxPerDay;
}

export function dateForPx(metrics: TimelineMetrics, px: number): string {
  const dayIdx = Math.round(px / metrics.pxPerDay);
  const d = parseISO(metrics.originISO);
  d.setDate(d.getDate() + dayIdx);
  return toISO(d);
}

export interface TickConfig {
  majorTicks: { iso: string; label: string; x: number }[];
  minorTicks: { iso: string; label: string; x: number }[];
}

export interface WeekBand {
  iso: string;
  x: number;
  width: number;
  shaded: boolean;
}

export function computeWeekBands(metrics: TimelineMetrics): WeekBand[] {
  const bands: WeekBand[] = [];
  const origin = parseISO(metrics.originISO);
  const end = parseISO(metrics.endISO);
  const cur = new Date(origin);
  while (cur.getDay() !== 1) cur.setDate(cur.getDate() + 1);

  let index = 0;
  while (cur <= end) {
    const iso = toISO(cur);
    const x = pxForDate(metrics, iso);
    const next = new Date(cur);
    next.setDate(next.getDate() + 7);
    const nextX = Math.min(pxForDate(metrics, toISO(next)), metrics.width);
    bands.push({ iso, x, width: Math.max(nextX - x, 0), shaded: index % 2 === 1 });
    cur.setDate(cur.getDate() + 7);
    index += 1;
  }
  return bands;
}


const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function computeTicks(metrics: TimelineMetrics, zoom: ZoomLevel): TickConfig {
  const major: TickConfig['majorTicks'] = [];
  const minor: TickConfig['minorTicks'] = [];
  const origin = parseISO(metrics.originISO);
  const end = parseISO(metrics.endISO);

  const cur = new Date(origin);
  cur.setDate(1);
  while (cur <= end) {
    const iso = toISO(cur);
    const x = pxForDate(metrics, iso);
    major.push({ iso, label: `${MONTH_ABBR[cur.getMonth()]} ${cur.getFullYear()}`, x });
    cur.setMonth(cur.getMonth() + 1);
  }

  if (zoom === 'day') {
    const d = new Date(origin);
    while (d <= end) {
      const iso = toISO(d);
      minor.push({ iso, label: String(d.getDate()), x: pxForDate(metrics, iso) });
      d.setDate(d.getDate() + 1);
    }
  } else if (zoom === 'week') {
    const d = new Date(origin);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    while (d <= end) {
      const iso = toISO(d);
      minor.push({ iso, label: `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`, x: pxForDate(metrics, iso) });
      d.setDate(d.getDate() + 7);
    }
  } else {
    const d = new Date(origin);
    d.setDate(1);
    while (d <= end) {
      const iso = toISO(d);
      minor.push({ iso, label: MONTH_ABBR[d.getMonth()], x: pxForDate(metrics, iso) });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return { majorTicks: major, minorTicks: minor };
}
