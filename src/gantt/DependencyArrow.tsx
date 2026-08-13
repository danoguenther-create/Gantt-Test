import type { DepType, Task } from '../types';
import { pxForDate, type TimelineMetrics } from './timeline';
import { BAR_HEIGHT } from './constants';

interface Props {
  pred: Task;
  succ: Task;
  predRowIndex: number;
  succRowIndex: number;
  rowHeight: number;
  type: DepType;
  metrics: TimelineMetrics;
  highlighted?: boolean;
  dimmed?: boolean;
}

export function DependencyArrow({ pred, succ, predRowIndex, succRowIndex, rowHeight, type, metrics, highlighted, dimmed }: Props) {
  const predYMid = predRowIndex * rowHeight + rowHeight / 2;
  const succYMid = succRowIndex * rowHeight + rowHeight / 2;
  const predStartX = pxForDate(metrics, pred.start);
  const predFinishX = pxForDate(metrics, pred.finish) + metrics.pxPerDay;
  const succStartX = pxForDate(metrics, succ.start);
  const succFinishX = pxForDate(metrics, succ.finish) + metrics.pxPerDay;

  let fromX: number;
  let toX: number;
  let toSide: 'left' | 'right';
  switch (type) {
    case 'FS':
      fromX = predFinishX;
      toX = succStartX;
      toSide = 'left';
      break;
    case 'SS':
      fromX = predStartX;
      toX = succStartX;
      toSide = 'left';
      break;
    case 'FF':
      fromX = predFinishX;
      toX = succFinishX;
      toSide = 'right';
      break;
    case 'SF':
      fromX = predStartX;
      toX = succFinishX;
      toSide = 'right';
      break;
  }

  const stepOut = type === 'FS' || type === 'FF' ? 8 : -8;
  const stepIn = toSide === 'left' ? -8 : 8;

  const midX = toX + stepIn;
  const intermediate = type === 'FS' || type === 'FF' ? fromX + stepOut : fromX + stepOut;
  const points = [
    `${fromX},${predYMid}`,
    `${intermediate},${predYMid}`,
    `${intermediate},${succYMid - (BAR_HEIGHT / 2 + 2) * Math.sign(succYMid - predYMid || 1)}`,
    `${midX},${succYMid}`,
    `${toX},${succYMid}`,
  ];

  const arrowDir = toSide === 'left' ? 1 : -1;
  const arrow = `${toX},${succYMid} ${toX - 6 * arrowDir},${succYMid - 4} ${toX - 6 * arrowDir},${succYMid + 4}`;

  const color = highlighted ? '#1d4ed8' : '#475569';
  const strokeWidth = highlighted ? 2 : 1;
  const opacity = dimmed ? 0.12 : 1;

  return (
    <g opacity={opacity}>
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <polygon points={arrow} fill={color} />
    </g>
  );
}
