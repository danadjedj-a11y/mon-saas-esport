-- =====================================================
-- SCHEMA INITIAL - Mon SaaS Esport
-- Execute ce script dans Supabase SQL Editor
-- =====================================================

-- Extensions necessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (extension de auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  discord_id TEXT,
  twitter_handle TEXT,
  twitch_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger pour creer un profile automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. TEAMS (Equipes permanentes)
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tag VARCHAR(10),
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_invite_link TEXT,
  twitter_handle TEXT,
  website_url TEXT,
  country TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_teams_captain ON teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Captains can update their team" ON teams
  FOR UPDATE USING (auth.uid() = captain_id);

CREATE POLICY "Captains can delete their team" ON teams
  FOR DELETE USING (auth.uid() = captain_id);

-- =====================================================
-- 3. TEAM_MEMBERS (Membres d'equipe)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'captain', 'co-captain', 'coach', 'member', 'substitute'
  game_role TEXT, -- Role en jeu (ex: "Top", "Support", etc.)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members are viewable by everyone" ON team_members
  FOR SELECT USING (true);

CREATE POLICY "Captains can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave team" ON team_members
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. TOURNAMENTS (Tournois)
-- =====================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  rules TEXT,
  game TEXT NOT NULL, -- 'league_of_legends', 'valorant', 'cs2', etc.
  format TEXT DEFAULT 'single_elimination', -- 'single_elimination', 'double_elimination', 'round_robin', 'swiss', 'groups'
  team_size INTEGER DEFAULT 5,
  max_teams INTEGER,
  registration_start TIMESTAMPTZ,
  registration_end TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  prize_pool TEXT,
  prize_distribution JSONB,
  logo_url TEXT,
  banner_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft', -- 'draft', 'registration', 'ongoing', 'completed', 'cancelled'
  settings JSONB DEFAULT '{}',
  contact_email TEXT,
  discord_server TEXT,
  stream_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tournaments_owner ON tournaments(owner_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_public ON tournaments(is_public);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public tournaments are viewable by everyone" ON tournaments
  FOR SELECT USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Users can create tournaments" ON tournaments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their tournament" ON tournaments
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their tournament" ON tournaments
  FOR DELETE USING (auth.uid() = owner_id);

-- =====================================================
-- 5. PARTICIPANTS (Inscriptions au tournoi)
-- =====================================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Pour les tournois solo
  seed INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'checked_in', 'disqualified', 'withdrawn'
  check_in_at TIMESTAMPTZ,
  notes TEXT,
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id),
  UNIQUE(tournament_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);

-- RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants are viewable by everyone" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = participants.tournament_id
      AND (t.is_public = true OR t.owner_id = auth.uid())
    )
  );

CREATE POLICY "Captains or owners can insert participants" ON participants
  FOR INSERT WITH CHECK (
    -- Capitaine de l'equipe
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM teams WHERE teams.id = participants.team_id AND teams.captain_id = auth.uid()
    ))
    -- OU inscription solo
    OR (user_id IS NOT NULL AND user_id = auth.uid())
    -- OU owner du tournoi
    OR EXISTS (
      SELECT 1 FROM tournaments WHERE tournaments.id = participants.tournament_id AND tournaments.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can update participants" ON participants
  FOR UPDATE USING (
    -- Owner du tournoi
    EXISTS (
      SELECT 1 FROM tournaments t WHERE t.id = participants.tournament_id AND t.owner_id = auth.uid()
    )
    -- OU capitaine de l'equipe
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM teams WHERE teams.id = participants.team_id AND teams.captain_id = auth.uid()
    ))
    -- OU inscription solo
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Captains or owners can delete participants" ON participants
  FOR DELETE USING (
    -- Capitaine de l'equipe
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM teams WHERE teams.id = participants.team_id AND teams.captain_id = auth.uid()
    ))
    -- OU inscription solo
    OR (user_id IS NOT NULL AND user_id = auth.uid())
    -- OU owner du tournoi
    OR EXISTS (
      SELECT 1 FROM tournaments WHERE tournaments.id = participants.tournament_id AND tournaments.owner_id = auth.uid()
    )
  );

-- =====================================================
-- 6. MATCHES (Matchs)
-- =====================================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  bracket_type TEXT DEFAULT 'winners', -- 'winners', 'losers', 'grand_final', 'group', 'round_robin'
  team1_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'ongoing', 'completed', 'cancelled'
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  best_of INTEGER DEFAULT 1,
  stream_url TEXT,
  vod_url TEXT,
  notes TEXT,
  next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  next_loser_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled ON matches(scheduled_at);

-- RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by everyone" ON matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND (t.is_public = true OR t.owner_id = auth.uid())
    )
  );

CREATE POLICY "Tournament owners can manage matches" ON matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = matches.tournament_id
      AND t.owner_id = auth.uid()
    )
  );

-- =====================================================
-- 7. FONCTION HELPER: update_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTAIRES
-- =====================================================
COMMENT ON TABLE profiles IS 'Profils utilisateurs etendus';
COMMENT ON TABLE teams IS 'Equipes permanentes';
COMMENT ON TABLE team_members IS 'Membres des equipes';
COMMENT ON TABLE tournaments IS 'Tournois';
COMMENT ON TABLE participants IS 'Inscriptions aux tournois';
COMMENT ON TABLE matches IS 'Matchs des tournois';
