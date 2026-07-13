export function startBackupWorker(storagePath?: string): void {
  // Minimal backup worker. This intentionally does not perform any destructive
  // operations and only logs activity. Integrate with the host job/queue system
  // (BullMQ, Agenda, etc.) in Phase 2 for production-grade scheduling.
  if (process.env.DEV_STUDIO_ENABLED !== 'true') {
    console.log('Developer Studio disabled — backup worker not started');
    return;
  }

  const intervalMs = Number(process.env.BACKUP_INTERVAL_MS) || 24 * 60 * 60 * 1000; // default daily
  console.log(`DevStudio backup worker starting (interval: ${intervalMs}ms)`);

  setInterval(async () => {
    try {
      // TODO: enumerate owners, create backups, store metadata in backups table.
      console.log('DevStudio backup worker: running scheduled check (placeholder)');
      // Placeholder - do nothing destructive.
    } catch (e) {
      console.error('DevStudio backup worker error', e);
    }
  }, intervalMs);
}

export default startBackupWorker;
