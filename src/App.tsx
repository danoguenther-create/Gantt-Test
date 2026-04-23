import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid, type ActiveCell } from './grid/Grid';
import { COLUMNS } from './grid/columns';
import type { NavDirection } from './grid/Cell';
import { Gantt } from './gantt/Gantt';
import { Toolbar } from './toolbar/Toolbar';
import { ProjectProvider, useDispatch, useProject, useWorkspace } from './state/store';
import { computeVisibleRows } from './state/visibleRows';

function predictNextId(tasks: Record<string, unknown>): string {
  let n = 1;
  while (tasks[String(n)]) n++;
  return String(n);
}

function Workspace() {
  const workspace = useWorkspace();
  const state = useProject();
  const dispatch = useDispatch();
  const rows = useMemo(() => computeVisibleRows(state), [state]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [pendingEditAt, setPendingEditAt] = useState<ActiveCell | null>(null);

  useEffect(() => {
    setActiveCell(null);
    setPendingEditAt(null);
  }, [workspace.currentProjectId]);

  const activate = useCallback((rowId: string, colIdx: number) => {
    setActiveCell({ rowId, colIdx });
  }, []);

  const clearPendingEdit = useCallback(() => setPendingEditAt(null), []);

  const navigate = useCallback(
    (dir: NavDirection) => {
      if (rows.length === 0) return;
      const cur = activeCell ?? { rowId: rows[0].task.id, colIdx: 0 };
      const rowIdx = Math.max(0, rows.findIndex((r) => r.task.id === cur.rowId));
      const lastCol = COLUMNS.length - 1;
      const lastRow = rows.length - 1;

      if (dir === 'down' && rowIdx === lastRow && cur.colIdx === 0) {
        const newId = predictNextId(state.tasks);
        dispatch({ type: 'ADD_TASK_BELOW', id: cur.rowId });
        setActiveCell({ rowId: newId, colIdx: 0 });
        setPendingEditAt({ rowId: newId, colIdx: 0 });
        return;
      }

      let nextRow = rowIdx;
      let nextCol = cur.colIdx;
      if (dir === 'right') nextCol += 1;
      else if (dir === 'left') nextCol -= 1;
      else if (dir === 'down') nextRow += 1;
      else if (dir === 'up') nextRow -= 1;

      if (nextCol > lastCol) {
        nextCol = 0;
        nextRow = Math.min(nextRow + 1, lastRow);
      } else if (nextCol < 0) {
        nextCol = lastCol;
        nextRow = Math.max(nextRow - 1, 0);
      }
      nextRow = Math.max(0, Math.min(lastRow, nextRow));
      setActiveCell({ rowId: rows[nextRow].task.id, colIdx: nextCol });
    },
    [rows, activeCell, state.tasks, dispatch],
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
          pendingEditAt={pendingEditAt}
          onActivate={activate}
          onNavigate={navigate}
          onEditStarted={clearPendingEdit}
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
