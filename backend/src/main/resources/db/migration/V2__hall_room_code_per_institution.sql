-- Room codes are unique per campus, not globally. Two institutions can each have
-- a room "GF1"; the old global unique constraint made the second campus unable to
-- register its own rooms. Scope uniqueness to (institution_id, room_code).
--
-- The existing single-column unique constraint may carry different names across
-- databases: `uk_halls_room_code` on a database built from V1, or Hibernate's
-- generated name (e.g. ukkutok2ucv2afr66r5g080168o) on a database that predates
-- Flyway and was baselined. Drop whichever one covers room_code, by discovery.

DO $$
DECLARE
    con_name text;
BEGIN
    SELECT c.conname INTO con_name
    FROM pg_constraint c
    JOIN pg_class t   ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE t.relname = 'halls'
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 1
      AND a.attname = 'room_code'
    LIMIT 1;

    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE halls DROP CONSTRAINT %I', con_name);
    END IF;
END $$;

ALTER TABLE halls
    ADD CONSTRAINT uk_halls_institution_room_code UNIQUE (institution_id, room_code);
