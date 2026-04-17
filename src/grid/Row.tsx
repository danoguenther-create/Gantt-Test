import type { VisibleRow } from '../types';
import { Cell } from './Cell';
import { COLUMNS, ROW_HEIGHT } from './columns';

interface Props {
  row: VisibleRow;
  selected: boolean;
  onSelect: () => void;
}

export function Row({ row, selected, onSelect }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        height: ROW_HEIGHT,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {COLUMNS.map((c) => (
        <Cell
          key={c.id}
          task={row.task}
          column={c.id}
          width={c.width}
          depth={row.depth}
          hasChildren={row.hasChildren}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
