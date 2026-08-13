import { jsPDF } from 'jspdf';
import type { ProjectState, Task } from './types';
import { computeVisibleRows } from './state/visibleRows';
import { computeTicks, computeTimeline, pxForDate } from './gantt/timeline';
import { COLUMNS, DELTA_COLUMN_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, ROW_NUMBER_WIDTH } from './grid/columns';
import { BAR_HEIGHT } from './gantt/constants';
import { formatPredecessors } from './scheduling/predecessors';
import { activeBaseline, computeBaselineDiff } from './state/baselineDiff';

const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const PX_TO_MM = 0.264583;
const MIN_PAGE_MM = { w: 297, h: 210 };
const MAX_PAGE_MM = { w: 1600, h: 1100 };

function svgEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellValue(task: Task, depth: number, hasChildren: boolean, columnId: string): string {
  switch (columnId) {
    case 'name': {
      const indent = '  '.repeat(Math.max(0, depth));
      const chev = hasChildren ? '▸ ' : '';
      return `${indent}${chev}${task.name}`;
    }
    case 'assignee':
      return task.assignee ?? '';
    case 'status':
      return task.status;
    case 'start':
      return task.start;
    case 'finish':
      return task.finish;
    case 'duration':
      return `${task.durationDays}d`;
    case 'predecessors':
      return formatPredecessors(task.predecessors);
    default:
      return '';
  }
}

function truncateForWidth(text: string, widthPx: number): string {
  const maxChars = Math.max(3, Math.floor(widthPx / 6.2));
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + '…';
}

function expandAll(state: ProjectState): ProjectState {
  const tasks: ProjectState['tasks'] = {};
  for (const [id, t] of Object.entries(state.tasks)) {
    tasks[id] = { ...t, collapsed: false };
  }
  return { ...state, tasks };
}

interface BuiltSvg {
  svg: string;
  width: number;
  height: number;
}

