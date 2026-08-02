-- Widens the role check constraint to allow PLATFORM_ADMIN accounts.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN', 'LECTURER', 'STUDENT_LEADER', 'PLATFORM_ADMIN'));
