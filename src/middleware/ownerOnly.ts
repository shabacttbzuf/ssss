export async function ownerOnlyMiddleware(req: any, res: any, next: any): Promise<any> {
  // Owner-only guard for Developer Studio endpoints.
  // Rules:
  // - If DEV_STUDIO_ENABLED !== 'true', the middleware short-circuits (feature disabled).
  // - Expects `req.user` to be populated by the application's auth layer.
  // - Grants access when user.role === 'owner' or user.isOwner === true.
  try {
    if (process.env.DEV_STUDIO_ENABLED !== 'true') {
      // Feature disabled: allow request to continue (or respond 404) depending on
      // how the host app wants to behave. Here we return 404-like payload to be explicit.
      if (res && typeof res.status === 'function') {
        return res.status(404).json({ error: 'Developer Studio disabled' });
      }
      return;
    }

    const user = req?.user;
    if (!user) {
      if (res && typeof res.status === 'function') {
        return res.status(401).json({ error: 'Unauthenticated' });
      }
      return;
    }

    const isOwner = (user.role && user.role === 'owner') || user.isOwner === true;
    if (!isOwner) {
      if (res && typeof res.status === 'function') {
        return res.status(403).json({ error: 'Forbidden: owner-only' });
      }
      return;
    }

    return next();
  } catch (e) {
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ error: 'Owner middleware error' });
    }
    return;
  }
}

export default ownerOnlyMiddleware;
