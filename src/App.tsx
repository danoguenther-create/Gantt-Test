import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid, type ActiveCell } from './grid/Grid';
import {
  COLUMNS,
  MIN_COLUMN_WIDTH,
  ROW_HEIGHT,
  WRAP_ROW_HEIGHT,
  defaultColumnWidths,
  type ColumnId,
  type ColumnWidths,
} from './grid/columns';
import type { NavDirection } from './grid/Cell';
import { cellDisplayValue, commitCellValue } from './grid/cellValue';
import { Gantt } from './gantt/Gantt';
import { Toolbar } from './toolbar/Toolbar';
import { BaselineImpact } from './toolbar/BaselineImpact';
import { ExportReminder } from './ExportReminder';
import { ProjectProvider, useDispatch, useProject, useWorkspace } from './state/store';
import { loadViewPrefs, saveViewPrefs } from './state/persistence';
import { computeVisibleRows } from './state/visibleRows';
import { activeBaseline, computeBaselineDiff } from './state/baselineDiff';

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
  const baseline = useMemo(() => activeBaseline(state), [state]);
  const diff = useMemo(() => computeBaselineDiff(state, baseline), [state, baseline]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [pendingEditAt, setPendingEditAt] = useState<ActiveCell | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const dragSelecting = useRef(false);

  const initialPrefs = useMemo(() => loadViewPrefs(), []);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => ({
    ...defaultColumnWidths(),
    ...(initialPrefs.columnWidths as Partial<ColumnWidths> | undefined),
  }));
  const [wrap, setWrap] = useState<boolean>(() => !!initialPrefs.wrap);
  const rowHeight = wrap ? WRAP_ROW_HEIGHT : ROW_HEIGHT;

  useEffect(() => {
    saveViewPrefs({ columnWidths, wrap });
  }, [columnWidths, wrap]);

  const onColumnResize = useCallback((id: ColumnId, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [id]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)) }));
  }, []);

  const clipboardRef = useRef<string>('');
  const [copiedRange, setCopiedRange] = useState<{ colIdx: number; rowIds: string[] } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const inField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (e.key === 'Escape' && !inField) {
        setCopiedRange(null);
        return;
      }
      if (inField) return; // let native clipboard handle inline edits
      if (!activeCell) return;
      const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
      const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';
      if (!isCopy && !isPaste) return;
      const col = COLUMNS[activeCell.colIdx]?.id;
      if (!col) return;

      // rows in visible order that participate in the operation
      const orderedSelected = rows.map((r) => r.task.id).filter((id) => selectedRowIds.has(id));
      const rowIds = orderedSelected.length > 1 ? orderedSelected : [activeCell.rowId];

      if (isCopy) {
        e.preventDefault();
        const values = rowIds.map((id) => {
          const t = state.tasks[id];
          return t ? cellDisplayValue(t, col) : '';
        });
        const text = values.join('\n');
        clipboardRef.current = text;
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopiedRange({ colIdx: activeCell.colIdx, rowIds });
      } else {
        e.preventDefault();
        const applyPaste = (text: string) => {
          const lines = (text ?? '').split(/\r?\n/);
          if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();

          // Excel-like: pasting a multi-line clipboard onto a single anchor fills downward
          let targets = rowIds;
          if (targets.length === 1 && lines.length > 1) {
            const startIdx = rows.findIndex((r) => r.task.id === targets[0]);
            if (startIdx >= 0) {
              targets = [];
              for (let k = 0; k < lines.length && startIdx + k < rows.length; k++) {
                targets.push(rows[startIdx + k].task.id);
              }
            }
          }

          for (let i = 0; i < targets.length; i++) {
            const target = state.tasks[targets[i]];
            if (!target) continue;
            const value = lines.length === 1 ? lines[0] : i < lines.length ? lines[i] : undefined;
            if (value !== undefined) commitCellValue(dispatch, target, col, value);
          }
          setCopiedRange(null);
        };
        if (navigator.clipboard?.readText) {
          navigator.clipboard
            .readText()
            .then((t) => applyPaste(t || clipboardRef.current))
            .catch(() => applyPaste(clipboardRef.current));
        } else {
          applyPaste(clipboardRef.current);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCell, selectedRowIds, rows, state.tasks, dispatch]);

  useEffect(() => {
    setActiveCell(null);
    setPendingEditAt(null);
    setSelectedRowIds(new Set());
    setAnchorId(null);
    setCopiedRange(null);
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
      <Toolbar
        selectedId={activeCell?.rowId ?? null}
        selectedIds={rows.filter((r) => selectedRowIds.has(r.task.id)).map((r) => r.task.id)}
        wrap={wrap}
        onToggleWrap={() => setWrap((w) => !w)}
      />
      {baseline ? <BaselineImpact baseline={baseline} diff={diff} state={state} /> : null}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Grid
          ref={gridScrollRef}
          rows={rows}
          activeCell={activeCell}
          pendingEditAt={pendingEditAt}
          selectedRowIds={selectedRowIds}
          copiedRange={copiedRange}
          columnWidths={columnWidths}
          wrap={wrap}
          rowHeight={rowHeight}
          showDelta={!!baseline}
          diffById={baseline ? diff.byId : null}
          onColumnResize={onColumnResize}
          onActivate={activate}
          onNavigate={navigate}
          onExtendSelection={extendSelection}
          onRowMouseDown={onRowMouseDown}
          onRowMouseEnter={onRowMouseEnter}
          onEditStarted={clearPendingEdit}
          onScroll={onGridScroll}
        />
        <Gantt ref={ganttScrollRef} state={state} rows={rows} rowHeight={rowHeight} onScroll={onGanttScroll} />
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
