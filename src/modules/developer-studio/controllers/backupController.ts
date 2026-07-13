export async function createBackup(req: any, res: any): Promise<void> {
  // Placeholder API for initiating a backup. Real implementation must be
  // owner-only and should enqueue a backup job and store metadata in DB.
  try {
    if (res && typeof res.json === 'function') {
      res.json({ status: 'backup-requested', id: null });
    }
  } catch (e) {
    // no-op
  }
}

export default { createBackup };
