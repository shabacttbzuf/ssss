export async function startImpersonation(req: any, res: any): Promise<void> {
  try {
    if (res && typeof res.json === 'function') {
      res.json({ impersonation: 'started', target: req?.body?.targetUserId || null });
    }
  } catch (e) {
    // no-op
  }
}

export default { startImpersonation };
