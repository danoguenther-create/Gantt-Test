import { useEffect, useState } from 'react';
import { useProject, useSaveMeta, useWorkspace } from './state/store';
import { exportJson, jsonExportFilename } from './state/persistence';
import { useNow } from './state/useNow';

const REMINDER_THRESHOLD_MS = 30 * 60 * 1000;

export function ExportReminder() {
  const { lastSavedAt, lastExportedAt, markExported } = useSaveMeta();
  const state = useProject();
  const workspace = useWorkspace();
  const now = useNow(60_000);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty = lastSavedAt && (!lastExportedAt || lastSavedAt > lastExportedAt);
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [lastSavedAt, lastExportedAt]);

  const hasUnexportedChanges = lastSavedAt !== null && (!lastExportedAt || lastSavedAt > lastExportedAt);
  const exportAge = lastExportedAt ? now - lastExportedAt : Infinity;
  const dismissedRecently = dismissedAt !== null && now - dismissedAt < REMINDER_THRESHOLD_MS;
  const show = hasUnexportedChanges && exportAge > REMINDER_THRESHOLD_MS && !dismissedRecently;

  if (!show) return null;

  return (
    <div
      style={{
        background: '#fef3c7',
        borderBottom: '1px solid #f59e0b',
        padding: '6px 12px',
        fontSize: 12,
        color: '#92400e',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 600 }}>⚠ Backup reminder</span>
      <span>
        {lastExportedAt
          ? `It has been a while since your last JSON export. localStorage alone is not a durable backup.`
          : `You have not exported a JSON backup yet. localStorage alone is not a durable backup.`}
      </span>
      <span style={{ flex: 1 }} />
      <button
        style={{
          padding: '3px 10px',
          fontSize: 12,
          border: '1px solid #b45309',
          background: '#f59e0b',
          color: '#1f2937',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 600,
        }}
        onClick={() => {
          const name = workspace.projects[workspace.currentProjectId]?.name ?? 'project';
          exportJson(state, jsonExportFilename(name));
          markExported();
        }}
      >
        Export now
      </button>
      <button
        style={{
          padding: '3px 10px',
          fontSize: 12,
          border: '1px solid #d4d4d8',
          background: '#fff',
          borderRadius: 4,
          cursor: 'pointer',
        }}
        onClick={() => setDismissedAt(Date.now())}
        title="Hide for 30 minutes"
      >
        Dismiss
      </button>
    </div>
  );
}
