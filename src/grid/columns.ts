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

export const GRID_WIDTH = COLUMNS.reduce((acc, c) => acc + c.width, 0);
export const ROW_HEIGHT = 28;
export const HEADER_HEIGHT = 36;
