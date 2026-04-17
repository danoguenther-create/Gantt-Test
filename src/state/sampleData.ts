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

const fs = (id: string, lag = 0) => ({ predecessorId: id, type: 'FS' as const, lagDays: lag });
const ff = (id: string, lag = 0) => ({ predecessorId: id, type: 'FF' as const, lagDays: lag });

export function buildSampleProject(): ProjectState {
  const tasks: Task[] = [
    t({ id: '1', name: 'A4 Printing', parentId: null, order: 0 }),

    t({ id: '2', name: 'Design', parentId: '1', order: 0 }),
    t({ id: '3', name: 'Requirements', parentId: '2', order: 0, assignee: 'Nuno', status: 'In Progress', start: '2026-04-16', finish: '2026-04-17', durationDays: 2 }),
    t({ id: '4', name: 'Two business cases to validate with logistics', parentId: '2', order: 1, assignee: 'Francisco', status: 'In Progress', start: '2026-04-16', finish: '2026-04-17', durationDays: 2 }),
    t({ id: '5', name: 'Sign off contracts with printing vendor(s)', parentId: '2', order: 2, assignee: 'PuC', status: 'In Progress', start: '2026-04-20', finish: '2026-04-20', durationDays: 0 }),
    t({ id: '6', name: 'Solution design document', parentId: '2', order: 3, assignee: 'PuC', status: 'In Progress', start: '2026-04-27', finish: '2026-04-27', durationDays: 0 }),

    t({ id: '7', name: 'Implementation of printing system', parentId: '1', order: 1, assignee: 'PuC', start: '2026-04-27', finish: '2026-05-22', durationDays: 20, predecessors: [fs('6')] }),
    t({ id: '8', name: 'Pull (Stores)', parentId: '7', order: 0, assignee: 'PuC', start: '2026-04-27', finish: '2026-05-22', durationDays: 20 }),
    t({ id: '9', name: 'Push (Warehouse)', parentId: '7', order: 1, assignee: 'PuC', start: '2026-04-27', finish: '2026-05-22', durationDays: 20 }),

    t({ id: '10', name: 'FDD Updates', parentId: '1', order: 2 }),
    t({ id: '11', name: 'VAS FDD update', parentId: '10', order: 0, assignee: 'Francisco', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '12', name: 'Worklist FDD update', parentId: '10', order: 1, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '13', name: 'WMS Config/documentation update', parentId: '10', order: 2, assignee: 'Federico', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '14', name: 'Transportation app FDD update', parentId: '10', order: 3, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '15', name: 'OG Sales FDD', parentId: '10', order: 4, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '16', name: 'Tailoring FDD', parentId: '10', order: 5, assignee: 'Pedro', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '17', name: 'Integration FDD', parentId: '10', order: 6, assignee: 'Antonio', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '18', name: 'Return Authorization FDD', parentId: '10', order: 7, assignee: 'Jan', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),
    t({ id: '19', name: 'NFT Dashboard (Depending on use cases)', parentId: '10', order: 8, assignee: 'Francisco', durationDays: 5, start: '2026-04-27', finish: '2026-05-01', predecessors: [fs('6')] }),

    t({ id: '20', name: 'Approvals', parentId: '1', order: 3 }),
    t({ id: '21', name: 'VAS FDD approval', parentId: '20', order: 0, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('11')] }),
    t({ id: '22', name: 'Worklist FDD approval', parentId: '20', order: 1, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('12')] }),
    t({ id: '23', name: 'WMS Config/documentation approval', parentId: '20', order: 2, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('13')] }),
    t({ id: '24', name: 'Transportation app FDD approval', parentId: '20', order: 3, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('14')] }),
    t({ id: '25', name: 'OG Sales FDD approval', parentId: '20', order: 4, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('15')] }),
    t({ id: '26', name: 'Tailoring FDD approval', parentId: '20', order: 5, assignee: 'PuC', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('16')] }),
    t({ id: '27', name: 'Integration approval', parentId: '20', order: 6, assignee: 'Antonio', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('17'), fs('5')] }),
    t({ id: '28', name: 'Return Authorization approval', parentId: '20', order: 7, assignee: 'Jan', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('18')] }),
    t({ id: '29', name: 'NFT Dashboard (Depending on use cases)', parentId: '20', order: 8, assignee: 'Francisco', durationDays: 5, start: '2026-05-04', finish: '2026-05-08', predecessors: [fs('19')] }),

    t({ id: '30', name: 'Estimations', parentId: '1', order: 4 }),
    t({ id: '31', name: 'VAS FDD estimation', parentId: '30', order: 0, assignee: 'RDT', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('21')] }),
    t({ id: '32', name: 'Worklist FDD estimation', parentId: '30', order: 1, assignee: 'RDT', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('22')] }),
    t({ id: '33', name: 'WMS Config/documentation estimation', parentId: '30', order: 2, assignee: 'Federico', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('23')] }),
    t({ id: '34', name: 'Transportation app FDD estimation', parentId: '30', order: 3, assignee: 'RDT', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('24')] }),
    t({ id: '35', name: 'OG Sales FDD estimation', parentId: '30', order: 4, assignee: 'RDT', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('25')] }),
    t({ id: '36', name: 'Tailoring FDD estimation', parentId: '30', order: 5, assignee: 'RDT', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('26')] }),
    t({ id: '37', name: 'Integration estimation', parentId: '30', order: 6, assignee: 'Antonio', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('27'), fs('5')] }),
    t({ id: '38', name: 'Return Authorization estimation', parentId: '30', order: 7, assignee: 'Jan', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('28')] }),
    t({ id: '39', name: 'NFT Dashboard (Depending on use cases)', parentId: '30', order: 8, assignee: 'Francisco', durationDays: 5, start: '2026-05-11', finish: '2026-05-15', predecessors: [fs('29')] }),

    t({ id: '40', name: 'Build & UT', parentId: '1', order: 5 }),
    t({ id: '41', name: 'Build', parentId: '40', order: 0, durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [ff('7')] }),
    t({ id: '42', name: 'VAS', parentId: '41', order: 0, assignee: 'RDT', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('31')] }),
    t({ id: '43', name: 'Worklist', parentId: '41', order: 1, assignee: 'RDT', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('32')] }),
    t({ id: '44', name: 'WMS', parentId: '41', order: 2, assignee: 'Federico', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('33')] }),
    t({ id: '45', name: 'Transportation', parentId: '41', order: 3, assignee: 'RDT', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('34')] }),
    t({ id: '46', name: 'OG Sales', parentId: '41', order: 4, assignee: 'RDT', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('35')] }),
    t({ id: '47', name: 'Tailoring', parentId: '41', order: 5, assignee: 'RDT', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('36')] }),
    t({ id: '48', name: 'Integration', parentId: '41', order: 6, assignee: 'Antonio', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('37')] }),
    t({ id: '49', name: 'Return Authorization', parentId: '41', order: 7, assignee: 'Jan', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('38')] }),
    t({ id: '50', name: 'NFT Dashboard (Depending on use cases)', parentId: '41', order: 8, assignee: 'Francisco', durationDays: 10, start: '2026-05-18', finish: '2026-05-29', predecessors: [fs('39')] }),

    t({ id: '51', name: 'Unit Test', parentId: '40', order: 1, durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('41')] }),
    t({ id: '52', name: 'VAS', parentId: '51', order: 0, assignee: 'RDT', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('42')] }),
    t({ id: '53', name: 'Worklist', parentId: '51', order: 1, assignee: 'RDT', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('43')] }),
    t({ id: '54', name: 'WMS', parentId: '51', order: 2, assignee: 'Federico', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('44')] }),
    t({ id: '55', name: 'Transportation', parentId: '51', order: 3, assignee: 'RDT', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('45')] }),
    t({ id: '56', name: 'OG Sales', parentId: '51', order: 4, assignee: 'RDT', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('46')] }),
    t({ id: '57', name: 'Tailoring', parentId: '51', order: 5, assignee: 'RDT', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('47')] }),
    t({ id: '58', name: 'Integration estimation', parentId: '51', order: 6, assignee: 'Antonio', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('48')] }),
    t({ id: '59', name: 'Return Authorization estimation', parentId: '51', order: 7, assignee: 'Jan', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('49')] }),
    t({ id: '60', name: 'NFT Dashboard (Depending on use cases)', parentId: '51', order: 8, assignee: 'Francisco', durationDays: 5, start: '2026-06-01', finish: '2026-06-05', predecessors: [fs('50')] }),
  ];

  const byId: Record<string, Task> = {};
  for (const task of tasks) byId[task.id] = task;
  const rootOrder = tasks.filter((x) => x.parentId === null).sort((a, b) => a.order - b.order).map((x) => x.id);

  return { tasks: byId, rootOrder, zoom: 'week' };
}
