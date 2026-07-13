# Developer Studio module

This folder holds the Developer Studio skeleton added for Release 1.3.
It is intentionally implemented as a minimal, non-invasive skeleton so the
project build and runtime are not affected until the feature is explicitly
wired into the application.

Files added:
- index.ts — module entry point (register function placeholder)
- routes.ts — exported routes array placeholder
- controllers/* — owner-only controller placeholders
- services/* — service skeletons
- repositories/* — repository skeletons

Notes:
- DEV_STUDIO_ENABLED environment variable controls whether UI/API are used.
- All DB schema changes are non-destructive and live in db/migrations/.

