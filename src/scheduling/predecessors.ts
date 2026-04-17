import type { Dependency, DepType } from '../types';

const TOKEN_RE = /^\s*(\d+)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?\s*d?\s*$/i;

export function parsePredecessors(input: string): Dependency[] {
  if (!input) return [];
  const parts = input.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const deps: Dependency[] = [];
  for (const part of parts) {
    const m = TOKEN_RE.exec(part);
    if (!m) continue;
    const id = m[1];
    const type = (m[2]?.toUpperCase() as DepType) || 'FS';
    const lagDays = m[3] ? Number(m[3].replace(/\s+/g, '')) : 0;
    deps.push({ predecessorId: id, type, lagDays });
  }
  return deps;
}

export function formatPredecessors(deps: Dependency[]): string {
  return deps
    .map((d) => {
      const t = d.type === 'FS' ? '' : d.type;
      const lag = d.lagDays === 0 ? '' : `${d.lagDays > 0 ? '+' : ''}${d.lagDays}d`;
      return `${d.predecessorId}${t}${lag}`;
    })
    .join(', ');
}
