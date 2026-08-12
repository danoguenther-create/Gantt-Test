export type ColumnId = 'name' | 'assignee' | 'status' | 'start' | 'finish' | 'duration' | 'predecessors';

export interface ColumnDef {
  id: ColumnId;
  header: string;
  width: number;
}

export const COLUMNS: ColumnDef[] = [
  { id: 'name', header: 'Primary Column', width: 280 },
  { id: 'assignee', header: 'Assigned To', width: 120 },
  { id: 'status', header: 'Status', width: 110 },
  { id: 'start', header: 'Start', width: 100 },
  { id: 'finish', header: 'Finish', width: 100 },
  { id: 'duration', header: 'Duration', width: 80 },
  { id: 'predecessors', header: 'Predecessors', width: 120 },
];

export const ROW_NUMBER_WIDTH = 44;
export const GRID_WIDTH = ROW_NUMBER_WIDTH + COLUMNS.reduce((acc, c) => acc + c.width, 0);
export const ROW_HEIGHT = 28;
export const WRAP_ROW_HEIGHT = 56;
export const HEADER_HEIGHT = 36;
export const GHOST_ROWS = 20;
export const MIN_COLUMN_WIDTH = 60;
// Width of the read-only baseline-delta column, appended only while a baseline is being compared.
export const DELTA_COLUMN_WIDTH = 90;

export type ColumnWidths = Record<ColumnId, number>;

export function defaultColumnWidths(): ColumnWidths {
  const out = {} as ColumnWidths;
  for (const c of COLUMNS) out[c.id] = c.width;
  return out;
}

export function gridWidthFor(widths: ColumnWidths): number {
  return ROW_NUMBER_WIDTH + COLUMNS.reduce((acc, c) => acc + (widths[c.id] ?? c.width), 0);
}
