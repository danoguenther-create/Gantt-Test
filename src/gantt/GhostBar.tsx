import type { BaselineTaskSnapshot } from '../types';
import { pxForDate, type TimelineMetrics } from './timeline';
import { BAR_HEIGHT } from './constants';

interface Props {
  snapshot: BaselineTaskSnapshot;
  rowIndex: number;
  rowHeight: number;
  metrics: TimelineMetrics;
  isSummary: boolean;
  complete?: boolean; // live task is completed -> tint the ghost green (but keep it lighter than the live bar)
}

const GHOST_FILL = '#cbd5e1';
const GHOST_STROKE = '#94a3b8';
const GHOST_SOLID = '#94a3b8'; // milestone / summary
// Completed: a lighter green than the live bar (#bbf7d0) so it still reads as a ghost.
const GHOST_DONE_FILL = '#dcfce7';
const GHOST_DONE_STROKE = '#16a34a';

export function GhostBar({ snapshot, rowIndex, rowHeight, metrics, isSummary, complete }: Props) {
  const y = rowIndex * rowHeight + (rowHeight - BAR_HEIGHT) / 2;
  const xStart = pxForDate(metrics, snapshot.start);
  const xFinish = pxForDate(metrics, snapshot.finish) + metrics.pxPerDay;
  const width = Math.max(xFinish - xStart, 2);

  const leafFill = complete ? GHOST_DONE_FILL : GHOST_FILL;
  const leafStroke = complete ? GHOST_DONE_STROKE : GHOST_STROKE;
  // Milestone stays recognisable as a ghost: light-green fill with a fine green outline when done.
  const msFill = complete ? GHOST_DONE_FILL : GHOST_SOLID;
  const msStroke = complete ? GHOST_DONE_STROKE : GHOST_SOLID;

  if (snapshot.durationDays === 0) {
    const cx = xStart + metrics.pxPerDay / 2;
    const cy = y + BAR_HEIGHT / 2;
    const s = BAR_HEIGHT / 2 + 1;
    return (
      <g pointerEvents="none">
        <polygon
          points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
          fill={msFill}
          stroke={msStroke}
        />
        <title>Baseline: {snapshot.name}</title>
      </g>
    );
  }

  if (isSummary) {
    const capW = 6;
    const capH = 4;
    return (
      <g pointerEvents="none">
        <rect x={xStart} y={y + BAR_HEIGHT / 2 - 2} width={width} height={4} fill={GHOST_SOLID} />
        <polygon points={`${xStart},${y + BAR_HEIGHT / 2 - 2} ${xStart + capW},${y + BAR_HEIGHT / 2 - 2} ${xStart},${y + BAR_HEIGHT / 2 - 2 + capH}`} fill={GHOST_SOLID} />
        <polygon points={`${xFinish},${y + BAR_HEIGHT / 2 - 2} ${xFinish - capW},${y + BAR_HEIGHT / 2 - 2} ${xFinish},${y + BAR_HEIGHT / 2 - 2 + capH}`} fill={GHOST_SOLID} />
        <title>Baseline: {snapshot.name}</title>
      </g>
    );
  }

  return (
    <g pointerEvents="none">
      <rect x={xStart} y={y} width={width} height={BAR_HEIGHT} rx={3} ry={3} fill={leafFill} stroke={leafStroke} />
      <title>Baseline: {snapshot.name}</title>
    </g>
  );
}
