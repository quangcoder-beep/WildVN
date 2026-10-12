-- Extensions required by the Spring-owned schema. This migration runs before
-- V1 on a brand-new database; existing databases are protected by the
-- baseline at version 1 and are not modified by it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;    