import type { VisibleRow } from '../types';
import { Cell, type NavDirection } from './Cell';
import { COLUMNS, ROW_HEIGHT, ROW_NUMBER_WIDTH } from './columns';

interface Props {
  row: VisibleRow;
  selected: boolean;
  activeColIdx: number | null;
  pendingEditColIdx: number | null;
  onActivate: (colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
  onEditStarted: () => void;
}

export function Row({ row, selected, activeColIdx, pendingEditColIdx, onActivate, onNavigate, onEditStarted }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        height: ROW_HEIGHT,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        title={`Row ${row.task.id}`}
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
          background: selected ? '#e0f2fe' : '#f8fafc',
          color: '#64748b',
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
          onEditStarted={onEditStarted}
        />
      ))}
    </div>
  );
}
