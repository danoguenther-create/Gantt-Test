import { useRef, useState } from 'react';
import { useDispatch, useProject, useSaveMeta, useWorkspace } from '../state/store';
import { exportJson, importJsonFromFile, jsonExportFilename, pdfExportFilename } from '../state/persistence';
import { buildSampleProject } from '../state/sampleData';
import { formatAgo, useNow } from '../state/useNow';
import type { ZoomLevel } from '../types';
import { Menu } from './Menu';

interface Props {
  selectedId: string | null;
  selectedIds: string[];
  wrap: boolean;
  onToggleWrap: () => void;
  showDependencies: boolean;
  onToggleDependencies: () => void;
}

const ZOOMS: ZoomLevel[] = ['day', 'week', 'month'];

export function Toolbar({ selectedId, selectedIds, wrap, onToggleWrap, showDependencies, onToggleDependencies }: Props) {
  const state = useProject();
  const workspace = useWorkspace();
  const dispatch = useDispatch();
  const { lastSavedAt, markExported } = useSaveMeta();
  const now = useNow(15_000);
  const fileInput = useRef<HTMLInputElement>(null);
  const importMode = useRef<'replace' | 'new'>('replace');
  const [pdfExporting, setPdfExporting] = useState(false);

  const currentProject = workspace.projects[workspace.currentProjectId];
  const baselines = state.baselines ?? [];
  const compareBaseline = baselines.find((b) => b.id === state.compareBaselineId) ?? null;

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
    whiteSpace: 'nowrap',
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

  const onSaveBaseline = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const def = `Baseline ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const name = prompt('Name der Baseline?', def);
    if (name === null) return;
    dispatch({ type: 'SAVE_BASELINE', name: name || def });
  };

  const onDeleteBaseline = () => {
    if (!compareBaseline) return;
    if (confirm(`Baseline "${compareBaseline.name}" löschen?`)) {
      dispatch({ type: 'DELETE_BASELINE', id: compareBaseline.id });
    }
  };

  const runPdfExport = async (respectCollapsed: boolean) => {
    setPdfExporting(true);
    try {
      const { exportProjectPdf } = await import('../pdfExport');
      await exportProjectPdf(state, currentProject.name, pdfExportFilename(currentProject.name, respectCollapsed), { respectCollapsed });
    } catch (err) {
      alert(`PDF export failed: ${(err as Error).message}`);
    } finally {
      setPdfExporting(false);
    }
  };

  const downloadPortableHtml = () => {
    const a = document.createElement('a');
    a.href = './portable.html';
    a.download = 'gantt-planner.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const onLoadSample = () => {
    if (confirm(`Replace "${currentProject.name}" with the sample data? Export JSON first if you want to keep it.`)) {
      dispatch({ type: 'REPLACE_STATE', state: buildSampleProject() });
    }
  };

  const divider = <span style={{ width: 1, height: 20, background: '#cbd5e1', margin: '0 4px' }} />;
  const groupLabel: React.CSSProperties = { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 };

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
      {/* Project */}
      <select
        value={currentProject.id}
        onChange={(e) => dispatch({ type: 'SWITCH_PROJECT', id: e.target.value })}
        style={{ ...btn, padding: '4px 6px', minWidth: 150, cursor: 'pointer', fontWeight: 600 }}
        title="Projekt wechseln"
      >
        {workspace.projectOrder.map((id) => (
          <option key={id} value={id}>
            {workspace.projects[id].name}
          </option>
        ))}
      </select>
      <Menu
        label="Projekt"
        title="Projektaktionen"
        items={[
          { label: 'Neues Projekt…', onClick: onNewProject },
          { label: 'Umbenennen…', onClick: onRenameProject },
          'separator',
          { label: 'Projekt löschen', onClick: onDeleteProject, disabled: !canDeleteProject, danger: true },
        ]}
      />

      {divider}

      {/* Row editing */}
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        title="Zeile unterhalb einfügen"
        onClick={() => selectedId && dispatch({ type: 'ADD_TASK_BELOW', id: selectedId })}
      >
        + Zeile
      </button>
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        title={selectedIds.length > 1 ? `${selectedIds.length} Zeilen löschen` : 'Zeile löschen'}
        onClick={() => {
          const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
          if (ids.length === 0) return;
          if (ids.length > 1 && !confirm(`Delete ${ids.length} selected rows (including any sub-tasks)?`)) return;
          for (const id of ids) dispatch({ type: 'DELETE_TASK', id });
        }}
      >
        {selectedIds.length > 1 ? `Löschen (${selectedIds.length})` : 'Löschen'}
      </button>
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        title="Einrücken (Unteraufgabe der vorherigen Zeile)"
        onClick={() => {
          const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
          for (const id of ids) dispatch({ type: 'INDENT', id });
        }}
      >
        →
      </button>
      <button
        style={selectedId ? btn : disabled}
        disabled={!selectedId}
        title="Ausrücken"
        onClick={() => {
          const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
          for (const id of [...ids].reverse()) dispatch({ type: 'OUTDENT', id });
        }}
      >
        ←
      </button>

      {divider}

      {/* Baseline */}
      <Menu
        label="Baseline"
        title="Baseline speichern / löschen"
        items={[
          { label: 'Baseline speichern…', onClick: onSaveBaseline },
          'separator',
          {
            label: compareBaseline ? `„${compareBaseline.name}" löschen` : 'Baseline löschen',
            onClick: onDeleteBaseline,
            disabled: !compareBaseline,
            danger: true,
          },
        ]}
      />
      <select
        value={state.compareBaselineId ?? ''}
        onChange={(e) => dispatch({ type: 'SET_COMPARE_BASELINE', id: e.target.value || null })}
        style={{ ...btn, padding: '4px 6px', minWidth: 130, cursor: 'pointer' }}
        title="Baseline für den Vergleich wählen (Ghost-Bars + Δ-Spalte)"
        disabled={baselines.length === 0}
      >
        <option value="">Vergleich: aus</option>
        {baselines.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <span style={{ flex: 1 }} />

      <span
        title={lastSavedAt ? `Auto-saved ${new Date(lastSavedAt).toLocaleString()}` : 'No auto-save yet'}
        style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '0 4px' }}
      >
        Gespeichert {formatAgo(lastSavedAt, now)}
      </span>

      {divider}

      {/* Zoom (segmented) */}
      <span style={groupLabel}>Zoom</span>
      <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
        {ZOOMS.map((z, i) => (
          <button
            key={z}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid #cbd5e1',
              background: state.zoom === z ? '#2563eb' : '#fff',
              color: state.zoom === z ? '#fff' : '#0f172a',
              cursor: 'pointer',
            }}
            onClick={() => dispatch({ type: 'SET_ZOOM', zoom: z })}
          >
            {z === 'day' ? 'Tag' : z === 'week' ? 'Woche' : 'Monat'}
          </button>
        ))}
      </div>

      {/* View options */}
      <Menu
        label="Ansicht"
        title="Anzeigeoptionen"
        items={[
          { label: 'Zeilenumbruch (Wrap)', onClick: onToggleWrap, checked: wrap },
          { label: 'Abhängigkeiten anzeigen', onClick: onToggleDependencies, checked: showDependencies },
        ]}
      />

      {/* File: import / export */}
      <Menu
        label="Datei"
        title="Import, Export, Beispieldaten"
        items={[
          { label: 'Export als JSON', onClick: () => { exportJson(state, jsonExportFilename(currentProject.name)); markExported(); } },
          { label: pdfExporting ? 'Exportiere…' : 'Export als PDF (alles)', onClick: () => runPdfExport(false), disabled: pdfExporting },
          { label: pdfExporting ? 'Exportiere…' : 'Export als PDF (Ansicht)', onClick: () => runPdfExport(true), disabled: pdfExporting },
          'separator',
          { label: 'Import JSON (ersetzen)…', onClick: () => pickFile('replace') },
          { label: 'Import JSON als neues Projekt…', onClick: () => pickFile('new') },
          'separator',
          { label: 'Beispieldaten laden', onClick: onLoadSample },
          { label: 'Portable HTML herunterladen', onClick: downloadPortableHtml },
        ]}
      />
      <input ref={fileInput} type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
    </div>
  );
}
