export type TaskId = string;

export type Status = 'Not Started' | 'In Progress' | 'Complete';

export type DepType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Dependency {
  predecessorId: TaskId;
  type: DepType;
  lagDays: number;
}

export interface Task {
  id: TaskId;
  name: string;
  assignee?: string;
  status: Status;
  start: string;
  finish: string;
  durationDays: number;
  predecessors: Dependency[];
  parentId: TaskId | null;
  order: number;
  collapsed?: boolean;
  hasError?: boolean;
}

export type ZoomLevel = 'day' | 'week' | 'month';

// A frozen snapshot of a single task's schedule + identity, used for baseline comparison.
export interface BaselineTaskSnapshot {
  name: string;
  start: string;
  finish: string;
  durationDays: number;
  parentId: TaskId | null;
}

// A named, frozen copy of the plan's schedule at a point in time. Tasks are keyed by Task.id
// so a saved baseline can be diffed against the live plan even after tasks are reordered.
export interface Baseline {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  tasks: Record<TaskId, BaselineTaskSnapshot>;
}

export interface ProjectState {
  tasks: Record<TaskId, Task>;
  rootOrder: TaskId[];
  zoom: ZoomLevel;
  baselines?: Baseline[];
  compareBaselineId?: string | null; // which baseline is currently overlaid for comparison
}

export interface NamedProject {
  id: string;
  name: string;
  project: ProjectState;
}

export interface Workspace {
  currentProjectId: string;
  projects: Record<string, NamedProject>;
  projectOrder: string[];
}

export interface VisibleRow {
  task: Task;
  depth: number;
  hasChildren: boolean;
  index: number;
}
