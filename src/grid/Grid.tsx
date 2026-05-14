import { forwardRef, useState } from 'react';
import type { VisibleRow } from '../types';
import { Row } from './Row';
import { Cell as _Cell } from './Cell';
import type { NavDirection } from './Cell';
import { COLUMNS, GRID_WIDTH, GHOST_ROWS, HEADER_HEIGHT, ROW_HEIGHT, ROW_NUMBER_WIDTH } from './columns';
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
  onActivate: (rowId: string, colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onEditStarted: () => void;
  onScroll: (top: number) => void;
}

export const Grid = forwardRef<HTMLDivElement, Props>(function Grid(
  { rows, activeCell, pendingEditAt, onActivate, onNavigate, onEditStarted, onScroll },
  ref,
) {
  const dispatch = useDispatch();
  const totalRows = rows.length + GHOST_ROWS;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const resetDragState = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRight: '1px solid #cbd5e1' }}>
      <div
        style={{
          display: 'flex',
          height: HEADER_HEIGHT,
          width: GRID_WIDTH,
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
        {COLUMNS.map((c) => (
          <div
            key={c.id}
            style={{
              width: c.width,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              borderRight: '1px solid #cbd5e1',
              boxSizing: 'border-box',
            }}
          >
            {c.header}
          </div>
        ))}
      </div>
      <div
        ref={ref}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', width: GRID_WIDTH }}
        onScroll={(e) => onScroll((e.target as HTMLDivElement).scrollTop)}
      >
        <div style={{ position: 'relative', height: totalRows * ROW_HEIGHT, width: GRID_WIDTH }}>
          {rows.map((row) => {
            const isActiveRow = activeCell?.rowId === row.task.id;
            const pendingColIdx = pendingEditAt?.rowId === row.task.id ? pendingEditAt.colIdx : null;
            const isDragging = draggingId === row.task.id;
            const dropPosition = dropTarget?.id === row.task.id ? dropTarget.position : null;
            return (
              <div
                key={row.task.id}
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
                  top: row.index * ROW_HEIGHT,
                  left: 0,
                  width: GRID_WIDTH,
                  opacity: isDragging ? 0.45 : 1,
                  zIndex: isDragging || dropPosition ? 1 : 0,
                }}
              >
                <Row
                  row={row}
                  selected={isActiveRow}
                  activeColIdx={isActiveRow ? activeCell!.colIdx : null}
                  pendingEditColIdx={pendingColIdx}
                  dropPosition={dropPosition}
                  draggableHandle={true}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', row.task.id);
                    setDraggingId(row.task.id);
                  }}
                  onDragEnd={resetDragState}
                  onActivate={(colIdx) => onActivate(row.task.id, colIdx)}
                  onNavigate={onNavigate}
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
                  top: idx * ROW_HEIGHT,
                  left: 0,
                  width: GRID_WIDTH,
                  height: ROW_HEIGHT,
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
                {COLUMNS.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      width: c.width,
                      minWidth: c.width,
                      borderRight: '1px solid #eef2f7',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
