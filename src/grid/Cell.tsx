import { useEffect, useRef, useState } from 'react';
import type { Task, Status } from '../types';
import { useDispatch } from '../state/store';
import { parsePredecessors, formatPredecessors } from '../scheduling/predecessors';
import type { ColumnId } from './columns';

export type NavDirection = 'left' | 'right' | 'up' | 'down';

interface Props {
  task: Task;
  column: ColumnId;
  colIdx: number;
  width: number;
  depth: number;
  hasChildren: boolean;
  selected: boolean;
  active: boolean;
  autoEdit: boolean;
  onActivate: (colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onEditStarted: () => void;
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

function isPrintableKey(e: React.KeyboardEvent): boolean {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}

export function Cell({
  task,
  column,
  colIdx,
  width,
  depth,
  hasChildren,
  selected,
  active,
  autoEdit,
  onActivate,
  onNavigate,
  onEditStarted,
}: Props) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [initialEditValue, setInitialEditValue] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue === null) inputRef.current.select();
    }
  }, [editing, initialEditValue]);

  useEffect(() => {
    if (active && !editing && cellRef.current) {
      cellRef.current.focus();
      cellRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [active, editing]);

  useEffect(() => {
    if (autoEdit && active && !editing && column !== 'status') {
      setInitialEditValue(null);
      setEditing(true);
      onEditStarted();
    }
  }, [autoEdit, active, editing, column, onEditStarted]);

  const commitText = (raw: string) => {
    setEditing(false);
    setInitialEditValue(null);
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

  const cancelEdit = () => {
    setEditing(false);
    setInitialEditValue(null);
  };

  const startEditing = (withValue: string | null) => {
    if (column === 'status') return;
    setInitialEditValue(withValue);
    setEditing(true);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText(e.currentTarget.value);
      onNavigate('down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitText(e.currentTarget.value);
      onNavigate(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!active || editing) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      onNavigate(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNavigate('right');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onNavigate('left');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate('up');
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      if (column === 'status') return;
      startEditing(null);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (column === 'name' || column === 'assignee' || column === 'predecessors') {
        e.preventDefault();
        commitText('');
      }
    } else if (isPrintableKey(e)) {
      if (column === 'status' || column === 'start' || column === 'finish') return;
      e.preventDefault();
      startEditing(e.key);
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
    boxShadow: active ? 'inset 0 0 0 2px #2563eb' : undefined,
    cursor: 'cell',
    fontSize: 12,
    color: task.hasError ? '#b91c1c' : undefined,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    outline: 'none',
  };

  const onClick = () => onActivate(colIdx);
  const onDoubleClick = () => startEditing(null);

  const commonCellProps = {
    ref: cellRef,
    tabIndex: -1,
    style: baseStyle,
    onClick,
    onDoubleClick,
    onKeyDown: handleCellKeyDown,
  };

  if (column === 'name') {
    const indent = depth * 16;
    return (
      <div {...commonCellProps}>
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
            ref={inputRef}
            defaultValue={initialEditValue ?? task.name}
            onBlur={(e) => commitText(e.target.value)}
            onKeyDown={handleEditKeyDown}
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
      <div {...commonCellProps}>
        <select
          value={task.status}
          onChange={(e) => dispatch({ type: 'SET_STATUS', id: task.id, status: e.target.value as Status })}
          onKeyDown={(e) => {
            if (e.key === 'Tab' || e.key === 'Enter' || e.key.startsWith('Arrow')) {
              handleCellKeyDown(e as unknown as React.KeyboardEvent<HTMLDivElement>);
            }
          }}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12, outline: 'none', color: 'inherit' }}
          tabIndex={-1}
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
          ref={inputRef}
          type={inputType}
          defaultValue={initialEditValue ?? value}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          style={{ flex: 1, border: 'none', outline: '1px solid #2563eb', padding: '2px 4px', fontSize: 12 }}
        />
      </div>
    );
  }

  return (
    <div {...commonCellProps}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  );
}
