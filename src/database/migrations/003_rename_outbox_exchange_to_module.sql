-- Renames outbox_events.exchange -> module.
--
-- Guarded so it is idempotent, like every other migration in this folder:
-- the runner has no ledger and replays the whole directory on each run, so a
-- bare ALTER ... RENAME would fail on any already-migrated database.
DO $$
BEGIN
    IF EXISTS (
        SELECT
            1
        FROM
            information_schema.columns
        WHERE
            table_name = 'outbox_events'
            AND column_name = 'exchange' )
    THEN
        ALTER TABLE outbox_events
            RENAME COLUMN exchange TO module;
    END IF;
END $$;
