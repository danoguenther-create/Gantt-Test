import type { TickConfig, TimelineMetrics } from './timeline';
import { HEADER_HEIGHT } from '../grid/columns';

interface Props {
  metrics: TimelineMetrics;
  ticks: TickConfig;
}

export function TimelineHeader({ metrics, ticks }: Props) {
  return (
    <svg
      width={metrics.width}
      height={HEADER_HEIGHT}
      style={{ display: 'block', background: '#f8fafc' }}
    >
      <line x1={0} y1={HEADER_HEIGHT - 0.5} x2={metrics.width} y2={HEADER_HEIGHT - 0.5} stroke="#cbd5e1" />
      {ticks.majorTicks.map((t) => (
        <g key={`M${t.iso}`}>
          <line x1={t.x} y1={0} x2={t.x} y2={HEADER_HEIGHT} stroke="#cbd5e1" />
          <text x={t.x + 4} y={14} fontSize={11} fontWeight={600} fill="#334155">
            {t.label}
          </text>
        </g>
      ))}
      {ticks.minorTicks.map((t) => (
        <text key={`m${t.iso}`} x={t.x + 2} y={HEADER_HEIGHT - 4} fontSize={10} fill="#64748b">
          {t.label}
        </text>
      ))}
    </svg>
  );
}
