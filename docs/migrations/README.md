# DB Migrations

Migrations added for Developer Studio live under db/migrations/. They were
implemented to be non-destructive (CREATE TABLE IF NOT EXISTS, CREATE INDEX
IF NOT EXISTS). Review them before applying to production.

Recommended deployment steps:
1. Apply migration to a staging DB and verify schema.
2. Ensure backups exist before applying to production.
