import { useRef, useState } from 'react';
import { useDispatch, useProject, useSaveMeta, useWorkspace } from '../state/store';
import { exportJson, importJsonFromFile } from '../state/persistence';
import { buildSampleProject } from '../state/sampleData';
import { formatAgo, useNow } from '../state/useNow';
import type { ZoomLevel } from '../types';

interface Props {
  selectedId: string | null;
}

const ZOOMS: ZoomLevel[] = ['day', 'week', 'month'];

export function Toolbar({ selectedId }: Props) {
  const state = useProject();
  const workspace = useWorkspace();
  const dispatch = useDispatch();
  const { lastSavedAt, markExported } = useSaveMeta();
  const now = useNow(15_000);
  const fileInput = useRef<HTMLInputElement>(null);
  const importMode = useRef<'replace' | 'new'>('replace');
  const [pdfExporting, setPdfExporting] = useState(false);

  const currentProject = workspace.projects[workspace.currentProjectId];

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = importMode.current;
    try {
      const next = await importJsonFromFile(file);
      if (mode === 'new') {
        const name = prompt('Name for the imported project?', file.name.replace(/\.json$/i, ''));
        if (name === null) return;
        dispatch({ type: 'CREATE_PROJECT', name: name || 'Imported', seed: next });
      } else {
        dispatch({ type: 'REPLACE_STATE', state: next });
      }
    } catch (err) {
      alert(`Failed to import: ${(err as Error).message}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const pickFile = (mode: 'replace' | 'new') => {
    importMode.current = mode;
    fileInput.current?.click();
  };

  const btn: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
  };
  const disabled: React.CSSProperties = { ...btn, opacity: 0.4, cursor: 'not-allowed' };

  const canDeleteProject = workspace.projectOrder.length > 1;

  const onNewProject = () => {
    const name = prompt('Name for the new project?', 'New Project');
    if (name === null) return;
    dispatch({ type: 'CREATE_PROJECT', name: name || 'Untitled' });
  };

  const onRenameProject = () => {
    const name = prompt('Rename project to:', currentProject.name);
    if (name === null) return;
    dispatch({ type: 'RENAME_PROJECT', id: currentProject.id, name: name || 'Untitled' });
  };

  const onDeleteProject = () => {
    if (!canDeleteProject) return;
    if (confirm(`Delete project "${currentProject.name}"? This cannot be undone.`)) {
      dispatch({ type: 'DELETE_PROJECT', id: currentProject.id });
    }
  };

  const safeName = currentProject.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'project';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: '#f1f5f9',
        borderBottom: '1px solid #cbd5e1',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Project</span>
      <select
        value={currentProject.id}
        onChange={(e) => dispatch({ type: 'SWITCH_PROJECT', id: e.target.value })}
        style={{ ...btn, padding: '3px 6px', minWidth: 140, cursor: 'pointer' }}
        title="Switch to another project"
      >
        {workspace.projectOrder.map((id) => {
          const p = workspace.projects[id];
          return (
            <option key={id} value={id}>
              {p.name}
            </option>
          );
        })}
      </select>
      <button style={btn} onClick={onNewProject} title="Create a new empty project">
        + New
      </button>
      <button style={btn} onClick={onRenameProject} title="Rename the current project">
        Rename
      </button>
      <button
        style={canDeleteProject ? btn : disabled}
        disabled={!canDeleteProject}
        onClick={onDeleteProject}
        title={canDeleteProject ? 'Delete the current project' : 'Cannot delete the last remaining project'}
      >
        Delete
      </button>

      <span style={{ width: 1, height: 20, background: '#cbd5e1', margin: '0 6px' }} />

      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        onClick={() => selectedId && dispatch({ type: 'ADD_TASK_BELOW', id: selectedId })}
      >
        + Row
      </button>
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        onClick={() => selectedId && dispatch({ type: 'DELETE_TASK', id: selectedId })}
      >
        Delete Row
      </button>
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        title="Indent (make child of previous sibling)"
        onClick={() => selectedId && dispatch({ type: 'INDENT', id: selectedId })}
      >
        → Indent
      </button>
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        title="Outdent"
        onClick={() => selectedId && dispatch({ type: 'OUTDENT', id: selectedId })}
      >
        ← Outdent
      </button>

      <span style={{ flex: 1 }} />

      <span
        title={lastSavedAt ? `Auto-saved to browser storage ${new Date(lastSavedAt).toLocaleString()}` : 'No auto-save yet'}
        style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '0 6px' }}
      >
        Saved {formatAgo(lastSavedAt, now)}
      </span>

      <span style={{ fontSize: 12, color: '#475569' }}>Zoom</span>
      {ZOOMS.map((z) => (
        <button
          key={z}
          style={{ ...btn, background: state.zoom === z ? '#2563eb' : '#fff', color: state.zoom === z ? '#fff' : '#0f172a' }}
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: z })}
        >
          {z[0].toUpperCase() + z.slice(1)}
        </button>
      ))}

      <span style={{ width: 8 }} />
      <button
        style={btn}
        title="Replace the current project with the demo sample data"
        onClick={() => {
          if (confirm(`Replace "${currentProject.name}" with the sample data? Export JSON first if you want to keep it.`)) {
            dispatch({ type: 'REPLACE_STATE', state: buildSampleProject() });
          }
        }}
      >
        Load Sample
      </button>
      <button
        style={btn}
        onClick={() => {
          exportJson(state, `${safeName}.json`);
          markExported();
        }}
        title="Download the current project as JSON"
      >
        Export JSON
      </button>
      <button
        style={pdfExporting ? disabled : btn}
        disabled={pdfExporting}
        onClick={async () => {
          setPdfExporting(true);
          try {
            const { exportProjectPdf } = await import('../pdfExport');
            await exportProjectPdf(state, currentProject.name, `${safeName}.pdf`);
          } catch (err) {
            alert(`PDF export failed: ${(err as Error).message}`);
          } finally {
            setPdfExporting(false);
          }
        }}
        title="Export the entire Gantt chart as a one-page PDF (page size adjusts to fit)"
      >
        {pdfExporting ? 'Exporting…' : 'Export PDF'}
      </button>
      <button style={btn} onClick={() => pickFile('replace')} title="Replace current project with a JSON file">
        Import JSON
      </button>
      <button style={btn} onClick={() => pickFile('new')} title="Import JSON as a new project">
        Import as New
      </button>
      <input ref={fileInput} type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
      <a
        href="./portable.html"
        download="gantt-planner.html"
        style={{ ...btn, textDecoration: 'none', color: '#0f172a', display: 'inline-flex', alignItems: 'center' }}
        title="Download a single-file version of this app you can open offline by double-clicking"
      >
        Download portable HTML
      </a>
    </div>
  );
}
