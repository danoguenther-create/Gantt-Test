import type { ProjectState } from '../types';

const KEY = 'gantt-test:v1';

export function loadFromLocalStorage(): ProjectState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectState;
    if (!parsed.tasks || !parsed.rootOrder) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(state: ProjectState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or storage disabled — ignore
  }
}

export function exportJson(state: ProjectState, filename = 'gantt-project.json'): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
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
        const parsed = JSON.parse(String(reader.result)) as ProjectState;
        if (!parsed.tasks || !parsed.rootOrder) throw new Error('Invalid file');
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}
