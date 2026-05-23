import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid, type ActiveCell } from './grid/Grid';
import { COLUMNS } from './grid/columns';
import type { NavDirection } from './grid/Cell';
import { Gantt } from './gantt/Gantt';
import { Toolbar } from './toolbar/Toolbar';
import { ExportReminder } from './ExportReminder';
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
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const dragSelecting = useRef(false);

  useEffect(() => {
    setActiveCell(null);
    setPendingEditAt(null);
    setSelectedRowIds(new Set());
    setAnchorId(null);
  }, [workspace.currentProjectId]);

  useEffect(() => {
    const up = () => {
      dragSelecting.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const rowIndexOf = useCallback((id: string) => rows.findIndex((r) => r.task.id === id), [rows]);

  const selectSingle = useCallback((rowId: string) => {
    setSelectedRowIds(new Set([rowId]));
    setAnchorId(rowId);
  }, []);

  const selectRangeTo = useCallback(
    (rowId: string, anchorOverride?: string) => {
      const a = anchorOverride ?? anchorId ?? rowId;
      const i1 = rowIndexOf(a);
      const i2 = rowIndexOf(rowId);
      if (i1 < 0 || i2 < 0) {
        setSelectedRowIds(new Set([rowId]));
        setAnchorId(rowId);
        return;
      }
      const lo = Math.min(i1, i2);
      const hi = Math.max(i1, i2);
      const ids = new Set<string>();
      for (let i = lo; i <= hi; i++) ids.add(rows[i].task.id);
      setSelectedRowIds(ids);
    },
    [anchorId, rowIndexOf, rows],
  );

  const toggleRow = useCallback((rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
    setAnchorId(rowId);
  }, []);

  const onRowMouseDown = useCallback(
    (rowId: string, mods: { shift: boolean; meta: boolean }) => {
      if (mods.shift) {
        selectRangeTo(rowId);
        dragSelecting.current = false;
      } else if (mods.meta) {
        toggleRow(rowId);
        dragSelecting.current = false;
      } else {
        selectSingle(rowId);
        dragSelecting.current = true;
      }
    },
    [selectRangeTo, toggleRow, selectSingle],
  );

  const onRowMouseEnter = useCallback(
    (rowId: string) => {
      if (dragSelecting.current) selectRangeTo(rowId);
    },
    [selectRangeTo],
  );

  const activate = useCallback((rowId: string, colIdx: number) => {
    setActiveCell({ rowId, colIdx });
  }, []);

  const moveActive = useCallback((rowId: string, colIdx: number) => {
    setActiveCell({ rowId, colIdx });
    setSelectedRowIds(new Set([rowId]));
    setAnchorId(rowId);
  }, []);

  const clearPendingEdit = useCallback(() => setPendingEditAt(null), []);

  const extendSelection = useCallback(
    (dir: 'up' | 'down') => {
      const cur = activeCell;
      if (!cur) return;
      const curIdx = rowIndexOf(cur.rowId);
      if (curIdx < 0) return;
      const nextIdx = dir === 'down' ? Math.min(curIdx + 1, rows.length - 1) : Math.max(curIdx - 1, 0);
      const nextRowId = rows[nextIdx].task.id;
      setActiveCell({ rowId: nextRowId, colIdx: cur.colIdx });
      selectRangeTo(nextRowId, anchorId ?? cur.rowId);
    },
    [activeCell, rowIndexOf, rows, selectRangeTo, anchorId],
  );

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
        setSelectedRowIds(new Set([newId]));
        setAnchorId(newId);
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
      moveActive(rows[nextRow].task.id, nextCol);
    },
    [rows, activeCell, state.tasks, dispatch, moveActive],
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
      <ExportReminder />
      <Toolbar selectedId={activeCell?.rowId ?? null} selectedIds={[...selectedRowIds]} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Grid
          ref={gridScrollRef}
          rows={rows}
          activeCell={activeCell}
          pendingEditAt={pendingEditAt}
          selectedRowIds={selectedRowIds}
          onActivate={activate}
          onNavigate={navigate}
          onExtendSelection={extendSelection}
          onRowMouseDown={onRowMouseDown}
          onRowMouseEnter={onRowMouseEnter}
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
