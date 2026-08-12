import { forwardRef, useMemo } from 'react';
import type { ProjectState, VisibleRow } from '../types';
import { Bar } from './Bar';
import { GhostBar } from './GhostBar';
import { DependencyArrow } from './DependencyArrow';
import { TimelineHeader } from './TimelineHeader';
import { computeTicks, computeTimeline, computeWeekBands, pxForDate } from './timeline';
import { GHOST_ROWS } from '../grid/columns';
import { activeBaseline } from '../state/baselineDiff';

interface Props {
  state: ProjectState;
  rows: VisibleRow[];
  rowHeight: number;
  onScroll: (top: number) => void;
}

export const Gantt = forwardRef<HTMLDivElement, Props>(function Gantt({ state, rows, rowHeight, onScroll }, ref) {
  const metrics = useMemo(() => computeTimeline(state), [state]);
  const ticks = useMemo(() => computeTicks(metrics, state.zoom), [metrics, state.zoom]);
  const weekBands = useMemo(() => computeWeekBands(metrics), [metrics]);

  const visibleIndexById = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.task.id, r.index));
    return m;
  }, [rows]);

  const bodyHeight = (rows.length + GHOST_ROWS) * rowHeight;
  const todayX = pxForDate(metrics, new Date().toISOString().slice(0, 10));
  const baseline = useMemo(() => activeBaseline(state), [state]);

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
              <pattern id="rowStripe" x="0" y="0" width={metrics.pxPerDay * 7} height={rowHeight * 2} patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width={metrics.pxPerDay * 7} height={rowHeight} fill="#ffffff" />
                <rect x="0" y={rowHeight} width={metrics.pxPerDay * 7} height={rowHeight} fill="#f8fafc" />
              </pattern>
            </defs>
            <rect x={0} y={0} width={metrics.width} height={bodyHeight} fill="url(#rowStripe)" />
            {weekBands.map((band) => (
              <g key={band.iso}>
                {band.shaded ? <rect x={band.x} y={0} width={band.width} height={bodyHeight} fill="#e2e8f0" opacity={0.32} /> : null}
                <line x1={band.x} y1={0} x2={band.x} y2={bodyHeight} stroke="#cbd5e1" strokeOpacity={0.8} />
              </g>
            ))}
            {ticks.majorTicks.map((t) => (
              <line key={`gridM${t.iso}`} x1={t.x} y1={0} x2={t.x} y2={bodyHeight} stroke="#e2e8f0" />
            ))}
            {todayX >= 0 && todayX <= metrics.width ? (
              <line x1={todayX} y1={0} x2={todayX} y2={bodyHeight} stroke="#ef4444" strokeDasharray="4 3" />
            ) : null}
            {baseline
              ? rows.flatMap((r) => {
                  const snap = baseline.tasks[r.task.id];
                  if (!snap) return [];
                  return [
                    <GhostBar
                      key={`ghost-${r.task.id}`}
                      snapshot={snap}
                      task={r.task}
                      rowIndex={r.index}
                      rowHeight={rowHeight}
                      metrics={metrics}
                    />,
                  ];
                })
              : null}
            {rows.map((r) => (
              <Bar
                key={r.task.id}
                task={r.task}
                rowIndex={r.index}
                rowHeight={rowHeight}
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
                      rowHeight={rowHeight}
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
