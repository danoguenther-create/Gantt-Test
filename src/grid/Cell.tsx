import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Task, Status } from '../types';
import { useDispatch } from '../state/store';
import type { ColumnId } from './columns';
import { cellDisplayValue, commitCellValue } from './cellValue';
import { DatePickerPopover } from './DatePickerPopover';

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
  wrap: boolean;
  onActivate: (colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onExtendSelection: (dir: 'up' | 'down') => void;
  onEditStarted: () => void;
}

const STATUSES: Status[] = ['Not Started', 'In Progress', 'Complete'];

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
  wrap,
  onActivate,
  onNavigate,
  onExtendSelection,
  onEditStarted,
}: Props) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [initialEditValue, setInitialEditValue] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cellRef = useRef<HTMLDivElement | null>(null);

  const isDate = column === 'start' || column === 'finish';

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
    commitCellValue(dispatch, task, column, raw);
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

  const openPicker = () => {
    const rect = cellRef.current?.getBoundingClientRect() ?? null;
    setPickerAnchor(rect);
  };
  const closePicker = () => setPickerAnchor(null);

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
    if (e.ctrlKey || e.metaKey) return; // let clipboard shortcuts bubble to the window handler
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
      if (e.shiftKey) onExtendSelection('down');
      else onNavigate('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.shiftKey) onExtendSelection('up');
      else onNavigate('up');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate('down');
    } else if (e.key === 'F2') {
      e.preventDefault();
      if (column === 'status') return;
      startEditing(null);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (column === 'name' || column === 'assignee' || column === 'predecessors') {
        e.preventDefault();
        commitText('');
      }
    } else if (isPrintableKey(e)) {
      if (column === 'status') return;
      e.preventDefault();
      startEditing(e.key);
    }
  };

  const baseStyle: React.CSSProperties = {
    width,
    minWidth: width,
    height: '100%',
    padding: wrap ? '5px 8px' : '0 8px',
    display: 'flex',
    alignItems: wrap ? 'flex-start' : 'center',
    boxSizing: 'border-box',
    borderRight: '1px solid #e5e7eb',
    background: selected ? '#e0f2fe' : undefined,
    boxShadow: active ? 'inset 0 0 0 2px #2563eb' : undefined,
    cursor: 'cell',
    fontSize: 12,
    lineHeight: 1.3,
    color: task.hasError ? '#b91c1c' : undefined,
    overflow: 'hidden',
    whiteSpace: wrap ? 'normal' : 'nowrap',
    textOverflow: wrap ? 'clip' : 'ellipsis',
    outline: 'none',
  };

  const textSpanStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    textOverflow: wrap ? 'clip' : 'ellipsis',
    whiteSpace: wrap ? 'normal' : 'nowrap',
    overflowWrap: wrap ? 'anywhere' : 'normal',
    wordBreak: wrap ? 'break-word' : 'normal',
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
            style={{ width: 14, flexShrink: 0, cursor: 'pointer', userSelect: 'none', color: '#6b7280' }}
          >
            {task.collapsed ? '▸' : '▾'}
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
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
          <span style={{ ...textSpanStyle, fontWeight: hasChildren ? 600 : 400 }}>{task.name}</span>
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

  const value = cellDisplayValue(task, column);

  if (editing) {
    return (
      <div style={baseStyle}>
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialEditValue ?? value}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          placeholder={isDate ? 'JJJJ-MM-TT' : undefined}
          style={{ flex: 1, border: 'none', outline: '1px solid #2563eb', padding: '2px 4px', fontSize: 12 }}
        />
      </div>
    );
  }

  if (isDate) {
    return (
      <div {...commonCellProps}>
        <span style={textSpanStyle}>{value}</span>
        <span
          onMouseDown={(e) => {
            // mousedown so the picker's outside-click listener doesn't immediately close it
            e.stopPropagation();
            e.preventDefault();
            onActivate(colIdx);
            openPicker();
          }}
          style={{ flexShrink: 0, cursor: 'pointer', color: '#6b7280', fontSize: 12, paddingLeft: 4 }}
          title="Kalender öffnen"
        >
          📅
        </span>
        {pickerAnchor
          ? createPortal(
              <DatePickerPopover
                value={value}
                anchor={pickerAnchor}
                onSelect={(iso) => {
                  commitText(iso);
                  closePicker();
                }}
                onClose={closePicker}
              />,
              document.body,
            )
          : null}
      </div>
    );
  }

  return (
    <div {...commonCellProps}>
      <span style={textSpanStyle}>{value}</span>
    </div>
  );
}
