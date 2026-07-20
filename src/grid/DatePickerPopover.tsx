import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string; // ISO yyyy-mm-dd, or '' if unset
  anchor: DOMRect;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const POPOVER_WIDTH = 232;
const POPOVER_HEIGHT = 268;

export function DatePickerPopover({ value, anchor, onSelect, onClose }: Props) {
  const initial = parseISO(value) ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const goPrev = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const goNext = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayISO = toISO(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const top = Math.max(4, Math.min(anchor.bottom + 2, window.innerHeight - POPOVER_HEIGHT - 4));
  const left = Math.max(4, Math.min(anchor.left, window.innerWidth - POPOVER_WIDTH - 4));

  const navBtn: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    width: 24,
    height: 24,
    fontSize: 13,
    lineHeight: '1',
    color: '#334155',
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        width: POPOVER_WIDTH,
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.18)',
        padding: 10,
        fontSize: 12,
        color: '#0f172a',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" style={navBtn} onClick={goPrev} title="Vorheriger Monat">‹</button>
        <div style={{ fontWeight: 600 }}>
          {MONTHS[viewMonth]} {viewYear}
        </div>
        <button type="button" style={navBtn} onClick={goNext} title="Nächster Monat">›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#94a3b8', padding: '2px 0' }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = toISO(new Date(viewYear, viewMonth, d));
          const isSelected = iso === value;
          const isToday = iso === todayISO;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelect(iso)}
              style={{
                height: 26,
                border: isToday && !isSelected ? '1px solid #93c5fd' : '1px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
                background: isSelected ? '#2563eb' : 'transparent',
                color: isSelected ? '#fff' : '#0f172a',
                fontSize: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
              title={iso}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          type="button"
          style={{ ...navBtn, width: 'auto', padding: '0 10px' }}
          onClick={() => onSelect(todayISO)}
          title="Heute auswählen"
        >
          Heute
        </button>
      </div>
    </div>
  );
}
