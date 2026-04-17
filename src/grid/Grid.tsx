import { forwardRef } from 'react';
import type { VisibleRow } from '../types';
import { Row } from './Row';
import { COLUMNS, GRID_WIDTH, HEADER_HEIGHT, ROW_HEIGHT } from './columns';

interface Props {
  rows: VisibleRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onScroll: (top: number) => void;
}

export const Grid = forwardRef<HTMLDivElement, Props>(function Grid(
  { rows, selectedId, onSelect, onScroll },
  ref,
) {
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
        <div style={{ position: 'relative', height: rows.length * ROW_HEIGHT, width: GRID_WIDTH }}>
          {rows.map((row) => (
            <div
              key={row.task.id}
              style={{ position: 'absolute', top: row.index * ROW_HEIGHT, left: 0, width: GRID_WIDTH }}
            >
              <Row row={row} selected={selectedId === row.task.id} onSelect={() => onSelect(row.task.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
