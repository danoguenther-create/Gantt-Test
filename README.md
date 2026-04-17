# Gantt Project Planner

A browser-based Gantt project planner with Smartsheet-like editing. Built with React + TypeScript + Vite. No backend — state persists to `localStorage` and can be exported/imported as JSON.

## Features

- Editable grid: task name, assignee, status, start, finish, duration, predecessors
- Hierarchical tasks with indent/outdent and collapse/expand
- SVG Gantt chart with day / week / month zoom levels
- Milestones (duration 0) render as diamonds
- Dependencies: `FS` (default), `SS`, `FF`, `SF`, with lag (`7FS+2d`, `5SS-1d`)
- Auto-scheduling over working days (Mon–Fri); cycle detection highlights offending rows
- Drag bars to reschedule; drag bar edges to resize
- Parent/summary rows automatically roll up start, finish, and duration
- JSON export / import (file) + auto-save to `localStorage`

## Run

```
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Build

```
npm run build
npm run preview
```

## Predecessor syntax

`<id>[type][±lag d]` separated by commas. Examples:

- `6` — Finish-to-Start from row 6
- `6FS+2d` — FS with 2 working-day lag
- `11, 12SS` — multiple predecessors
- `31FF` — Finish-to-Finish
