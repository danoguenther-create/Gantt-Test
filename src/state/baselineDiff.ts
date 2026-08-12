import type { Baseline, BaselineTaskSnapshot, ProjectState, TaskId } from '../types';
import { diffWorkingDays } from '../scheduling/workingDays';

export type RowDiffKind = 'unchanged' | 'shifted' | 'new' | 'removed' | 'renamed';

export interface TaskDiff {
  id: TaskId;
  kind: RowDiffKind;
  // Working-day offset of the finish/start vs. the baseline. 0 = no shift, +N = N working days later.
  finishDeltaWorkingDays: number;
  startDeltaWorkingDays: number;
  baseline?: BaselineTaskSnapshot;
}

export interface BaselineDiff {
  byId: Map<TaskId, TaskDiff>;
  removed: Array<{ id: TaskId; snapshot: BaselineTaskSnapshot }>; // in baseline, no longer in the plan
}

// Signed working-day offset between two ISO dates. Same day -> 0, next working day -> +1,
// previous working day -> -1. Built on the inclusive diffWorkingDays.
export function workingDayOffset(fromISO: string, toISO: string): number {
  const raw = diffWorkingDays(fromISO, toISO); // inclusive, signed (>=1 or <=-1)
  if (raw > 0) return raw - 1;
  if (raw < 0) return raw + 1;
  return 0;
}

const EMPTY: BaselineDiff = { byId: new Map(), removed: [] };

export function computeBaselineDiff(state: ProjectState, baseline: Baseline | null): BaselineDiff {
  if (!baseline) return EMPTY;

  const byId = new Map<TaskId, TaskDiff>();

  for (const task of Object.values(state.tasks)) {
    const snap = baseline.tasks[task.id];
    if (!snap) {
      byId.set(task.id, {
        id: task.id,
        kind: 'new',
        finishDeltaWorkingDays: 0,
        startDeltaWorkingDays: 0,
      });
      continue;
    }
    const finishDelta = workingDayOffset(snap.finish, task.finish);
    const startDelta = workingDayOffset(snap.start, task.start);
    let kind: RowDiffKind;
    if (task.name !== snap.name) {
      kind = 'renamed';
    } else if (finishDelta !== 0 || startDelta !== 0) {
      kind = 'shifted';
    } else {
      kind = 'unchanged';
    }
    byId.set(task.id, {
      id: task.id,
      kind,
      finishDeltaWorkingDays: finishDelta,
      startDeltaWorkingDays: startDelta,
      baseline: snap,
    });
  }

  const removed: BaselineDiff['removed'] = [];
  for (const [id, snapshot] of Object.entries(baseline.tasks)) {
    if (!state.tasks[id]) removed.push({ id, snapshot });
  }

  return { byId, removed };
}

// Resolve the baseline currently selected for comparison, or null.
export function activeBaseline(state: ProjectState): Baseline | null {
  const id = state.compareBaselineId;
  if (!id) return null;
  return (state.baselines ?? []).find((b) => b.id === id) ?? null;
}
