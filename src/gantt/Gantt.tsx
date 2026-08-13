import { forwardRef, useMemo, useState } from 'react';
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
  showDependencies: boolean;
  hoveredRowId: string | null;
  onRowHover: (rowId: string | null) => void;
  onScroll: (top: number) => void;
}

export const Gantt = forwardRef<HTMLDivElement, Props>(function Gantt({ state, rows, rowHeight, showDependencies, hoveredRowId, onRowHover, onScroll }, ref) {
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
  const hoveredIdx = hoveredRowId != null ? visibleIndexById.get(hoveredRowId) : undefined;

  // Dependency-path highlighting on hover (no click needed).
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const successorsOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of Object.values(state.tasks)) {
      for (const dep of t.predecessors) {
        const arr = m.get(dep.predecessorId);
        if (arr) arr.push(t.id);
        else m.set(dep.predecessorId, [t.id]);
      }
    }
    return m;
  }, [state.tasks]);

  // Transitive predecessors + successors of the hovered task, plus the edges connecting them.
  const highlight = useMemo(() => {
    if (!hoveredId || !state.tasks[hoveredId]) return null;
    const nodes = new Set<string>([hoveredId]);
    const edges = new Set<string>();
    const up = [hoveredId];
    while (up.length) {
      const n = up.pop()!;
      const t = state.tasks[n];
      if (!t) continue;
      for (const dep of t.predecessors) {
        edges.add(`${dep.predecessorId}->${n}`);
        if (!nodes.has(dep.predecessorId)) {
          nodes.add(dep.predecessorId);
          up.push(dep.predecessorId);
        }
      }
    }
    const down = [hoveredId];
    while (down.length) {
      const n = down.pop()!;
      for (const succ of successorsOf.get(n) ?? []) {
        edges.add(`${n}->${succ}`);
        if (!nodes.has(succ)) {
          nodes.add(succ);
          down.push(succ);
        }
      }
    }
    return { nodes, edges };
  }, [hoveredId, state.tasks, successorsOf]);

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
          <svg
            width={metrics.width}
            height={Math.max(bodyHeight, 1)}
            style={{ display: 'block' }}
            onMouseMove={(e) => {
              const top = e.currentTarget.getBoundingClientRect().top;
              const idx = Math.floor((e.clientY - top) / rowHeight);
              onRowHover(idx >= 0 && idx < rows.length ? rows[idx].task.id : null);
            }}
            onMouseLeave={() => onRowHover(null)}
          >
            <defs>
              <pattern id="rowStripe" x="0" y="0" width={metrics.pxPerDay * 7} height={rowHeight * 2} patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width={metrics.pxPerDay * 7} height={rowHeight} fill="#ffffff" />
                <rect x="0" y={rowHeight} width={metrics.pxPerDay * 7} height={rowHeight} fill="#f8fafc" />
              </pattern>
            </defs>
            <rect x={0} y={0} width={metrics.width} height={bodyHeight} fill="url(#rowStripe)" />
            {hoveredIdx !== undefined ? (
              <rect x={0} y={hoveredIdx * rowHeight} width={metrics.width} height={rowHeight} fill="#e5edf7" />
            ) : null}
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
            {rows.map((r) => (
              <Bar
                key={r.task.id}
                task={r.task}
                rowIndex={r.index}
                rowHeight={rowHeight}
                metrics={metrics}
                isSummary={r.hasChildren}
                dimmed={!!highlight && !highlight.nodes.has(r.task.id)}
                onHover={setHoveredId}
              />
            ))}
            {/* Grey baseline bars are drawn ON TOP of the live bars: the coloured plan shows
                only where it extends beyond the baseline (later start / longer duration). */}
            {baseline
              ? rows.flatMap((r) => {
                  const snap = baseline.tasks[r.task.id];
                  if (!snap) return [];
                  return [
                    <GhostBar
                      key={`ghost-${r.task.id}`}
                      snapshot={snap}
                      rowIndex={r.index}
                      rowHeight={rowHeight}
                      metrics={metrics}
                      isSummary={r.hasChildren}
                      complete={r.task.status === 'Complete'}
                    />,
                  ];
                })
              : null}
            {showDependencies ? rows.flatMap((r) => {
              const succIdx = visibleIndexById.get(r.task.id);
              if (succIdx === undefined) return [];
              return r.task.predecessors
                .map((dep) => {
                  const predIdx = visibleIndexById.get(dep.predecessorId);
                  const pred = state.tasks[dep.predecessorId];
                  if (predIdx === undefined || !pred) return null;
                  const edgeKey = `${dep.predecessorId}->${r.task.id}`;
                  const isHi = highlight?.edges.has(edgeKey) ?? false;
                  return (
                    <DependencyArrow
                      key={`${edgeKey}-${dep.type}`}
                      pred={pred}
                      succ={r.task}
                      predRowIndex={predIdx}
                      succRowIndex={succIdx}
                      rowHeight={rowHeight}
                      type={dep.type}
                      metrics={metrics}
                      highlighted={isHi}
                      dimmed={!!highlight && !isHi}
                    />
                  );
                })
                .filter(Boolean) as JSX.Element[];
            }) : null}
          </svg>
        </div>
      </div>
    </div>
  );
});
