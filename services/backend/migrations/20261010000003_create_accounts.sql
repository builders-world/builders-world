-- Migration 003: who people are.
-- A person signs in with GitHub. The account is keyed by GitHub's numeric user id, which never changes, not by the login,
-- which can be renamed. The login is kept fresh at every sign-in.
CREATE TABLE accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id    BIGINT NOT NULL UNIQUE,
    login        TEXT NOT NULL,
    name         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sign_in TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Signed-in browsers. Only a hash of the bearer token is stored, so a copy of this table is no use to anyone.
CREATE TABLE sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,   -- hex SHA-256 of the bearer token
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ
);
CREATE INDEX idx_sessions_account ON sessions (account_id) WHERE revoked_at IS NULL;

-- What a person chose at arrivals and in the wardrobe, so it follows them to any device. The shape is domain::world::profile::Profile.
CREATE TABLE profiles (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    profile    JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
