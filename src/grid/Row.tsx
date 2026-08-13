import type { DragEvent } from 'react';
import type { VisibleRow } from '../types';
import type { TaskDiff } from '../state/baselineDiff';
import { Cell, type NavDirection } from './Cell';
import { COLUMNS, DELTA_COLUMN_WIDTH, ROW_NUMBER_WIDTH, type ColumnWidths } from './columns';

interface Props {
  row: VisibleRow;
  selected: boolean;
  activeColIdx: number | null;
  pendingEditColIdx: number | null;
  dropPosition: 'before' | 'after' | null;
  draggableHandle: boolean;
  columnWidths: ColumnWidths;
  wrap: boolean;
  rowHeight: number;
  showDelta: boolean;
  rowDiff: TaskDiff | undefined;
  hovered: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onActivate: (colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onExtendSelection: (dir: 'up' | 'down') => void;
  onEditStarted: () => void;
}

function formatDelta(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}

export function Row({
  row,
  selected,
  activeColIdx,
  pendingEditColIdx,
  dropPosition,
  draggableHandle,
  columnWidths,
  wrap,
  rowHeight,
  showDelta,
  rowDiff,
  hovered,
  onDragStart,
  onDragEnd,
  onActivate,
  onNavigate,
  onExtendSelection,
  onEditStarted,
}: Props) {
  const kind = rowDiff?.kind;
  const rowTint = kind === 'new' ? '#dcfce7' : kind === 'renamed' ? '#fef9c3' : undefined;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height: rowHeight,
        borderBottom: '1px solid #e5e7eb',
        background: hovered ? '#e5edf7' : rowTint,
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
          alignItems: wrap ? 'flex-start' : 'center',
          justifyContent: 'flex-end',
          paddingTop: wrap ? 5 : 0,
          boxSizing: 'border-box',
          borderRight: '1px solid #e5e7eb',
          background: selected ? '#bae6fd' : hovered ? '#dbe4f0' : '#f8fafc',
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
          width={columnWidths[c.id] ?? c.width}
          depth={row.depth}
          hasChildren={row.hasChildren}
          selected={selected}
          active={activeColIdx === idx}
          autoEdit={pendingEditColIdx === idx}
          wrap={wrap}
          onActivate={onActivate}
          onNavigate={onNavigate}
          onExtendSelection={onExtendSelection}
          onEditStarted={onEditStarted}
        />
      ))}
      {showDelta ? (
        <div
          title={
            rowDiff?.kind === 'new'
              ? 'Neu gegenüber Baseline'
              : rowDiff?.kind === 'renamed'
                ? 'Umbenannt gegenüber Baseline'
                : 'Verschiebung des Endtermins in Arbeitstagen gegenüber der Baseline'
          }
          style={{
            width: DELTA_COLUMN_WIDTH,
            minWidth: DELTA_COLUMN_WIDTH,
            height: '100%',
            padding: '0 8px',
            display: 'flex',
            alignItems: wrap ? 'flex-start' : 'center',
            justifyContent: 'flex-end',
            paddingTop: wrap ? 5 : 0,
            boxSizing: 'border-box',
            borderRight: '1px solid #e5e7eb',
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            color:
              !rowDiff || rowDiff.kind === 'new'
                ? '#16a34a'
                : rowDiff.finishDeltaWorkingDays > 0
                  ? '#dc2626'
                  : rowDiff.finishDeltaWorkingDays < 0
                    ? '#16a34a'
                    : '#64748b',
          }}
        >
          {!rowDiff ? '' : rowDiff.kind === 'new' ? 'neu' : formatDelta(rowDiff.finishDeltaWorkingDays)}
        </div>
      ) : null}
    </div>
  );
}
