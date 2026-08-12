import type { Baseline, ProjectState } from '../types';
import type { BaselineDiff } from '../state/baselineDiff';

interface Props {
  baseline: Baseline;
  diff: BaselineDiff;
  state: ProjectState;
}

function fmtDelta(n: number): string {
  if (n === 0) return '±0';
  return n > 0 ? `+${n}` : `${n}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

// Compact banner summarising the plan's drift against the selected baseline: milestone slips,
// change counts and any tasks that were removed since the baseline was taken.
export function BaselineImpact({ baseline, diff, state }: Props) {
  // Summary/parent rows are derived rollups — their dates shift whenever a child does, so
  // counting them would double-count. Only count real (leaf) tasks in the change totals.
  const parentIds = new Set<string>();
  for (const t of Object.values(state.tasks)) {
    if (t.parentId) parentIds.add(t.parentId);
  }
  let shifted = 0;
  let renamed = 0;
  let added = 0;
  for (const [id, d] of diff.byId.entries()) {
    if (parentIds.has(id)) continue;
    if (d.kind === 'shifted') shifted++;
    else if (d.kind === 'renamed') renamed++;
    else if (d.kind === 'new') added++;
  }
  const removed = diff.removed.length;

  // Milestone slips: current milestones (durationDays 0) that existed in the baseline and moved.
  const milestoneSlips = Object.values(state.tasks)
    .filter((t) => t.durationDays === 0)
    .map((t) => ({ id: t.id, name: t.name, d: diff.byId.get(t.id) }))
    .filter((m) => m.d && m.d.kind !== 'new' && m.d.finishDeltaWorkingDays !== 0)
    .map((m) => ({ id: m.id, name: m.name, delta: m.d!.finishDeltaWorkingDays }))
    .sort((a, b) => b.delta - a.delta);

  const chip: React.CSSProperties = {
    fontSize: 11,
    padding: '1px 7px',
    borderRadius: 10,
    background: '#e2e8f0',
    color: '#334155',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '5px 12px',
        background: '#eef2ff',
        borderBottom: '1px solid #c7d2fe',
        fontSize: 12,
        color: '#1e293b',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 600 }}>
        Vergleich mit Baseline „{baseline.name}"
      </span>
      <span style={{ color: '#64748b' }}>({fmtDate(baseline.savedAt)})</span>

      <span style={{ width: 1, height: 16, background: '#c7d2fe' }} />

      {milestoneSlips.length > 0 ? (
        milestoneSlips.map((m) => (
          <span
            key={m.id}
            style={{
              ...chip,
              background: m.delta > 0 ? '#fee2e2' : '#dcfce7',
              color: m.delta > 0 ? '#991b1b' : '#166534',
              fontWeight: 600,
            }}
            title="Verschiebung des Meilenstein-Termins in Arbeitstagen"
          >
            ◆ {m.name}: {fmtDelta(m.delta)} AT
          </span>
        ))
      ) : (
        <span style={{ color: '#64748b' }}>Keine Meilenstein-Verschiebung</span>
      )}

      <span style={{ flex: 1 }} />

      <span style={chip} title="Tasks mit verschobenem Termin">{shifted} verschoben</span>
      {renamed > 0 ? <span style={chip} title="Umbenannte Tasks">{renamed} umbenannt</span> : null}
      {added > 0 ? (
        <span style={{ ...chip, background: '#dcfce7', color: '#166534' }} title="Seit der Baseline neu hinzugekommen">
          {added} neu
        </span>
      ) : null}
      {removed > 0 ? (
        <span
          style={{ ...chip, background: '#fee2e2', color: '#991b1b' }}
          title={`Seit der Baseline entfernt: ${diff.removed.map((r) => r.snapshot.name).join(', ')}`}
        >
          {removed} entfernt
        </span>
      ) : null}
    </div>
  );
}
