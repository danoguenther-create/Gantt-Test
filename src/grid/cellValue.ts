import type { Dispatch } from 'react';
import type { Status, Task } from '../types';
import type { Action } from '../state/store';
import { parsePredecessors, formatPredecessors } from '../scheduling/predecessors';
import type { ColumnId } from './columns';

const STATUSES: Status[] = ['Not Started', 'In Progress', 'Complete'];

export function cellDisplayValue(task: Task, column: ColumnId): string {
  switch (column) {
    case 'name':
      return task.name;
    case 'assignee':
      return task.assignee ?? '';
    case 'status':
      return task.status;
    case 'start':
      return task.start;
    case 'finish':
      return task.finish;
    case 'duration':
      return `${task.durationDays}d`;
    case 'predecessors':
      return formatPredecessors(task.predecessors);
  }
  return '';
}

function parseDuration(text: string): number | null {
  const m = /^\s*(\d+)\s*d?\s*$/i.exec(text);
  if (!m) return null;
  return Number(m[1]);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Applies a raw string value to a task cell, dispatching the appropriate action.
 * Shared by inline cell editing and clipboard paste so both behave identically.
 */
export function commitCellValue(dispatch: Dispatch<Action>, task: Task, column: ColumnId, raw: string): void {
  switch (column) {
    case 'name':
      if (raw !== task.name) dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { name: raw } });
      break;
    case 'assignee':
      if (raw !== (task.assignee ?? '')) dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { assignee: raw } });
      break;
    case 'status': {
      const s = raw.trim();
      if ((STATUSES as string[]).includes(s) && s !== task.status) {
        dispatch({ type: 'SET_STATUS', id: task.id, status: s as Status });
      }
      break;
    }
    case 'duration': {
      const d = parseDuration(raw);
      if (d !== null && d !== task.durationDays) dispatch({ type: 'UPDATE_DURATION', id: task.id, durationDays: d });
      break;
    }
    case 'start': {
      const s = raw.trim();
      if (ISO_DATE_RE.test(s) && s !== task.start) dispatch({ type: 'UPDATE_START', id: task.id, start: s });
      break;
    }
    case 'finish': {
      const f = raw.trim();
      if (ISO_DATE_RE.test(f) && f !== task.finish) dispatch({ type: 'UPDATE_FINISH', id: task.id, finish: f });
      break;
    }
    case 'predecessors':
      dispatch({ type: 'UPDATE_PREDECESSORS', id: task.id, deps: parsePredecessors(raw) });
      break;
  }
}
