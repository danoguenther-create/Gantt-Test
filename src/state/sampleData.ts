import type { ProjectState, Task } from '../types';

function t(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    status: 'Not Started',
    start: '2026-04-20',
    finish: '2026-04-20',
    durationDays: 1,
    predecessors: [],
    parentId: null,
    order: 0,
    ...partial,
  } as Task;
}

export function buildSampleProject(): ProjectState {
  const tasks: Task[] = [
    t({ id: '1', name: 'A4 Printing', parentId: null, order: 0 }),
    t({ id: '2', name: 'Design', parentId: '1', order: 0 }),
    t({ id: '3', name: 'Requirements', parentId: '2', order: 0, assignee: 'Nuno', status: 'In Progress', start: '2026-04-16', finish: '2026-04-17', durationDays: 2 }),
    t({ id: '4', name: 'Two business cases to validate with logistics', parentId: '2', order: 1, assignee: 'Francisco', status: 'In Progress', start: '2026-04-16', finish: '2026-04-17', durationDays: 2 }),
    t({ id: '5', name: 'Sign off contracts with printing vendor(s)', parentId: '2', order: 2, assignee: 'PuC', status: 'In Progress', start: '2026-04-20', finish: '2026-04-20', durationDays: 0 }),
    t({ id: '6', name: 'Solution design document', parentId: '2', order: 3, assignee: 'PuC', status: 'In Progress', start: '2026-04-27', finish: '2026-04-27', durationDays: 0 }),
    t({ id: '7', name: 'Implementation of printing system', parentId: '1', order: 1, assignee: 'PuC', start: '2026-04-27', finish: '2026-05-22', durationDays: 20, predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '8', name: 'Pull (Stores)', parentId: '7', order: 0, assignee: 'PuC', start: '2026-04-27', finish: '2026-05-22', durationDays: 20 }),
    t({ id: '9', name: 'Push (Warehouse)', parentId: '7', order: 1, assignee: 'PuC', start: '2026-04-27', finish: '2026-05-22', durationDays: 20 }),
    t({ id: '10', name: 'FDD Updates', parentId: '1', order: 2, start: '2026-04-27', finish: '2026-05-01', durationDays: 5 }),
    t({ id: '11', name: 'VAS FDD update', parentId: '10', order: 0, assignee: 'Francisco', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '12', name: 'Worklist FDD update', parentId: '10', order: 1, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '13', name: 'WMS Config/documentation update', parentId: '10', order: 2, assignee: 'Federico', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '14', name: 'Transportation app FDD update', parentId: '10', order: 3, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '15', name: 'OG Sales FDD', parentId: '10', order: 4, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '16', name: 'Tailoring FDD', parentId: '10', order: 5, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '17', name: 'Integration FDD', parentId: '10', order: 6, assignee: 'Antonio', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '18', name: 'Return Authorization FDD', parentId: '10', order: 7, assignee: 'Jan', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '19', name: 'NFT Dashboard (Depending on use cases)', parentId: '10', order: 8, assignee: 'Francisco', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [{ predecessorId: '6', type: 'FS', lagDays: 0 }] }),
    t({ id: '20', name: 'Approvals', parentId: '1', order: 3, durationDays: 5, start: '2026-05-04', finish: '2026-05-08' }),
    t({ id: '21', name: 'VAS FDD approval', parentId: '20', order: 0, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [{ predecessorId: '11', type: 'FS', lagDays: 0 }] }),
    t({ id: '22', name: 'Worklist FDD approval', parentId: '20', order: 1, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [{ predecessorId: '12', type: 'FS', lagDays: 0 }] }),
    t({ id: '30', name: 'Build & UT', parentId: '1', order: 4, durationDays: 15, start: '2026-05-18', finish: '2026-06-05' }),
    t({ id: '31', name: 'Build', parentId: '30', order: 0, durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [{ predecessorId: '21', type: 'FF', lagDays: 0 }] }),
    t({ id: '32', name: 'Unit Test', parentId: '30', order: 1, durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [{ predecessorId: '31', type: 'FS', lagDays: 0 }] }),
  ];

  const byId: Record<string, Task> = {};
  for (const task of tasks) byId[task.id] = task;
  const rootOrder = tasks.filter((x) => x.parentId === null).sort((a, b) => a.order - b.order).map((x) => x.id);

  return { tasks: byId, rootOrder, zoom: 'week' };
}
