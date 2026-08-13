import { forwardRef, useState } from 'react';
import type { TaskId, VisibleRow } from '../types';
import type { TaskDiff } from '../state/baselineDiff';
import { Row } from './Row';
import { Cell as _Cell } from './Cell';
import type { NavDirection } from './Cell';
import {
  COLUMNS,
  DELTA_COLUMN_WIDTH,
  GHOST_ROWS,
  HEADER_HEIGHT,
  ROW_NUMBER_WIDTH,
  gridWidthFor,
  type ColumnId,
  type ColumnWidths,
} from './columns';
import { useDispatch } from '../state/store';

void _Cell;

export interface ActiveCell {
  rowId: string;
  colIdx: number;
}

interface Props {
  rows: VisibleRow[];
  activeCell: ActiveCell | null;
  pendingEditAt: ActiveCell | null;
  selectedRowIds: Set<string>;
  copiedRange: { colIdx: number; rowIds: string[] } | null;
  columnWidths: ColumnWidths;
  wrap: boolean;
  rowHeight: number;
  showDelta: boolean;
  diffById: Map<TaskId, TaskDiff> | null;
  hoveredRowId: string | null;
  onColumnResize: (id: ColumnId, width: number) => void;
  onActivate: (rowId: string, colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onExtendSelection: (dir: 'up' | 'down') => void;
  onRowMouseDown: (rowId: string, mods: { shift: boolean; meta: boolean }) => void;
  onRowMouseEnter: (rowId: string) => void;
  onRowHover: (rowId: string | null) => void;
  onEditStarted: () => void;
  onScroll: (top: number) => void;
}

export const Grid = forwardRef<HTMLDivElement, Props>(function Grid(
  {
    rows,
    activeCell,
    pendingEditAt,
    selectedRowIds,
    copiedRange,
    columnWidths,
    wrap,
    rowHeight,
    showDelta,
    diffById,
    hoveredRowId,
    onColumnResize,
    onActivate,
    onNavigate,
    onExtendSelection,
    onRowMouseDown,
    onRowMouseEnter,
    onRowHover,
    onEditStarted,
    onScroll,
  },
  ref,
) {
  const dispatch = useDispatch();
  const totalRows = rows.length + GHOST_ROWS;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const gridWidth = gridWidthFor(columnWidths) + (showDelta ? DELTA_COLUMN_WIDTH : 0);

  const columnLeft = (colIdx: number) =>
    ROW_NUMBER_WIDTH + COLUMNS.slice(0, colIdx).reduce((a, c) => a + (columnWidths[c.id] ?? c.width), 0);

  const rangeRect = (colIdx: number, rowIds: string[]) => {
    const col = COLUMNS[colIdx];
    if (!col) return null;
    const indices = rowIds
      .map((id) => rows.findIndex((r) => r.task.id === id))
      .filter((i) => i >= 0);
    if (indices.length === 0) return null;
    const min = Math.min(...indices);
    const max = Math.max(...indices);
    return {
      left: columnLeft(colIdx),
      top: min * rowHeight,
      width: columnWidths[col.id] ?? col.width,
      height: (max - min + 1) * rowHeight,
    };
  };

  const selectionRect = activeCell && selectedRowIds.size > 1 ? rangeRect(activeCell.colIdx, [...selectedRowIds]) : null;
  const copiedRect = copiedRange ? rangeRect(copiedRange.colIdx, copiedRange.rowIds) : null;

  const resetDragState = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const startColumnResize = (id: ColumnId, startWidth: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const onMove = (ev: PointerEvent) => onColumnResize(id, startWidth + (ev.clientX - startX));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRight: '1px solid #cbd5e1' }}>
      <div
        ref={ref}
        style={{ flex: 1, overflow: 'auto', userSelect: 'none' }}
        onScroll={(e) => onScroll((e.target as HTMLDivElement).scrollTop)}
        onMouseLeave={() => onRowHover(null)}
      >
      <div style={{ width: gridWidth, position: 'relative' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          display: 'flex',
          height: HEADER_HEIGHT,
          width: gridWidth,
          background: '#f8fafc',
          borderBottom: '1px solid #cbd5e1',
          fontSize: 12,
          fontWeight: 600,
          color: '#334155',
        }}
      >
        <div
          style={{
            width: ROW_NUMBER_WIDTH,
            padding: '0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderRight: '1px solid #cbd5e1',
            boxSizing: 'border-box',
            color: '#64748b',
          }}
          title="Row number used in predecessors"
        >
          #
        </div>
        {COLUMNS.map((c) => {
          const w = columnWidths[c.id] ?? c.width;
          return (
            <div
              key={c.id}
              style={{
                position: 'relative',
                width: w,
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                borderRight: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.header}</span>
              <div
                onPointerDown={startColumnResize(c.id, w)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onColumnResize(c.id, c.width);
                }}
                title="Spaltenbreite ziehen · Doppelklick: zurücksetzen"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -3,
                  width: 6,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 3,
                }}
              />
            </div>
          );
        })}
        {showDelta ? (
          <div
            title="Δ Endtermin gegenüber Baseline (Arbeitstage)"
            style={{
              width: DELTA_COLUMN_WIDTH,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderRight: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              color: '#0f172a',
            }}
          >
            Δ Baseline
          </div>
        ) : null}
      </div>
      <div style={{ position: 'relative', height: totalRows * rowHeight, width: gridWidth }}>
          {rows.map((row) => {
            const isActiveRow = activeCell?.rowId === row.task.id;
            const isSelectedRow = selectedRowIds.has(row.task.id);
            const pendingColIdx = pendingEditAt?.rowId === row.task.id ? pendingEditAt.colIdx : null;
            const isDragging = draggingId === row.task.id;
            const dropPosition = dropTarget?.id === row.task.id ? dropTarget.position : null;
            return (
              <div
                key={row.task.id}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  if ((e.target as HTMLElement).closest('[data-row-gutter]')) return;
                  onRowMouseDown(row.task.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
                }}
                onMouseEnter={() => {
                  onRowMouseEnter(row.task.id);
                  onRowHover(row.task.id);
                }}
                onDragOver={(e) => {
                  if (!draggingId || draggingId === row.task.id) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                  setDropTarget({ id: row.task.id, position });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const sourceId = draggingId ?? e.dataTransfer.getData('text/plain');
                  if (sourceId && sourceId !== row.task.id) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                    dispatch({ type: 'REORDER_TASK', draggedId: sourceId, targetId: row.task.id, position });
                    onActivate(sourceId, 0);
                  }
                  resetDragState();
                }}
                style={{
                  position: 'absolute',
                  top: row.index * rowHeight,
                  left: 0,
                  width: gridWidth,
                  opacity: isDragging ? 0.45 : 1,
                  zIndex: isDragging || dropPosition ? 1 : 0,
                }}
              >
                <Row
                  row={row}
                  selected={isSelectedRow}
                  activeColIdx={isActiveRow ? activeCell!.colIdx : null}
                  pendingEditColIdx={pendingColIdx}
                  dropPosition={dropPosition}
                  draggableHandle={true}
                  columnWidths={columnWidths}
                  wrap={wrap}
                  rowHeight={rowHeight}
                  showDelta={showDelta}
                  rowDiff={diffById?.get(row.task.id)}
                  hovered={hoveredRowId === row.task.id}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', row.task.id);
                    setDraggingId(row.task.id);
                  }}
                  onDragEnd={resetDragState}
                  onActivate={(colIdx) => onActivate(row.task.id, colIdx)}
                  onNavigate={onNavigate}
                  onExtendSelection={onExtendSelection}
                  onEditStarted={onEditStarted}
                />
              </div>
            );
          })}
          {Array.from({ length: GHOST_ROWS }).map((_, i) => {
            const idx = rows.length + i;
            return (
              <div
                key={`ghost-${i}`}
                onClick={() => dispatch({ type: 'ADD_TASK_AT_END' })}
                style={{
                  position: 'absolute',
                  top: idx * rowHeight,
                  left: 0,
                  width: gridWidth,
                  height: rowHeight,
                  display: 'flex',
                  borderBottom: '1px solid #eef2f7',
                  background: idx % 2 === 0 ? '#ffffff' : '#fafbfc',
                  cursor: 'cell',
                }}
                title="Click to add a new task"
              >
                <div
                  style={{
                    width: ROW_NUMBER_WIDTH,
                    minWidth: ROW_NUMBER_WIDTH,
                    borderRight: '1px solid #eef2f7',
                    boxSizing: 'border-box',
                  }}
                />
                {COLUMNS.map((c) => {
                  const w = columnWidths[c.id] ?? c.width;
                  return (
                    <div
                      key={c.id}
                      style={{
                        width: w,
                        minWidth: w,
                        borderRight: '1px solid #eef2f7',
                        boxSizing: 'border-box',
                      }}
                    />
                  );
                })}
                {showDelta ? (
                  <div
                    style={{
                      width: DELTA_COLUMN_WIDTH,
                      minWidth: DELTA_COLUMN_WIDTH,
                      borderRight: '1px solid #eef2f7',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : null}
              </div>
            );
          })}
          {selectionRect ? (
            <div
              style={{
                position: 'absolute',
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
                border: '2px solid #2563eb',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />
          ) : null}
          {copiedRect ? (
            <div
              className="copy-ants"
              style={{
                position: 'absolute',
                left: copiedRect.left,
                top: copiedRect.top,
                width: copiedRect.width,
                height: copiedRect.height,
                boxSizing: 'border-box',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
});
