import { useRef } from 'react';
import type { Task } from '../types';
import { useDispatch } from '../state/store';
import { pxForDate, type TimelineMetrics } from './timeline';
import { BAR_HEIGHT } from './constants';

interface Props {
  task: Task;
  rowIndex: number;
  rowHeight: number;
  metrics: TimelineMetrics;
  isSummary: boolean;
  dimmed?: boolean;
  onHover?: (id: string | null) => void;
}

export function Bar({ task, rowIndex, rowHeight, metrics, isSummary, dimmed, onHover }: Props) {
  const dispatch = useDispatch();
  const dragState = useRef<{ kind: 'move' | 'resize-start' | 'resize-end'; startX: number; committedDays: number } | null>(null);

  const y = rowIndex * rowHeight + (rowHeight - BAR_HEIGHT) / 2;
  const xStart = pxForDate(metrics, task.start);
  const xFinish = pxForDate(metrics, task.finish) + metrics.pxPerDay;
  const width = Math.max(xFinish - xStart, 2);

  const inProgress = task.status === 'In Progress';
  const fill = task.hasError ? '#fecaca' : isSummary ? '#334155' : inProgress ? '#fde68a' : '#60a5fa';
  const stroke = task.hasError ? '#b91c1c' : isSummary ? '#0f172a' : inProgress ? '#d97706' : '#2563eb';

  const onPointerDown = (kind: 'move' | 'resize-start' | 'resize-end') => (e: React.PointerEvent<SVGElement>) => {
    if (isSummary) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { kind, startX: e.clientX, committedDays: 0 };
  };

  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const deltaDays = Math.round(dx / metrics.pxPerDay);
    const inc = deltaDays - dragState.current.committedDays;
    if (inc === 0) return;
    dragState.current.committedDays = deltaDays;
    if (dragState.current.kind === 'move') {
      dispatch({ type: 'MOVE_TASK_DAYS', id: task.id, deltaWorkingDays: inc });
    } else if (dragState.current.kind === 'resize-start') {
      dispatch({ type: 'RESIZE_TASK_DAYS', id: task.id, deltaWorkingDays: inc, edge: 'start' });
    } else {
      dispatch({ type: 'RESIZE_TASK_DAYS', id: task.id, deltaWorkingDays: inc, edge: 'finish' });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (!dragState.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    dragState.current = null;
  };

  const gInteract = {
    opacity: dimmed ? 0.2 : 1,
    onMouseEnter: () => onHover?.(task.id),
    onMouseLeave: () => onHover?.(null),
  };

  if (task.durationDays === 0) {
    const cx = xStart + metrics.pxPerDay / 2;
    const cy = y + BAR_HEIGHT / 2;
    const s = BAR_HEIGHT / 2 + 1;
    return (
      <g {...gInteract}>
        <polygon
          points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
          fill="#0f172a"
          stroke="#0f172a"
          onPointerDown={onPointerDown('move')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ cursor: 'grab' }}
        />
        <text
          x={cx + s + 4}
          y={y + BAR_HEIGHT - 4}
          fontSize={11}
          fontWeight={600}
          fill="#0f172a"
          pointerEvents="none"
        >
          {task.name}
        </text>
        <title>{task.name}</title>
      </g>
    );
  }

  if (isSummary) {
    const capW = 6;
    const capH = 4;
    return (
      <g {...gInteract}>
        <rect x={xStart} y={y + BAR_HEIGHT / 2 - 2} width={width} height={4} fill={fill} />
        <polygon points={`${xStart},${y + BAR_HEIGHT / 2 - 2} ${xStart + capW},${y + BAR_HEIGHT / 2 - 2} ${xStart},${y + BAR_HEIGHT / 2 - 2 + capH}`} fill={fill} />
        <polygon points={`${xFinish},${y + BAR_HEIGHT / 2 - 2} ${xFinish - capW},${y + BAR_HEIGHT / 2 - 2} ${xFinish},${y + BAR_HEIGHT / 2 - 2 + capH}`} fill={fill} />
        <text
          x={xFinish + 4}
          y={y + BAR_HEIGHT - 4}
          fontSize={11}
          fontWeight={600}
          fill="#0f172a"
          pointerEvents="none"
        >
          {task.name}
        </text>
        <title>{task.name}</title>
      </g>
    );
  }

  return (
    <g {...gInteract}>
      <rect
        x={xStart}
        y={y}
        width={width}
        height={BAR_HEIGHT}
        rx={3}
        ry={3}
        fill={fill}
        stroke={stroke}
        style={{ cursor: 'grab' }}
        onPointerDown={onPointerDown('move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <rect
        x={xStart - 3}
        y={y}
        width={6}
        height={BAR_HEIGHT}
        fill="transparent"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={onPointerDown('resize-start')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <rect
        x={xFinish - 3}
        y={y}
        width={6}
        height={BAR_HEIGHT}
        fill="transparent"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={onPointerDown('resize-end')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <text
        x={xFinish + 4}
        y={y + BAR_HEIGHT - 4}
        fontSize={11}
        fill="#1f2937"
        pointerEvents="none"
      >
        {task.name}
      </text>
      <title>{task.name}</title>
    </g>
  );
}
