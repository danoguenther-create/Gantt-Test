import type { ProjectState, Task, TaskId } from '../types';
import { diffWorkingDays } from './workingDays';

function childrenOf(state: ProjectState, id: TaskId): Task[] {
  return Object.values(state.tasks).filter((t) => t.parentId === id);
}

export function rollupSummaries(state: ProjectState): ProjectState {
  const tasks: Record<TaskId, Task> = { ...state.tasks };

  const parentIds = new Set<TaskId>();
  for (const t of Object.values(tasks)) {
    if (t.parentId) parentIds.add(t.parentId);
  }

  const depthOf = (id: TaskId): number => {
    let d = 0;
    let cur = tasks[id];
    while (cur?.parentId) {
      d++;
      cur = tasks[cur.parentId];
    }
    return d;
  };

  const parents = [...parentIds].sort((a, b) => depthOf(b) - depthOf(a));

  for (const id of parents) {
    const kids = childrenOf({ ...state, tasks }, id);
    if (kids.length === 0) continue;
    const starts = kids.map((k) => k.start).sort();
    const finishes = kids.map((k) => k.finish).sort();
    const start = starts[0];
    const finish = finishes[finishes.length - 1];
    const duration = Math.max(diffWorkingDays(start, finish), 0);
    tasks[id] = { ...tasks[id], start, finish, durationDays: duration };
  }
  return { ...state, tasks };
}

export function hasChildren(state: ProjectState, id: TaskId): boolean {
  for (const t of Object.values(state.tasks)) if (t.parentId === id) return true;
  return false;
}
