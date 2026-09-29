-- ============================================================
-- Watch Party — Milestone 1 Database Schema
-- Supabase PostgreSQL Migration
-- ============================================================

-- 1. Create the watch_parties table
CREATE TABLE IF NOT EXISTS watch_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,

  -- Content info
  movie_id TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',  -- 'movie' | 'tv'
  season INTEGER,
  provider TEXT NOT NULL DEFAULT 'vidfast',

  -- Host
  host_user_id UUID NOT NULL,

  -- Playback state (source of truth)
  playing BOOLEAN DEFAULT FALSE,
  "current_time" NUMERIC DEFAULT 0,

  -- Party lifecycle
  status TEXT DEFAULT 'active',  -- 'active' | 'ended'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_watch_parties_room_code ON watch_parties (room_code);
CREATE INDEX IF NOT EXISTS idx_watch_parties_status ON watch_parties (status);
CREATE INDEX IF NOT EXISTS idx_watch_parties_host ON watch_parties (host_user_id);

-- 3. Row Level Security
ALTER TABLE watch_parties ENABLE ROW LEVEL SECURITY;

-- Anyone can read active parties (needed for joining via invite link)
CREATE POLICY "read_active_parties"
  ON watch_parties FOR SELECT
  USING (status = 'active');

-- Authenticated users can create parties
CREATE POLICY "create_party"
  ON watch_parties FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- Only the host can update their own party
CREATE POLICY "host_update_party"
  ON watch_parties FOR UPDATE
  USING (auth.uid() = host_user_id);

-- Only the host can end (delete) their party
CREATE POLICY "host_delete_party"
  ON watch_parties FOR DELETE
  USING (auth.uid() = host_user_id);

-- 4. Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE watch_parties;

-- 5. Grant base privileges to Supabase auth roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_parties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_parties TO authenticated;