function buildExportSvg(state: ProjectState, projectName: string, expand: boolean): BuiltSvg {
  const expanded = expand ? expandAll(state) : state;
  const rows = computeVisibleRows(expanded);
  const metrics = computeTimeline(expanded);
  const ticks = computeTicks(metrics, expanded.zoom);

  const baseline = activeBaseline(expanded);
  const diff = computeBaselineDiff(expanded, baseline);
  const showDelta = !!baseline;
  const deltaW = showDelta ? DELTA_COLUMN_WIDTH : 0;

  const gridContentWidth = COLUMNS.reduce((a, c) => a + c.width, 0) + deltaW;
  const gridWidth = ROW_NUMBER_WIDTH + gridContentWidth;
  const ganttWidth = metrics.width;
  const titleHeight = 36;
  const totalWidth = gridWidth + ganttWidth;
  const totalHeight = titleHeight + HEADER_HEIGHT + Math.max(rows.length, 1) * ROW_HEIGHT;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" font-family='${FONT}'>`,
  );
  parts.push(`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff"/>`);

  parts.push(
    `<text x="12" y="22" font-size="16" font-weight="700" fill="#0f172a">${svgEscape(projectName)}</text>`,
  );
  const exportedLabel = `Exported ${new Date().toLocaleString()} — ${rows.length} tasks`;
  parts.push(
    `<text x="${totalWidth - 12}" y="22" text-anchor="end" font-size="11" fill="#64748b">${svgEscape(exportedLabel)}</text>`,
  );
  parts.push(`<line x1="0" y1="${titleHeight - 0.5}" x2="${totalWidth}" y2="${titleHeight - 0.5}" stroke="#cbd5e1"/>`);

  const headerY = titleHeight;
  parts.push(`<rect x="0" y="${headerY}" width="${totalWidth}" height="${HEADER_HEIGHT}" fill="#f1f5f9"/>`);

  parts.push(
    `<rect x="0" y="${headerY}" width="${ROW_NUMBER_WIDTH}" height="${HEADER_HEIGHT}" fill="#f8fafc"/>`,
  );
  parts.push(
    `<text x="${ROW_NUMBER_WIDTH / 2}" y="${headerY + 22}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">#</text>`,
  );
  parts.push(`<line x1="${ROW_NUMBER_WIDTH}" y1="${headerY}" x2="${ROW_NUMBER_WIDTH}" y2="${headerY + HEADER_HEIGHT}" stroke="#cbd5e1"/>`);

  let xPos = ROW_NUMBER_WIDTH;
  for (const c of COLUMNS) {
    parts.push(
      `<text x="${xPos + 8}" y="${headerY + 22}" font-size="11" font-weight="600" fill="#334155">${svgEscape(c.header)}</text>`,
    );
    parts.push(`<line x1="${xPos + c.width}" y1="${headerY}" x2="${xPos + c.width}" y2="${headerY + HEADER_HEIGHT}" stroke="#cbd5e1"/>`);
    xPos += c.width;
  }
  if (showDelta) {
    parts.push(
      `<text x="${xPos + 8}" y="${headerY + 22}" font-size="11" font-weight="600" fill="#334155">${svgEscape('Δ Baseline')}</text>`,
    );
    parts.push(`<line x1="${xPos + deltaW}" y1="${headerY}" x2="${xPos + deltaW}" y2="${headerY + HEADER_HEIGHT}" stroke="#cbd5e1"/>`);
  }

  const ganttHeaderX = gridWidth;
  parts.push(`<line x1="${ganttHeaderX}" y1="${headerY}" x2="${ganttHeaderX}" y2="${totalHeight}" stroke="#cbd5e1"/>`);

  for (const t of ticks.majorTicks) {
    const tx = ganttHeaderX + t.x;
    parts.push(`<line x1="${tx}" y1="${headerY}" x2="${tx}" y2="${totalHeight}" stroke="#e2e8f0"/>`);
    parts.push(
      `<text x="${tx + 4}" y="${headerY + 14}" font-size="10" font-weight="600" fill="#334155">${svgEscape(t.label)}</text>`,
    );
  }
  for (const t of ticks.minorTicks) {
    parts.push(
      `<text x="${ganttHeaderX + t.x + 2}" y="${headerY + HEADER_HEIGHT - 4}" font-size="9" fill="#64748b">${svgEscape(t.label)}</text>`,
    );
  }
  parts.push(`<line x1="0" y1="${headerY + HEADER_HEIGHT - 0.5}" x2="${totalWidth}" y2="${headerY + HEADER_HEIGHT - 0.5}" stroke="#cbd5e1"/>`);

  const bodyY = titleHeight + HEADER_HEIGHT;

  for (const row of rows) {
    const y = bodyY + row.index * ROW_HEIGHT;
    const bg = row.index % 2 === 1 ? '#fafbfc' : '#ffffff';
    parts.push(`<rect x="0" y="${y}" width="${totalWidth}" height="${ROW_HEIGHT}" fill="${bg}"/>`);

    parts.push(
      `<text x="${ROW_NUMBER_WIDTH - 6}" y="${y + 18}" text-anchor="end" font-size="11" fill="#64748b">${svgEscape(row.task.id)}</text>`,
    );
    parts.push(`<line x1="${ROW_NUMBER_WIDTH}" y1="${y}" x2="${ROW_NUMBER_WIDTH}" y2="${y + ROW_HEIGHT}" stroke="#e5e7eb"/>`);

    let cellX = ROW_NUMBER_WIDTH;
    for (const c of COLUMNS) {
      const raw = cellValue(row.task, row.depth, row.hasChildren, c.id);
      const value = truncateForWidth(raw, c.width - 16);
      const fontWeight = c.id === 'name' && row.hasChildren ? 600 : 400;
      const color = row.task.hasError ? '#b91c1c' : '#1f2937';
      parts.push(
        `<text x="${cellX + 8}" y="${y + 18}" font-size="11" font-weight="${fontWeight}" fill="${color}">${svgEscape(value)}</text>`,
      );
      parts.push(`<line x1="${cellX + c.width}" y1="${y}" x2="${cellX + c.width}" y2="${y + ROW_HEIGHT}" stroke="#e5e7eb"/>`);
      cellX += c.width;
    }
    if (showDelta) {
      const d = diff.byId.get(row.task.id);
      const text = !d ? '' : d.kind === 'new' ? 'neu' : d.finishDeltaWorkingDays === 0 ? '0' : d.finishDeltaWorkingDays > 0 ? `+${d.finishDeltaWorkingDays}` : `${d.finishDeltaWorkingDays}`;
      const color =
        !d || d.kind === 'new'
          ? '#16a34a'
          : d.finishDeltaWorkingDays > 0
            ? '#dc2626'
            : d.finishDeltaWorkingDays < 0
              ? '#16a34a'
              : '#64748b';
      if (text) {
        parts.push(
          `<text x="${cellX + deltaW - 8}" y="${y + 18}" text-anchor="end" font-size="11" font-weight="600" fill="${color}">${svgEscape(text)}</text>`,
        );
      }
      parts.push(`<line x1="${cellX + deltaW}" y1="${y}" x2="${cellX + deltaW}" y2="${y + ROW_HEIGHT}" stroke="#e5e7eb"/>`);
    }
    parts.push(`<line x1="0" y1="${y + ROW_HEIGHT - 0.5}" x2="${totalWidth}" y2="${y + ROW_HEIGHT - 0.5}" stroke="#eef2f7"/>`);

    const task = row.task;
    const barX = ganttHeaderX + pxForDate(metrics, task.start);
    const barXEnd = ganttHeaderX + pxForDate(metrics, task.finish) + metrics.pxPerDay;
    const barW = Math.max(barXEnd - barX, 2);
    const barH = 16;
    const barY = y + (ROW_HEIGHT - barH) / 2;

    if (task.durationDays === 0) {
      const cx = barX + metrics.pxPerDay / 2;
      const cy = barY + barH / 2;
      const s = barH / 2 + 1;
      const msColor = task.status === 'Complete' ? '#16a34a' : '#0f172a';
      parts.push(`<polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}" fill="${msColor}"/>`);
      const label = svgEscape(truncateForWidth(task.name, Math.max(0, ganttWidth - (cx + s - ganttHeaderX) - 8)));
      if (label) {
        parts.push(
          `<text x="${cx + s + 4}" y="${barY + barH - 4}" font-size="10" font-weight="600" fill="#0f172a">${label}</text>`,
        );
      }
    } else if (row.hasChildren) {
      const midY = barY + barH / 2;
      parts.push(`<rect x="${barX}" y="${midY - 2}" width="${barW}" height="4" fill="#334155"/>`);
      const capW = 6;
      const capH = 4;
      parts.push(`<polygon points="${barX},${midY - 2} ${barX + capW},${midY - 2} ${barX},${midY - 2 + capH}" fill="#334155"/>`);
      parts.push(`<polygon points="${barXEnd},${midY - 2} ${barXEnd - capW},${midY - 2} ${barXEnd},${midY - 2 + capH}" fill="#334155"/>`);
      const label = svgEscape(truncateForWidth(task.name, Math.max(0, ganttWidth - (barXEnd - ganttHeaderX) - 8)));
      if (label) {
        parts.push(
          `<text x="${barXEnd + 4}" y="${barY + barH - 4}" font-size="10" font-weight="600" fill="#0f172a">${label}</text>`,
        );
      }
    } else {
      const inProgress = task.status === 'In Progress';
      const complete = task.status === 'Complete';
      const fill = task.hasError ? '#fecaca' : complete ? '#bbf7d0' : inProgress ? '#fde68a' : '#60a5fa';
      const stroke = task.hasError ? '#b91c1c' : complete ? '#16a34a' : inProgress ? '#d97706' : '#2563eb';
      parts.push(
        `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="3" ry="3" fill="${fill}" stroke="${stroke}"/>`,
      );
      const label = svgEscape(truncateForWidth(task.name, Math.max(0, ganttWidth - (barX - ganttHeaderX) - barW - 12)));
      if (label) {
        parts.push(
          `<text x="${barXEnd + 4}" y="${barY + barH - 4}" font-size="10" fill="#1f2937">${label}</text>`,
        );
      }
    }

    // Grey baseline ghost drawn ON TOP of the live bar — same shape, colour only. The coloured
    // plan shows only where it extends beyond the baseline (later start / longer duration).
    if (baseline) {
      const snap = baseline.tasks[task.id];
      if (snap) {
        const gBarY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
        const gx = ganttHeaderX + pxForDate(metrics, snap.start);
        const gxEnd = ganttHeaderX + pxForDate(metrics, snap.finish) + metrics.pxPerDay;
        const gw = Math.max(gxEnd - gx, 2);
        if (snap.durationDays === 0) {
          const gcx = gx + metrics.pxPerDay / 2;
          const gcy = gBarY + BAR_HEIGHT / 2;
          const gs = BAR_HEIGHT / 2 + 1;
          parts.push(`<polygon points="${gcx},${gcy - gs} ${gcx + gs},${gcy} ${gcx},${gcy + gs} ${gcx - gs},${gcy}" fill="#94a3b8"/>`);
        } else if (row.hasChildren) {
          const midY = gBarY + BAR_HEIGHT / 2;
          const capW = 6;
          const capH = 4;
          parts.push(`<rect x="${gx}" y="${midY - 2}" width="${gw}" height="4" fill="#94a3b8"/>`);
          parts.push(`<polygon points="${gx},${midY - 2} ${gx + capW},${midY - 2} ${gx},${midY - 2 + capH}" fill="#94a3b8"/>`);
          parts.push(`<polygon points="${gxEnd},${midY - 2} ${gxEnd - capW},${midY - 2} ${gxEnd},${midY - 2 + capH}" fill="#94a3b8"/>`);
        } else {
          parts.push(`<rect x="${gx}" y="${gBarY}" width="${gw}" height="${BAR_HEIGHT}" rx="3" ry="3" fill="#cbd5e1" stroke="#94a3b8"/>`);
        }
      }
    }
  }

  const rowIndexById = new Map<string, number>();
  rows.forEach((r) => rowIndexById.set(r.task.id, r.index));
  for (const row of rows) {
    const succIdx = row.index;
    for (const dep of row.task.predecessors) {
      const predIdx = rowIndexById.get(dep.predecessorId);
      const pred = expanded.tasks[dep.predecessorId];
      if (predIdx === undefined || !pred) continue;
      const predY = bodyY + predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const succY = bodyY + succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const predX = ganttHeaderX + pxForDate(metrics, pred.finish) + metrics.pxPerDay;
      const succX = ganttHeaderX + pxForDate(metrics, row.task.start);
      const stepOut = predX + 8;
      const arrowW = 6;
      parts.push(
        `<polyline points="${predX},${predY} ${stepOut},${predY} ${stepOut},${succY} ${succX},${succY}" fill="none" stroke="#475569" stroke-width="1"/>`,
      );
      parts.push(
        `<polygon points="${succX},${succY} ${succX - arrowW},${succY - 4} ${succX - arrowW},${succY + 4}" fill="#475569"/>`,
      );
    }
  }

  parts.push(`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="none" stroke="#cbd5e1"/>`);
  parts.push(`</svg>`);

  return { svg: parts.join(''), width: totalWidth, height: totalHeight };
}

