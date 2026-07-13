# Developer Studio

This document describes the Developer Studio skeleton added in Release 1.3.
The implementation is intentionally minimal and non-invasive. The goal is to
provide a safe, owner-only feature that can be enabled later without risk to
existing workflows, pages, and data.

Key components added (skeletons):
- DB migrations: db/migrations/V2026_07_13__create_dev_studio_tables.sql
- Module skeleton: src/modules/developer-studio/
- Environment config examples in .env.example
- Documentation: docs/DEV_STUDIO.md

Security & compatibility notes:
- DEV_STUDIO_ENABLED=false by default in .env.example
- All DB migrations use IF NOT EXISTS and are non-destructive
- Impersonation actions are logged to impersonation_logs

