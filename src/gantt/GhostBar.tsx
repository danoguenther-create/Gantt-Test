import type { BaselineTaskSnapshot, Task } from '../types';
import { pxForDate, type TimelineMetrics } from './timeline';
import { BAR_HEIGHT } from './constants';

interface Props {
  snapshot: BaselineTaskSnapshot;
  task: Task; // live task, for the shift connector endpoint
  rowIndex: number;
  rowHeight: number;
  metrics: TimelineMetrics;
}

const GHOST_STROKE = '#94a3b8';
const GHOST_FILL = '#cbd5e1';
const GHOST_BAR_H = 5;

// Renders the saved baseline position of a task as a ghosted marker beneath the live bar,
// plus a thin connector to the live finish when the task has shifted. Non-interactive.
export function GhostBar({ snapshot, task, rowIndex, rowHeight, metrics }: Props) {
  const rowTop = rowIndex * rowHeight;
  const liveBarY = rowTop + (rowHeight - BAR_HEIGHT) / 2;

  // Milestone baseline -> hollow diamond at the baseline start.
  if (snapshot.durationDays === 0) {
    const cx = pxForDate(metrics, snapshot.start) + metrics.pxPerDay / 2;
    const cy = liveBarY + BAR_HEIGHT / 2;
    const s = BAR_HEIGHT / 2 + 1;
    const liveCx = pxForDate(metrics, task.start) + metrics.pxPerDay / 2;
    return (
      <g pointerEvents="none">
        {liveCx !== cx ? (
          <line x1={cx} y1={cy} x2={liveCx} y2={cy} stroke={GHOST_STROKE} strokeWidth={1} strokeDasharray="3 2" />
        ) : null}
        <polygon
          points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
          fill="none"
          stroke={GHOST_STROKE}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <title>Baseline: {snapshot.name}</title>
      </g>
    );
  }

  const xStart = pxForDate(metrics, snapshot.start);
  const xFinish = pxForDate(metrics, snapshot.finish) + metrics.pxPerDay;
  const width = Math.max(xFinish - xStart, 2);
  const ghostY = liveBarY + BAR_HEIGHT - 1; // thin bar just below the live bar
  const cy = ghostY + GHOST_BAR_H / 2;

  const liveFinishX = pxForDate(metrics, task.finish) + metrics.pxPerDay;

  return (
    <g pointerEvents="none">
      <rect
        x={xStart}
        y={ghostY}
        width={width}
        height={GHOST_BAR_H}
        rx={1.5}
        ry={1.5}
        fill={GHOST_FILL}
        stroke={GHOST_STROKE}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      {liveFinishX !== xFinish ? (
        <line x1={xFinish} y1={cy} x2={liveFinishX} y2={cy} stroke={GHOST_STROKE} strokeWidth={1} strokeDasharray="3 2" />
      ) : null}
      <title>Baseline: {snapshot.name}</title>
    </g>
  );
}
