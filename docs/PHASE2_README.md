# Phase 2: Owner-only middleware and backup worker

This PR adds a minimal owner-only middleware and a placeholder backup worker.
Everything is implemented to be safe when merged into main: feature is disabled by default.

What I will do next in Phase 2:
- Implement real DB interactions in services/repos using project's DB client/ORM.
- Wire `devStudioRoutes` into the main router behind `DEV_STUDIO_ENABLED` flag.
- Implement queued backup jobs and restore flows with dry-run safety.
- Add integration/unit tests for Owner guard and backup initiation.
