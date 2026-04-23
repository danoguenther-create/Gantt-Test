import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { createElement } from 'react';
import type {
  Dependency,
  NamedProject,
  ProjectState,
  Status,
  Task,
  TaskId,
  Workspace,
  ZoomLevel,
} from '../types';
import { scheduleLeaves } from '../scheduling/schedule';
import { rollupSummaries, hasChildren } from '../scheduling/rollup';
import { addWorkingDays, diffWorkingDays } from '../scheduling/workingDays';
import {
  createDefaultWorkspace,
  loadWorkspaceFromLocalStorage,
  saveWorkspaceToLocalStorage,
} from './persistence';

export type ProjectAction =
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

export type WorkspaceAction =
  | { type: 'CREATE_PROJECT'; name: string; seed?: ProjectState }
  | { type: 'SWITCH_PROJECT'; id: string }
  | { type: 'RENAME_PROJECT'; id: string; name: string }
  | { type: 'DELETE_PROJECT'; id: string };

export type Action = ProjectAction | WorkspaceAction;

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

function nextTaskId(state: ProjectState): string {
  let n = 1;
  while (state.tasks[String(n)]) n++;
  return String(n);
}

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
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
      const id = nextTaskId(state);
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
      const id = nextTaskId(state);
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

function genProjectId(ws: Workspace): string {
  let id: string;
  do {
    id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (ws.projects[id]);
  return id;
}

function workspaceReducer(ws: Workspace, action: Action): Workspace {
  switch (action.type) {
    case 'CREATE_PROJECT': {
      const id = genProjectId(ws);
      const empty: ProjectState = { tasks: {}, rootOrder: [], zoom: 'week' };
      const project = action.seed ? recompute(action.seed) : empty;
      const named: NamedProject = { id, name: action.name || 'Untitled', project };
      return {
        currentProjectId: id,
        projects: { ...ws.projects, [id]: named },
        projectOrder: [...ws.projectOrder, id],
      };
    }
    case 'SWITCH_PROJECT':
      return ws.projects[action.id] ? { ...ws, currentProjectId: action.id } : ws;
    case 'RENAME_PROJECT': {
      const np = ws.projects[action.id];
      if (!np) return ws;
      return { ...ws, projects: { ...ws.projects, [action.id]: { ...np, name: action.name } } };
    }
    case 'DELETE_PROJECT': {
      if (!ws.projects[action.id]) return ws;
      if (ws.projectOrder.length <= 1) return ws;
      const projects = { ...ws.projects };
      delete projects[action.id];
      const projectOrder = ws.projectOrder.filter((x) => x !== action.id);
      const currentProjectId = ws.currentProjectId === action.id ? projectOrder[0] : ws.currentProjectId;
      return { projects, projectOrder, currentProjectId };
    }
    default: {
      const current = ws.projects[ws.currentProjectId];
      if (!current) return ws;
      const nextProject = projectReducer(current.project, action);
      if (nextProject === current.project) return ws;
      return {
        ...ws,
        projects: {
          ...ws.projects,
          [ws.currentProjectId]: { ...current, project: nextProject },
        },
      };
    }
  }
}

const WorkspaceCtx = createContext<Workspace | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [workspace, dispatch] = useReducer(workspaceReducer, null, () => {
    const loaded = loadWorkspaceFromLocalStorage();
    const ws = loaded ?? createDefaultWorkspace();
    const projects = { ...ws.projects };
    for (const id of Object.keys(projects)) {
      projects[id] = { ...projects[id], project: recompute(projects[id].project) };
    }
    return { ...ws, projects };
  });

  useEffect(() => {
    const id = setTimeout(() => saveWorkspaceToLocalStorage(workspace), 250);
    return () => clearTimeout(id);
  }, [workspace]);

  return createElement(
    WorkspaceCtx.Provider,
    { value: workspace },
    createElement(DispatchCtx.Provider, { value: dispatch }, children),
  );
}

export function useWorkspace(): Workspace {
  const w = useContext(WorkspaceCtx);
  if (!w) throw new Error('ProjectProvider missing');
  return w;
}

export function useProject(): ProjectState {
  const ws = useWorkspace();
  return ws.projects[ws.currentProjectId].project;
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error('ProjectProvider missing');
  return d;
}