async function svgToPng(svgString: string, width: number, height: number, scale: number): Promise<string> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to rasterize SVG for PDF export'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface PdfExportOptions {
  /** When true, keep the current view: collapsed parent rows stay collapsed. Default expands all rows. */
  respectCollapsed?: boolean;
}

export async function exportProjectPdf(
  state: ProjectState,
  projectName: string,
  filename: string,
  options: PdfExportOptions = {},
): Promise<void> {
  const { svg, width, height } = buildExportSvg(state, projectName, !options.respectCollapsed);

  let pageW = width * PX_TO_MM;
  let pageH = height * PX_TO_MM;
  const scaleDown = Math.min(MAX_PAGE_MM.w / pageW, MAX_PAGE_MM.h / pageH, 1);
  pageW *= scaleDown;
  pageH *= scaleDown;
  if (pageW < MIN_PAGE_MM.w) pageW = MIN_PAGE_MM.w;
  if (pageH < MIN_PAGE_MM.h) pageH = MIN_PAGE_MM.h;

  const rasterScale = Math.max(1.5, Math.min(3, 1600 / Math.max(width, height)));
  const png = await svgToPng(svg, width, height, rasterScale);

  const pdf = new jsPDF({
    orientation: pageW >= pageH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
    compress: true,
  });

  const imgWmm = width * PX_TO_MM * scaleDown;
  const imgHmm = height * PX_TO_MM * scaleDown;
  const offsetX = (pageW - imgWmm) / 2;
  const offsetY = (pageH - imgHmm) / 2;
  pdf.addImage(png, 'PNG', offsetX, offsetY, imgWmm, imgHmm, undefined, 'FAST');

  pdf.save(filename);
}
