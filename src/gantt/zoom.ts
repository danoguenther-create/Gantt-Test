import type { ZoomLevel } from '../types';

export interface ZoomConfig {
  pxPerDay: number;
  label: string;
}

export const ZOOM_CONFIG: Record<ZoomLevel, ZoomConfig> = {
  day: { pxPerDay: 24, label: 'Day' },
  week: { pxPerDay: 12, label: 'Week' },
  month: { pxPerDay: 4, label: 'Month' },
};
