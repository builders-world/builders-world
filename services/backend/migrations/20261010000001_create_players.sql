-- Migration 001: who is in the world right now.
-- Every player reports their position about once a second and is shown to others for twelve seconds after their last
-- report. Nothing here is worth keeping: a crash that empties the table costs the street a second of company. So the
-- table is UNLOGGED (no write-ahead log for a write per player per second), and the jobs service deletes the rows of
-- anyone not heard from for a minute. A player's id is chosen by their browser; it is a name for this visit, not an account.
CREATE UNLOGGED TABLE players (
    id       TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    name     TEXT NOT NULL,
    handle   TEXT NOT NULL,
    x        DOUBLE PRECISION NOT NULL,
    y        DOUBLE PRECISION NOT NULL,
    z        DOUBLE PRECISION NOT NULL,
    yaw      DOUBLE PRECISION NOT NULL,
    speed    DOUBLE PRECISION NOT NULL,
    look     JSONB NOT NULL,
    home     TEXT NOT NULL,
    np       JSONB,          -- what they are listening to
    pet      JSONB,
    card     JSONB NOT NULL, -- the public profile they chose to share
    say      JSONB,          -- the last thing said, the last emote, knock, answer and game move: kept until replaced,
    emote    JSONB,          -- each with its own time, so a client shows each one once
    knock    JSONB,
    answer   JSONB,
    play     JSONB,
    seen     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- "Who else is in my district, newest first" and "who has gone"
CREATE INDEX idx_players_district_seen ON players (district, seen DESC);
CREATE INDEX idx_players_seen ON players (seen);
