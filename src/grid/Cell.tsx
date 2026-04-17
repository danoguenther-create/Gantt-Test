import { useEffect, useRef, useState } from 'react';
import type { Task, Status } from '../types';
import { useDispatch } from '../state/store';
import { parsePredecessors, formatPredecessors } from '../scheduling/predecessors';
import type { ColumnId } from './columns';

interface Props {
  task: Task;
  column: ColumnId;
  width: number;
  depth: number;
  hasChildren: boolean;
  selected: boolean;
  onSelect: () => void;
}

const STATUSES: Status[] = ['Not Started', 'In Progress', 'Complete'];

function prettyDuration(days: number): string {
  return `${days}d`;
}

function parseDuration(text: string): number | null {
  const m = /^\s*(\d+)\s*d?\s*$/i.exec(text);
  if (!m) return null;
  return Number(m[1]);
}

export function Cell({ task, column, width, depth, hasChildren, selected, onSelect }: Props) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select();
    }
  }, [editing]);

  const commitText = (raw: string) => {
    setEditing(false);
    if (column === 'name' && raw !== task.name) dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { name: raw } });
    else if (column === 'assignee' && raw !== (task.assignee ?? '')) dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { assignee: raw } });
    else if (column === 'duration') {
      const d = parseDuration(raw);
      if (d !== null && d !== task.durationDays) dispatch({ type: 'UPDATE_DURATION', id: task.id, durationDays: d });
    } else if (column === 'start' && raw && raw !== task.start) {
      dispatch({ type: 'UPDATE_START', id: task.id, start: raw });
    } else if (column === 'finish' && raw && raw !== task.finish) {
      dispatch({ type: 'UPDATE_FINISH', id: task.id, finish: raw });
    } else if (column === 'predecessors') {
      const deps = parsePredecessors(raw);
      dispatch({ type: 'UPDATE_PREDECESSORS', id: task.id, deps });
    }
  };

  const baseStyle: React.CSSProperties = {
    width,
    minWidth: width,
    height: '100%',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    borderRight: '1px solid #e5e7eb',
    background: selected ? '#e0f2fe' : undefined,
    cursor: 'cell',
    fontSize: 12,
    color: task.hasError ? '#b91c1c' : undefined,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  const onDblClick = () => {
    if (column !== 'status') setEditing(true);
  };

  if (column === 'name') {
    const indent = depth * 16;
    return (
      <div style={baseStyle} onClick={onSelect} onDoubleClick={onDblClick}>
        <div style={{ width: indent, flexShrink: 0 }} />
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'TOGGLE_COLLAPSE', id: task.id });
            }}
            style={{ width: 14, cursor: 'pointer', userSelect: 'none', color: '#6b7280' }}
          >
            {task.collapsed ? '▸' : '▾'}
          </span>
        ) : (
          <span style={{ width: 14 }} />
        )}
        {editing ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            defaultValue={task.name}
            onBlur={(e) => commitText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              else if (e.key === 'Escape') setEditing(false);
            }}
            style={{ flex: 1, border: 'none', outline: '1px solid #2563eb', padding: '2px 4px', fontSize: 12 }}
          />
        ) : (
          <span style={{ flex: 1, fontWeight: hasChildren ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.name}
          </span>
        )}
      </div>
    );
  }

  if (column === 'status') {
    return (
      <div style={baseStyle} onClick={onSelect}>
        <select
          value={task.status}
          onChange={(e) => dispatch({ type: 'SET_STATUS', id: task.id, status: e.target.value as Status })}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12, outline: 'none', color: 'inherit' }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const value = (() => {
    switch (column) {
      case 'assignee':
        return task.assignee ?? '';
      case 'start':
        return task.start;
      case 'finish':
        return task.finish;
      case 'duration':
        return prettyDuration(task.durationDays);
      case 'predecessors':
        return formatPredecessors(task.predecessors);
    }
    return '';
  })();

  if (editing) {
    const inputType = column === 'start' || column === 'finish' ? 'date' : 'text';
    return (
      <div style={baseStyle}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={inputType}
          defaultValue={value}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            else if (e.key === 'Escape') setEditing(false);
          }}
          style={{ flex: 1, border: 'none', outline: '1px solid #2563eb', padding: '2px 4px', fontSize: 12 }}
        />
      </div>
    );
  }

  return (
    <div style={baseStyle} onClick={onSelect} onDoubleClick={onDblClick}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  );
}
