import { useMemo, useRef, useState } from 'react';
import { Grid } from './grid/Grid';
import { Gantt } from './gantt/Gantt';
import { Toolbar } from './toolbar/Toolbar';
import { ProjectProvider, useProject } from './state/store';
import { computeVisibleRows } from './state/visibleRows';

function Workspace() {
  const state = useProject();
  const rows = useMemo(() => computeVisibleRows(state), [state]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      <Toolbar selectedId={selectedId} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Grid ref={gridScrollRef} rows={rows} selectedId={selectedId} onSelect={setSelectedId} onScroll={onGridScroll} />
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
