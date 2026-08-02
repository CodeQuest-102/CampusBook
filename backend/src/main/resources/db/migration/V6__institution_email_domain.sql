-- Self-registration now resolves an institution from the registering email's
-- domain (UserService.registerUser) instead of always picking whichever
-- institution has the lowest id. Every institution needs a domain on file for
-- that lookup to work.
ALTER TABLE institutions ADD COLUMN email_domain VARCHAR(255);

UPDATE institutions SET email_domain = 'knust.edu.gh' WHERE name = 'KNUST' AND email_domain IS NULL;

ALTER TABLE institutions ALTER COLUMN email_domain SET NOT NULL;
ALTER TABLE institutions ADD CONSTRAINT uk_institutions_email_domain UNIQUE (email_domain);
