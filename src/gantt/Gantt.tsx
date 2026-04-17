import { forwardRef, useMemo } from 'react';
import type { ProjectState, VisibleRow } from '../types';
import { Bar } from './Bar';
import { DependencyArrow } from './DependencyArrow';
import { TimelineHeader } from './TimelineHeader';
import { computeTicks, computeTimeline, pxForDate } from './timeline';
import { ROW_HEIGHT } from '../grid/columns';

interface Props {
  state: ProjectState;
  rows: VisibleRow[];
  onScroll: (top: number) => void;
}

export const Gantt = forwardRef<HTMLDivElement, Props>(function Gantt({ state, rows, onScroll }, ref) {
  const metrics = useMemo(() => computeTimeline(state), [state]);
  const ticks = useMemo(() => computeTicks(metrics, state.zoom), [metrics, state.zoom]);

  const visibleIndexById = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.task.id, r.index));
    return m;
  }, [rows]);

  const bodyHeight = rows.length * ROW_HEIGHT;
  const todayX = pxForDate(metrics, new Date().toISOString().slice(0, 10));

  return (
    <div style={{ flex: 1, minWidth: 0, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={ref}
        onScroll={(e) => onScroll((e.target as HTMLDivElement).scrollTop)}
        style={{ flex: 1, overflow: 'auto' }}
      >
        <div style={{ width: metrics.width, position: 'relative' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, width: metrics.width, background: '#f8fafc' }}>
            <TimelineHeader metrics={metrics} ticks={ticks} />
          </div>
          <svg width={metrics.width} height={Math.max(bodyHeight, 1)} style={{ display: 'block' }}>
            <defs>
              <pattern id="rowStripe" x="0" y="0" width={metrics.pxPerDay * 7} height={ROW_HEIGHT * 2} patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width={metrics.pxPerDay * 7} height={ROW_HEIGHT} fill="#ffffff" />
                <rect x="0" y={ROW_HEIGHT} width={metrics.pxPerDay * 7} height={ROW_HEIGHT} fill="#f8fafc" />
              </pattern>
            </defs>
            <rect x={0} y={0} width={metrics.width} height={bodyHeight} fill="url(#rowStripe)" />
            {ticks.majorTicks.map((t) => (
              <line key={`gridM${t.iso}`} x1={t.x} y1={0} x2={t.x} y2={bodyHeight} stroke="#e2e8f0" />
            ))}
            {todayX >= 0 && todayX <= metrics.width ? (
              <line x1={todayX} y1={0} x2={todayX} y2={bodyHeight} stroke="#ef4444" strokeDasharray="4 3" />
            ) : null}
            {rows.map((r) => (
              <Bar
                key={r.task.id}
                task={r.task}
                rowIndex={r.index}
                metrics={metrics}
                isSummary={r.hasChildren}
              />
            ))}
            {rows.flatMap((r) => {
              const succIdx = visibleIndexById.get(r.task.id);
              if (succIdx === undefined) return [];
              return r.task.predecessors
                .map((dep) => {
                  const predIdx = visibleIndexById.get(dep.predecessorId);
                  const pred = state.tasks[dep.predecessorId];
                  if (predIdx === undefined || !pred) return null;
                  return (
                    <DependencyArrow
                      key={`${dep.predecessorId}->${r.task.id}-${dep.type}`}
                      pred={pred}
                      succ={r.task}
                      predRowIndex={predIdx}
                      succRowIndex={succIdx}
                      type={dep.type}
                      metrics={metrics}
                    />
                  );
                })
                .filter(Boolean) as JSX.Element[];
            })}
          </svg>
        </div>
      </div>
    </div>
  );
});
