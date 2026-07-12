-- Super-admin announcements broadcast table
CREATE TABLE IF NOT EXISTS public.super_announcements (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  audience    TEXT NOT NULL DEFAULT 'all',
  sent_count  INTEGER NOT NULL DEFAULT 0,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
