import { useRef } from 'react';
import { useDispatch, useProject } from '../state/store';
import { exportJson, importJsonFromFile } from '../state/persistence';
import type { ZoomLevel } from '../types';

interface Props {
  selectedId: string | null;
}

const ZOOMS: ZoomLevel[] = ['day', 'week', 'month'];

export function Toolbar({ selectedId }: Props) {
  const state = useProject();
  const dispatch = useDispatch();
  const fileInput = useRef<HTMLInputElement>(null);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const next = await importJsonFromFile(file);
      dispatch({ type: 'REPLACE_STATE', state: next });
    } catch (err) {
      alert(`Failed to import: ${(err as Error).message}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
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
      }}
    >
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
        Delete
      </button>
      <span style={{ width: 8 }} />
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
      <button style={btn} onClick={() => exportJson(state)}>
        Export JSON
      </button>
      <button style={btn} onClick={() => fileInput.current?.click()}>
        Import JSON
      </button>
      <input ref={fileInput} type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
    </div>
  );
}
