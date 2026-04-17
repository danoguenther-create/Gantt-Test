import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { createElement } from 'react';
import type { ProjectState, Task, TaskId, ZoomLevel, Status, Dependency } from '../types';
import { scheduleLeaves } from '../scheduling/schedule';
import { rollupSummaries, hasChildren } from '../scheduling/rollup';
import { addWorkingDays, diffWorkingDays } from '../scheduling/workingDays';
import { loadFromLocalStorage, saveToLocalStorage } from './persistence';
import { buildSampleProject } from './sampleData';

export type Action =
  | { type: 'UPDATE_TASK'; id: TaskId; patch: Partial<Task> }
  | { type: 'UPDATE_DURATION'; id: TaskId; durationDays: number }
  | { type: 'UPDATE_START'; id: TaskId; start: string }
  | { type: 'UPDATE_FINISH'; id: TaskId; finish: string }
  | { type: 'UPDATE_PREDECESSORS'; id: TaskId; deps: Dependency[] }
  | { type: 'MOVE_TASK_DAYS'; id: TaskId; deltaWorkingDays: number }
  | { type: 'RESIZE_TASK_DAYS'; id: TaskId; deltaWorkingDays: number; edge: 'start' | 'finish' }
  | { type: 'SET_STATUS'; id: TaskId; status: Status }
  | { type: 'ADD_TASK_BELOW'; id: TaskId }
  | { type: 'ADD_TASK_AT_END' }
  | { type: 'DELETE_TASK'; id: TaskId }
  | { type: 'INDENT'; id: TaskId }
  | { type: 'OUTDENT'; id: TaskId }
  | { type: 'TOGGLE_COLLAPSE'; id: TaskId }
  | { type: 'SET_ZOOM'; zoom: ZoomLevel }
  | { type: 'REPLACE_STATE'; state: ProjectState };

function recompute(state: ProjectState): ProjectState {
  return rollupSummaries(scheduleLeaves(state));
}

function siblingOrderMax(state: ProjectState, parentId: TaskId | null): number {
  let m = -1;
  for (const t of Object.values(state.tasks)) {
    if (t.parentId === parentId && t.order > m) m = t.order;
  }
  return m;
}

function nextId(state: ProjectState): string {
  let n = 1;
  while (state.tasks[String(n)]) n++;
  return String(n);
}

