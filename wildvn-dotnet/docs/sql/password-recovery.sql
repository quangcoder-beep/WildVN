-- Additive schema for the upgraded .NET auth owner; PREPARED ONLY, not executed.
-- Apply before enabling ANY upgraded Auth instance (credential versions are always read).
-- No EnsureCreated/automatic migration is used by the API.
BEGIN;
CREATE TABLE public.password_reset_requests (
    token_hash varchar(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9A-F]{64}$'),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    password_fingerprint varchar(64) NOT NULL CHECK (password_fingerprint ~ '^[0-9A-F]{64}$'),
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
    consumed_at timestamptz NULL
);
CREATE INDEX password_reset_requests_user_created ON public.password_reset_requests (user_id, created_at DESC);
CREATE INDEX password_reset_requests_expiry ON public.password_reset_requests (expires_at);
CREATE TABLE public.password_reset_outbox (
    id uuid PRIMARY KEY,
    token_hash varchar(64) NOT NULL REFERENCES public.password_reset_requests(token_hash) ON DELETE CASCADE,
    encrypted_payload text NOT NULL,
    created_at timestamptz NOT NULL,
    next_attempt_at timestamptz NOT NULL,
    lease_until timestamptz NULL,
    delivered_at timestamptz NULL,
    attempts integer NOT NULL CHECK (attempts BETWEEN 0 AND 5)
);
CREATE INDEX password_reset_outbox_pending ON public.password_reset_outbox (next_attempt_at) WHERE delivered_at IS NULL;
CREATE TABLE public.auth_credential_versions (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    version uuid NOT NULL,
    changed_at timestamptz NOT NULL
);
COMMIT;
-- Do not drop credential versions during disable/rollback: legacy tokens could become valid again.
-- A rollback to a server that ignores versions requires invalidating its JWT signing keys first.
