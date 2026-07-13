export async function listTemplates(req: any, res: any): Promise<void> {
  try {
    if (res && typeof res.json === 'function') {
      res.json({ templates: [] });
    }
  } catch (e) {
    // no-op
  }
}

export default { listTemplates };
