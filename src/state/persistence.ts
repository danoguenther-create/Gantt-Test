import type { NamedProject, ProjectState, Workspace } from '../types';
import { buildSampleProject } from './sampleData';

const KEY_V1 = 'gantt-test:v1';
// v3: Default-Plan auf A4 Printing (Stand 2026-07-20) umgestellt — alte v2-Stände werden verworfen,
// damit der neue Plan frisch geladen wird.
const KEY_V2 = 'gantt-test:v3';
const KEY_LAST_EXPORT = 'gantt-test:lastExport';
const KEY_VIEW = 'gantt-test:view';

export interface ViewPrefs {
  columnWidths?: Record<string, number>;
  wrap?: boolean;
  showDependencies?: boolean;
}

export function loadViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(KEY_VIEW);
    return raw ? (JSON.parse(raw) as ViewPrefs) : {};
  } catch {
    return {};
  }
}

export function saveViewPrefs(prefs: ViewPrefs): void {
  try {
    localStorage.setItem(KEY_VIEW, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function getLastExportedAt(): number | null {
  try {
    const v = localStorage.getItem(KEY_LAST_EXPORT);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function setLastExportedAt(ts: number): void {
  try {
    localStorage.setItem(KEY_LAST_EXPORT, String(ts));
  } catch {
    // ignore
  }
}

function genId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isProjectState(v: unknown): v is ProjectState {
  return !!v && typeof v === 'object' && 'tasks' in (v as object) && 'rootOrder' in (v as object);
}

function isWorkspace(v: unknown): v is Workspace {
  return (
    !!v &&
    typeof v === 'object' &&
    'projects' in (v as object) &&
    'currentProjectId' in (v as object) &&
    'projectOrder' in (v as object)
  );
}

export function createDefaultWorkspace(): Workspace {
  const sample = buildSampleProject();
  const id = genId();
  const named: NamedProject = { id, name: 'Sample Project', project: sample };
  return { currentProjectId: id, projects: { [id]: named }, projectOrder: [id] };
}

function migrateV1(v1: ProjectState): Workspace {
  const id = genId();
  const named: NamedProject = { id, name: 'My Project', project: v1 };
  return { currentProjectId: id, projects: { [id]: named }, projectOrder: [id] };
}

export function loadWorkspaceFromLocalStorage(): Workspace | null {
  try {
    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (isWorkspace(parsed) && parsed.projectOrder.length > 0) return parsed;
    }
    const rawV1 = localStorage.getItem(KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (isProjectState(parsed)) return migrateV1(parsed);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveWorkspaceToLocalStorage(ws: Workspace): void {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(ws));
  } catch {
    // quota exceeded or storage disabled — ignore
  }
}

// Shared export-filename helpers so every export entry point (toolbar, reminder) stays in sync.
export function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'project';
}

export function exportTimestamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function jsonExportFilename(projectName: string): string {
  return `${sanitizeName(projectName)}_${exportTimestamp()}.json`;
}

export function pdfExportFilename(projectName: string, view: boolean): string {
  return `${sanitizeName(projectName)}${view ? '_view' : ''}_${exportTimestamp()}.pdf`;
}

export function exportJson(project: ProjectState, filename = 'gantt-project.json'): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importJsonFromFile(file: File): Promise<ProjectState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isProjectState(parsed)) throw new Error('Invalid file');
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}
