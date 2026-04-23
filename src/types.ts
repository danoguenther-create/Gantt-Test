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

export interface ProjectState {
  tasks: Record<TaskId, Task>;
  rootOrder: TaskId[];
  zoom: ZoomLevel;
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
