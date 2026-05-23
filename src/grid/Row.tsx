import type { DragEvent } from 'react';
import type { VisibleRow } from '../types';
import { Cell, type NavDirection } from './Cell';
import { COLUMNS, ROW_HEIGHT, ROW_NUMBER_WIDTH } from './columns';

interface Props {
  row: VisibleRow;
  selected: boolean;
  activeColIdx: number | null;
  pendingEditColIdx: number | null;
  dropPosition: 'before' | 'after' | null;
  draggableHandle: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onActivate: (colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onExtendSelection: (dir: 'up' | 'down') => void;
  onEditStarted: () => void;
}

export function Row({
  row,
  selected,
  activeColIdx,
  pendingEditColIdx,
  dropPosition,
  draggableHandle,
  onDragStart,
  onDragEnd,
  onActivate,
  onNavigate,
  onExtendSelection,
  onEditStarted,
}: Props) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height: ROW_HEIGHT,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {dropPosition ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: dropPosition === 'before' ? 0 : undefined,
            bottom: dropPosition === 'after' ? 0 : undefined,
            height: 2,
            background: '#2563eb',
            boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.2)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <div
        data-row-gutter="true"
        draggable={draggableHandle}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={`Drag row ${row.task.id} to reorder`}
        style={{
          width: ROW_NUMBER_WIDTH,
          minWidth: ROW_NUMBER_WIDTH,
          height: '100%',
          padding: '0 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          boxSizing: 'border-box',
          borderRight: '1px solid #e5e7eb',
          background: selected ? '#bae6fd' : '#f8fafc',
          color: '#64748b',
          cursor: 'grab',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          userSelect: 'none',
        }}
      >
        {row.task.id}
      </div>
      {COLUMNS.map((c, idx) => (
        <Cell
          key={c.id}
          task={row.task}
          column={c.id}
          colIdx={idx}
          width={c.width}
          depth={row.depth}
          hasChildren={row.hasChildren}
          selected={selected}
          active={activeColIdx === idx}
          autoEdit={pendingEditColIdx === idx}
          onActivate={onActivate}
          onNavigate={onNavigate}
          onExtendSelection={onExtendSelection}
          onEditStarted={onEditStarted}
        />
      ))}
    </div>
  );
}