function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case 'UPDATE_TASK': {
      const t = state.tasks[action.id];
      if (!t) return state;
      return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, ...action.patch } } });
    }
    case 'UPDATE_DURATION': {
      const t = state.tasks[action.id];
      if (!t) return state;
      const dur = Math.max(0, Math.floor(action.durationDays));
      const finish = dur === 0 ? t.start : addWorkingDays(t.start, dur - 1);
      return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, durationDays: dur, finish } } });
    }
    case 'UPDATE_START': {
      const t = state.tasks[action.id];
      if (!t) return state;
      const finish = t.durationDays === 0 ? action.start : addWorkingDays(action.start, t.durationDays - 1);
      return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, start: action.start, finish } } });
    }
    case 'UPDATE_FINISH': {
      const t = state.tasks[action.id];
      if (!t) return state;
      const d = Math.max(diffWorkingDays(t.start, action.finish), 0);
      return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, finish: action.finish, durationDays: d } } });
    }
    case 'UPDATE_PREDECESSORS': {
      const t = state.tasks[action.id];
      if (!t) return state;
      return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, predecessors: action.deps } } });
    }
    case 'MOVE_TASK_DAYS': {
      const t = state.tasks[action.id];
      if (!t) return state;
      const newStart = addWorkingDays(t.start, action.deltaWorkingDays);
      const newFinish = t.durationDays === 0 ? newStart : addWorkingDays(newStart, t.durationDays - 1);
      return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, start: newStart, finish: newFinish } } });
    }
    case 'RESIZE_TASK_DAYS': {
      const t = state.tasks[action.id];
      if (!t) return state;
      if (action.edge === 'finish') {
        const newFinish = addWorkingDays(t.finish, action.deltaWorkingDays);
        const dur = Math.max(diffWorkingDays(t.start, newFinish), 0);
        return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, finish: newFinish, durationDays: dur } } });
      } else {
        const newStart = addWorkingDays(t.start, action.deltaWorkingDays);
        const dur = Math.max(diffWorkingDays(newStart, t.finish), 0);
        return recompute({ ...state, tasks: { ...state.tasks, [action.id]: { ...t, start: newStart, durationDays: dur } } });
      }
    }
    case 'SET_STATUS': {
      const t = state.tasks[action.id];
      if (!t) return state;
      return { ...state, tasks: { ...state.tasks, [action.id]: { ...t, status: action.status } } };
    }
    case 'ADD_TASK_BELOW': {
      const anchor = state.tasks[action.id];
      const parentId = anchor ? anchor.parentId : null;
      const id = nextId(state);
      const order = (anchor ? anchor.order : siblingOrderMax(state, null)) + 0.5;
      const newTask: Task = {
        id,
        name: 'New Task',
        status: 'Not Started',
        start: anchor ? anchor.finish : '2026-04-20',
        finish: anchor ? anchor.finish : '2026-04-20',
        durationDays: 1,
        predecessors: [],
        parentId,
        order,
      };
      const tasks = { ...state.tasks, [id]: newTask };
      const siblings = Object.values(tasks).filter((x) => x.parentId === parentId).sort((a, b) => a.order - b.order);
      siblings.forEach((s, i) => (tasks[s.id] = { ...tasks[s.id], order: i }));
      const rootOrder = parentId === null ? siblings.map((s) => s.id) : state.rootOrder;
      return recompute({ ...state, tasks, rootOrder });
    }
    case 'ADD_TASK_AT_END': {
      const id = nextId(state);
      const maxOrder = siblingOrderMax(state, null);
      const finishes = Object.values(state.tasks).map((t) => t.finish).sort();
      const latestFinish = finishes[finishes.length - 1];
      const today = new Date();
      const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const start = latestFinish ? addWorkingDays(latestFinish, 1) : todayISO;
      const newTask: Task = {
        id,
        name: 'New Task',
        status: 'Not Started',
        start,
        finish: start,
        durationDays: 1,
        predecessors: [],
        parentId: null,
        order: maxOrder + 1,
      };
      const tasks = { ...state.tasks, [id]: newTask };
      const rootOrder = [...state.rootOrder, id];
      return recompute({ ...state, tasks, rootOrder });
    }
    case 'DELETE_TASK': {
      const toDelete = new Set<TaskId>();
      const walk = (id: TaskId) => {
        toDelete.add(id);
        for (const t of Object.values(state.tasks)) if (t.parentId === id) walk(t.id);
      };
      walk(action.id);
      const tasks: Record<TaskId, Task> = {};
      for (const [id, t] of Object.entries(state.tasks)) if (!toDelete.has(id)) tasks[id] = { ...t };
      for (const t of Object.values(tasks)) {
        t.predecessors = t.predecessors.filter((d) => !toDelete.has(d.predecessorId));
      }
      const rootOrder = state.rootOrder.filter((id) => !toDelete.has(id));
      return recompute({ ...state, tasks, rootOrder });
    }
    case 'INDENT': {
      const t = state.tasks[action.id];
      if (!t) return state;
      const siblings = Object.values(state.tasks).filter((x) => x.parentId === t.parentId).sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((s) => s.id === t.id);
      if (idx <= 0) return state;
      const newParent = siblings[idx - 1];
      const newOrder = siblingOrderMax(state, newParent.id) + 1;
      const tasks = { ...state.tasks, [t.id]: { ...t, parentId: newParent.id, order: newOrder } };
      let rootOrder = state.rootOrder;
      if (t.parentId === null) rootOrder = rootOrder.filter((id) => id !== t.id);
      return recompute({ ...state, tasks, rootOrder });
    }
    case 'OUTDENT': {
      const t = state.tasks[action.id];
      if (!t || t.parentId === null) return state;
      const parent = state.tasks[t.parentId];
      const grandparentId = parent.parentId;
      const newOrder = parent.order + 0.5;
      const tasks = { ...state.tasks, [t.id]: { ...t, parentId: grandparentId, order: newOrder } };
      const siblings = Object.values(tasks).filter((x) => x.parentId === grandparentId).sort((a, b) => a.order - b.order);
      siblings.forEach((s, i) => (tasks[s.id] = { ...tasks[s.id], order: i }));
      let rootOrder = state.rootOrder;
      if (grandparentId === null) rootOrder = siblings.map((s) => s.id);
      return recompute({ ...state, tasks, rootOrder });
    }
    case 'TOGGLE_COLLAPSE': {
      const t = state.tasks[action.id];
      if (!t || !hasChildren(state, t.id)) return state;
      return { ...state, tasks: { ...state.tasks, [action.id]: { ...t, collapsed: !t.collapsed } } };
    }
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };
    case 'REPLACE_STATE':
      return recompute(action.state);
    default:
      return state;
  }
}

const StateCtx = createContext<ProjectState | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const loaded = loadFromLocalStorage();
    return recompute(loaded ?? buildSampleProject());
  });

  useEffect(() => {
    const id = setTimeout(() => saveToLocalStorage(state), 250);
    return () => clearTimeout(id);
  }, [state]);

  return createElement(
    StateCtx.Provider,
    { value: state },
    createElement(DispatchCtx.Provider, { value: dispatch }, children),
  );
}

export function useProject(): ProjectState {
  const s = useContext(StateCtx);
  if (!s) throw new Error('ProjectProvider missing');
  return s;
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error('ProjectProvider missing');
  return d;
}
