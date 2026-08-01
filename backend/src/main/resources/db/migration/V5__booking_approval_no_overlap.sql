-- btree_gist has been a "trusted" extension since Postgres 13: any role with
-- CREATE on the database can install it, no superuser required.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Two APPROVED bookings can never overlap for the same hall. This is the
-- authoritative guard against the approval race — enforced by Postgres
-- itself under concurrency, not just by the application's pre-check.
ALTER TABLE bookings
    ADD CONSTRAINT excl_bookings_hall_time_overlap
    EXCLUDE USING gist (
        hall_id WITH =,
        tsrange(start_time, end_time) WITH &&
    )
    WHERE (status = 'APPROVED');
