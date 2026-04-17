import type { ProjectState, Task, TaskId } from '../types';
import { addWorkingDays, parseISO, toISO, nextWorkingDay } from './workingDays';

function isSummary(state: ProjectState, id: TaskId): boolean {
  for (const t of Object.values(state.tasks)) if (t.parentId === id) return true;
  return false;
}

function topoSort(tasks: Task[]): { order: TaskId[]; cycleIds: Set<TaskId> } {
  const ids = new Set(tasks.map((t) => t.id));
  const indeg = new Map<TaskId, number>();
  const edges = new Map<TaskId, TaskId[]>();
  for (const t of tasks) {
    indeg.set(t.id, 0);
    edges.set(t.id, []);
  }
  for (const t of tasks) {
    for (const d of t.predecessors) {
      if (!ids.has(d.predecessorId)) continue;
      edges.get(d.predecessorId)!.push(t.id);
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1);
    }
  }
  const queue: TaskId[] = [];
  indeg.forEach((v, k) => {
    if (v === 0) queue.push(k);
  });
  const order: TaskId[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const nxt of edges.get(id) ?? []) {
      indeg.set(nxt, indeg.get(nxt)! - 1);
      if (indeg.get(nxt) === 0) queue.push(nxt);
    }
  }
  const cycleIds = new Set<TaskId>();
  if (order.length !== tasks.length) {
    for (const id of ids) if (!order.includes(id)) cycleIds.add(id);
  }
  return { order, cycleIds };
}

function computeFinishFromStart(startISO: string, duration: number): string {
  if (duration <= 0) return startISO;
  return addWorkingDays(startISO, duration - 1);
}

function computeStartFromFinish(finishISO: string, duration: number): string {
  if (duration <= 0) return finishISO;
  return addWorkingDays(finishISO, -(duration - 1));
}

export function scheduleLeaves(state: ProjectState): ProjectState {
  const leaves = Object.values(state.tasks).filter((t) => !isSummary(state, t.id));
  const { order, cycleIds } = topoSort(leaves);
  const tasks: Record<TaskId, Task> = { ...state.tasks };

  for (const id of Object.keys(tasks)) {
    tasks[id] = { ...tasks[id], hasError: cycleIds.has(id) };
  }

  for (const id of order) {
    const t = { ...tasks[id] };
    if (t.predecessors.length === 0) {
      const normStart = toISO(nextWorkingDay(parseISO(t.start)));
      t.start = normStart;
      t.finish = computeFinishFromStart(t.start, t.durationDays);
      tasks[id] = t;
      continue;
    }
    let earliestStart: string | null = null;
    let forcedFinish: string | null = null;
    for (const dep of t.predecessors) {
      const pred = tasks[dep.predecessorId];
      if (!pred) continue;
      switch (dep.type) {
        case 'FS': {
          const s = addWorkingDays(pred.finish, 1 + dep.lagDays);
          if (!earliestStart || s > earliestStart) earliestStart = s;
          break;
        }
        case 'SS': {
          const s = addWorkingDays(pred.start, dep.lagDays);
          if (!earliestStart || s > earliestStart) earliestStart = s;
          break;
        }
        case 'FF': {
          const f = addWorkingDays(pred.finish, dep.lagDays);
          if (!forcedFinish || f > forcedFinish) forcedFinish = f;
          break;
        }
        case 'SF': {
          const f = addWorkingDays(pred.start, dep.lagDays);
          if (!forcedFinish || f > forcedFinish) forcedFinish = f;
          break;
        }
      }
    }
    if (forcedFinish && (!earliestStart || computeStartFromFinish(forcedFinish, t.durationDays) > earliestStart)) {
      t.finish = forcedFinish;
      t.start = computeStartFromFinish(forcedFinish, t.durationDays);
    } else if (earliestStart) {
      t.start = earliestStart;
      t.finish = computeFinishFromStart(t.start, t.durationDays);
    }
    tasks[id] = t;
  }

  return { ...state, tasks };
}
