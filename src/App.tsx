import { useCallback, useMemo, useRef, useState } from 'react';
import { Grid, type ActiveCell } from './grid/Grid';
import { COLUMNS } from './grid/columns';
import type { NavDirection } from './grid/Cell';
import { Gantt } from './gantt/Gantt';
import { Toolbar } from './toolbar/Toolbar';
import { ProjectProvider, useProject } from './state/store';
import { computeVisibleRows } from './state/visibleRows';

function Workspace() {
  const state = useProject();
  const rows = useMemo(() => computeVisibleRows(state), [state]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);

  const activate = useCallback((rowId: string, colIdx: number) => {
    setActiveCell({ rowId, colIdx });
  }, []);

  const navigate = useCallback(
    (dir: NavDirection) => {
      if (rows.length === 0) return;
      setActiveCell((current) => {
        const cur = current ?? { rowId: rows[0].task.id, colIdx: 0 };
        let rowIdx = rows.findIndex((r) => r.task.id === cur.rowId);
        if (rowIdx < 0) rowIdx = 0;
        let colIdx = cur.colIdx;
        const lastCol = COLUMNS.length - 1;
        const lastRow = rows.length - 1;

        if (dir === 'right') colIdx += 1;
        else if (dir === 'left') colIdx -= 1;
        else if (dir === 'down') rowIdx += 1;
        else if (dir === 'up') rowIdx -= 1;

        if (colIdx > lastCol) {
          colIdx = 0;
          rowIdx = Math.min(rowIdx + 1, lastRow);
        } else if (colIdx < 0) {
          colIdx = lastCol;
          rowIdx = Math.max(rowIdx - 1, 0);
        }
        rowIdx = Math.max(0, Math.min(lastRow, rowIdx));
        return { rowId: rows[rowIdx].task.id, colIdx };
      });
    },
    [rows],
  );

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef<'grid' | 'gantt' | null>(null);

  const onGridScroll = (top: number) => {
    if (syncLock.current === 'gantt') return;
    syncLock.current = 'grid';
    if (ganttScrollRef.current && ganttScrollRef.current.scrollTop !== top) {
      ganttScrollRef.current.scrollTop = top;
    }
    requestAnimationFrame(() => (syncLock.current = null));
  };
  const onGanttScroll = (top: number) => {
    if (syncLock.current === 'grid') return;
    syncLock.current = 'gantt';
    if (gridScrollRef.current && gridScrollRef.current.scrollTop !== top) {
      gridScrollRef.current.scrollTop = top;
    }
    requestAnimationFrame(() => (syncLock.current = null));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Toolbar selectedId={activeCell?.rowId ?? null} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Grid
          ref={gridScrollRef}
          rows={rows}
          activeCell={activeCell}
          onActivate={activate}
          onNavigate={navigate}
          onScroll={onGridScroll}
        />
        <Gantt ref={ganttScrollRef} state={state} rows={rows} onScroll={onGanttScroll} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <Workspace />
    </ProjectProvider>
  );
}
