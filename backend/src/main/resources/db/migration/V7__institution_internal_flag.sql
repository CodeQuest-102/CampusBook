-- Marks the seeded "CampusBook Internal" institution that platform-admin
-- accounts belong to only to satisfy users.institution_id's NOT NULL
-- constraint — never a real customer, must be excluded from the
-- institution-monitoring list.
ALTER TABLE institutions ADD COLUMN internal BOOLEAN NOT NULL DEFAULT FALSE;
