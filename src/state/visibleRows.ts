import type { ProjectState, TaskId, VisibleRow } from '../types';

function childrenOrdered(state: ProjectState, parentId: TaskId | null): TaskId[] {
  if (parentId === null) return [...state.rootOrder];
  const kids = Object.values(state.tasks).filter((t) => t.parentId === parentId);
  kids.sort((a, b) => a.order - b.order);
  return kids.map((k) => k.id);
}

export function computeVisibleRows(state: ProjectState): VisibleRow[] {
  const rows: VisibleRow[] = [];
  let idx = 0;
  const walk = (parentId: TaskId | null, depth: number) => {
    for (const id of childrenOrdered(state, parentId)) {
      const task = state.tasks[id];
      if (!task) continue;
      const kids = childrenOrdered(state, id);
      rows.push({ task, depth, hasChildren: kids.length > 0, index: idx++ });
      if (!task.collapsed) walk(id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}
