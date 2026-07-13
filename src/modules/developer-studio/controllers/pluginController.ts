export async function listPlugins(req: any, res: any): Promise<void> {
  try {
    if (res && typeof res.json === 'function') {
      res.json({ plugins: [] });
    }
  } catch (e) {
    // no-op
  }
}

export default { listPlugins };
