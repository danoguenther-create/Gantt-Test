import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean; // renders a check mark (for toggles)
  danger?: boolean;
}

interface Props {
  label: ReactNode;
  items: Array<MenuItem | 'separator'>;
  disabled?: boolean;
  align?: 'left' | 'right';
  title?: string;
}

// Lightweight dropdown menu (no dependencies). Opens on click, closes on outside
// click / Escape / item selection.
export function Menu({ label, items, disabled, align = 'left', title }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid #cbd5e1',
    background: open ? '#e2e8f0' : '#fff',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={btnStyle} disabled={disabled} onClick={() => setOpen((o) => !o)} title={title}>
        {label}
        <span style={{ fontSize: 9, color: '#64748b' }}>▾</span>
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            [align]: 0,
            marginTop: 4,
            zIndex: 50,
            minWidth: 210,
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(15,23,42,0.18)',
            padding: 5,
          }}
        >
          {items.map((it, i) =>
            it === 'separator' ? (
              <div key={i} style={{ height: 1, background: '#e5e7eb', margin: '5px 6px' }} />
            ) : (
              <button
                key={i}
                disabled={it.disabled}
                onClick={() => {
                  if (it.disabled) return;
                  setOpen(false);
                  it.onClick?.();
                }}
                onMouseEnter={(e) => {
                  if (!it.disabled) e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  fontSize: 12,
                  border: 'none',
                  borderRadius: 5,
                  background: 'transparent',
                  cursor: it.disabled ? 'not-allowed' : 'pointer',
                  color: it.disabled ? '#94a3b8' : it.danger ? '#dc2626' : '#0f172a',
                }}
              >
                <span style={{ width: 14, flexShrink: 0, color: '#2563eb' }}>{it.checked ? '✓' : ''}</span>
                <span>{it.label}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
