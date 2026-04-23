import type { VisibleRow } from '../types';
import { Cell, type NavDirection } from './Cell';
import { COLUMNS, ROW_HEIGHT } from './columns';

interface Props {
  row: VisibleRow;
  selected: boolean;
  activeColIdx: number | null;
  onActivate: (colIdx: number) => void;
  onNavigate: (dir: NavDirection) => void;
}

export function Row({ row, selected, activeColIdx, onActivate, onNavigate }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        height: ROW_HEIGHT,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
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
          onActivate={onActivate}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
