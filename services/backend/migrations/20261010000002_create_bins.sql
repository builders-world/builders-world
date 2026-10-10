-- Migration 002: street bins, shared by everyone in a district.
-- A bin stands at a grid spot and is paid for in three gifts of 1,000 Efforts. The client takes the Efforts from the
-- giver's wallet; this table only remembers how much has been given and by whom, so a bin one player funds is there for all.
CREATE TABLE bins (
    district   TEXT NOT NULL,
    spot       TEXT NOT NULL,          -- "east_north" on the district's grid, e.g. 12_-40
    funded     INTEGER NOT NULL CHECK (funded >= 0),
    names      TEXT[] NOT NULL DEFAULT '{}',
    funded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (district, spot)
);
