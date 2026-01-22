# 📋 PRÉPARATION AVANT IMPLÉMENTATION

**Date:** 19 janvier 2026  
**Projet:** Mon-Tournoi - Refonte Architecture Toornament  
**Mode de travail:** Je code, tu review

---

## ✅ ANALYSE PROJET TERMINÉE

J'ai analysé ton projet et voici ce que j'ai compris :

### **Stack Technique**
- ✅ **Frontend:** React 19.2 + Vite + React Router v7
- ✅ **Backend:** Supabase (PostgreSQL)
- ✅ **UI:** Composants custom dans `src/shared/components/ui/` (Button, Input, Card, etc.)
- ✅ **State:** Zustand + hooks custom
- ✅ **Styling:** Tailwind CSS + clsx
- ✅ **i18n:** react-i18next configuré

### **Architecture Actuelle**
```
src/
├── components/         (composants métier: tournament, admin, match, etc.)
├── features/          (features modulaires: auth, teams, matches, tournaments, etc.)
├── pages/             (pages: PublicProfile, PublicTeam, MatchDetails, NotFound)
├── shared/
│   ├── components/ui/ (composants réutilisables)
│   ├── services/api/  (services API)
│   ├── hooks/         (hooks custom)
│   └── utils/         (utilitaires)
├── stores/            (Zustand stores)
└── (fichiers racine)  (CreateTournament, Tournament, AdminPanel, etc.)
```

### **Tables Supabase Identifiées (d'après le code)**
D'après mes recherches dans le code, voici les tables que tu utilises :

1. **tournaments** - Colonnes utilisées :
   - `id`, `name`, `game`, `format`, `status`, `start_date`, `owner_id`
   - `best_of`, `maps_pool`, `rules`, `description`
   - `cashprize_total`, `cashprize_distribution`
   - `registration_deadline`, `max_participants`
   - `sponsors`, `clips`, `stream_urls`
   - `created_at`, `updated_at`

2. **matches** - Colonnes utilisées :
   - `id`, `tournament_id`, `match_number`, `round_number`
   - `player1_id`, `player2_id`, `winner_id`
   - `score_p1`, `score_p2`, `status`, `score_status`
   - `bracket_type` (winners/losers pour double elimination)
   - `scheduled_at`, `completed_at`, `is_reset`
   - `reported_by_team1`, `reported_by_team2`

3. **participants** - Colonnes utilisées :
   - `id`, `tournament_id`, `team_id`, `user_id`
   - `checked_in`, `disqualified`, `seed_order`
   - `status` (possiblement pour validation)
   - Relation : `teams(*)`

4. **teams** - Colonnes utilisées :
   - `id`, `name`, `tag`, `logo_url`
   - `created_by`, `members` (possiblement un array)

5. **match_games** (pour Best-of-X) - Colonnes utilisées :
   - `id`, `match_id`, `game_number`
   - `score_p1`, `score_p2`, `winner_team_id`
   - `score_status`, `status`

6. **game_score_reports** (conflits Best-of-X) - Colonnes utilisées :
   - `id`, `game_id`, `reported_by_team`
   - `is_resolved`

7. **swiss_scores** - Colonnes utilisées :
   - `tournament_id`, `team_id`, `wins`, `losses`, `draws`
   - `buchholz_score`, `points`

8. **final_standings** - Colonnes utilisées :
   - `tournament_id`, `team_id`, `position`, `points`

9. **messages** (chat) - Colonnes utilisées :
   - `tournament_id`, `match_id`, `user_id`, `content`

---

## 🎯 CE QUE TU DOIS FAIRE AVANT QUE JE COMMENCE

### **ÉTAPE 1 : Me donner le schéma SQL complet**

#### **Option A (Recommandée) : Via Supabase Dashboard**
1. Va sur [supabase.com](https://supabase.com/dashboard)
2. Connecte-toi et ouvre ton projet
3. Va dans **Database** → **Schema Visualizer** ou **Table Editor**
4. Pour chaque table, copie-moi la structure **CREATE TABLE**

**Ou mieux :** Va dans **SQL Editor** et exécute :
```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('tournaments', 'matches', 'participants', 'teams', 'match_games', 'game_score_reports', 'swiss_scores', 'final_standings', 'messages')
ORDER BY table_name, ordinal_position;
```

Copie-colle le résultat ici.

| table_name         | column_name             | data_type                | is_nullable | column_default               |
| ------------------ | ----------------------- | ------------------------ | ----------- | ---------------------------- |
| game_score_reports | id                      | uuid                     | NO          | gen_random_uuid()            |
| game_score_reports | game_id                 | uuid                     | NO          | null                         |
| game_score_reports | team_id                 | uuid                     | NO          | null                         |
| game_score_reports | score_team              | integer                  | NO          | null                         |
| game_score_reports | score_opponent          | integer                  | NO          | null                         |
| game_score_reports | reported_by             | uuid                     | NO          | null                         |
| game_score_reports | created_at              | timestamp with time zone | YES         | now()                        |
| game_score_reports | is_resolved             | boolean                  | YES         | false                        |
| match_games        | id                      | uuid                     | NO          | gen_random_uuid()            |
| match_games        | match_id                | uuid                     | NO          | null                         |
| match_games        | game_number             | integer                  | NO          | null                         |
| match_games        | map_name                | character varying        | YES         | null                         |
| match_games        | team1_score             | integer                  | YES         | 0                            |
| match_games        | team2_score             | integer                  | YES         | 0                            |
| match_games        | winner_team_id          | uuid                     | YES         | null                         |
| match_games        | status                  | character varying        | YES         | 'pending'::character varying |
| match_games        | created_at              | timestamp with time zone | YES         | now()                        |
| match_games        | completed_at            | timestamp with time zone | YES         | null                         |
| match_games        | team1_score_reported    | integer                  | YES         | null                         |
| match_games        | team2_score_reported    | integer                  | YES         | null                         |
| match_games        | reported_by_team1       | boolean                  | YES         | false                        |
| match_games        | reported_by_team2       | boolean                  | YES         | false                        |
| match_games        | score_status            | character varying        | YES         | 'pending'::character varying |
| matches            | id                      | uuid                     | NO          | gen_random_uuid()            |
| matches            | tournament_id           | uuid                     | NO          | null                         |
| matches            | round_number            | integer                  | NO          | null                         |
| matches            | match_number            | integer                  | NO          | null                         |
| matches            | player1_id              | uuid                     | YES         | null                         |
| matches            | player2_id              | uuid                     | YES         | null                         |
| matches            | score_p1                | integer                  | YES         | 0                            |
| matches            | score_p2                | integer                  | YES         | 0                            |
| matches            | winner_id               | uuid                     | YES         | null                         |
| matches            | status                  | text                     | YES         | 'pending'::text              |
| matches            | next_match_id           | uuid                     | YES         | null                         |
| matches            | start_time              | timestamp with time zone | YES         | null                         |
| matches            | chat_channel_id         | text                     | YES         | null                         |
| matches            | proof_img               | text                     | YES         | null                         |
| matches            | proof_url               | text                     | YES         | null                         |
| matches            | score_p1_reported       | integer                  | YES         | null                         |
| matches            | score_p2_reported       | integer                  | YES         | null                         |
| matches            | reported_by_team1       | boolean                  | YES         | false                        |
| matches            | reported_by_team2       | boolean                  | YES         | false                        |
| matches            | score_status            | character varying        | YES         | 'pending'::character varying |
| matches            | bracket_type            | character varying        | YES         | null                         |
| matches            | is_reset                | boolean                  | YES         | false                        |
| matches            | source_match_id         | uuid                     | YES         | null                         |
| matches            | scheduled_at            | timestamp with time zone | YES         | null                         |
| matches            | created_at              | timestamp with time zone | YES         | now()                        |
| messages           | id                      | uuid                     | NO          | gen_random_uuid()            |
| messages           | created_at              | timestamp with time zone | YES         | now()                        |
| messages           | content                 | text                     | NO          | null                         |
| messages           | user_id                 | uuid                     | YES         | null                         |
| messages           | tournament_id           | uuid                     | YES         | null                         |
| messages           | match_id                | uuid                     | YES         | null                         |
| participants       | id                      | uuid                     | NO          | gen_random_uuid()            |
| participants       | created_at              | timestamp with time zone | YES         | now()                        |
| participants       | tournament_id           | uuid                     | YES         | null                         |
| participants       | team_id                 | uuid                     | YES         | null                         |
| participants       | checked_in              | boolean                  | YES         | false                        |
| participants       | seed_order              | integer                  | YES         | null                         |
| participants       | disqualified            | boolean                  | YES         | false                        |
| swiss_scores       | id                      | uuid                     | NO          | gen_random_uuid()            |
| swiss_scores       | tournament_id           | uuid                     | NO          | null                         |
| swiss_scores       | team_id                 | uuid                     | NO          | null                         |
| swiss_scores       | wins                    | integer                  | YES         | 0                            |
| swiss_scores       | losses                  | integer                  | YES         | 0                            |
| swiss_scores       | draws                   | integer                  | YES         | 0                            |
| swiss_scores       | buchholz_score          | numeric                  | YES         | 0                            |
| swiss_scores       | opp_wins                | numeric                  | YES         | 0                            |
| swiss_scores       | created_at              | timestamp with time zone | YES         | now()                        |
| swiss_scores       | updated_at              | timestamp with time zone | YES         | now()                        |
| teams              | id                      | uuid                     | NO          | gen_random_uuid()            |
| teams              | created_at              | timestamp with time zone | YES         | now()                        |
| teams              | name                    | text                     | NO          | null                         |
| teams              | tag                     | text                     | YES         | null                         |
| teams              | logo_url                | text                     | YES         | null                         |
| teams              | captain_id              | uuid                     | YES         | null                         |
| teams              | discord_invite_link     | text                     | YES         | null                         |
| tournaments        | id                      | uuid                     | NO          | gen_random_uuid()            |
| tournaments        | owner_id                | uuid                     | NO          | null                         |
| tournaments        | name                    | text                     | NO          | null                         |
| tournaments        | game                    | text                     | NO          | null                         |
| tournaments        | format                  | text                     | NO          | null                         |
| tournaments        | status                  | text                     | YES         | 'draft'::text                |
| tournaments        | start_date              | timestamp with time zone | YES         | null                         |
| tournaments        | description             | text                     | YES         | null                         |
| tournaments        | rules                   | text                     | YES         | null                         |
| tournaments        | max_participants        | integer                  | YES         | 32                           |
| tournaments        | is_public               | boolean                  | YES         | true                         |
| tournaments        | created_at              | timestamp with time zone | YES         | now()                        |
| tournaments        | check_in_window_minutes | integer                  | YES         | 15                           |
| tournaments        | check_in_deadline       | timestamp with time zone | YES         | null                         |
| tournaments        | match_duration_minutes  | integer                  | YES         | 30                           |
| tournaments        | match_break_minutes     | integer                  | YES         | 10                           |
| tournaments        | best_of                 | integer                  | YES         | 1                            |
| tournaments        | maps_pool               | jsonb                    | YES         | '[]'::jsonb                  |
| tournaments        | registration_deadline   | timestamp with time zone | YES         | null                         |
| tournaments        | cashprize_total         | numeric                  | YES         | null                         |
| tournaments        | cashprize_distribution  | jsonb                    | YES         | null                         |
| tournaments        | sponsors                | jsonb                    | YES         | null                         |
---

#### **Option B : Créer un fichier de migration**

Si tu utilises Supabase CLI localement :
```bash
cd "C:\Users\Dan\Documents\Fluky Boys\site\mon-tournoi"
supabase db dump -f supabase/migrations/current_schema.sql
```

Puis envoie-moi le fichier `current_schema.sql`.

---

#### **Option C : Me donner accès en lecture**

Tu peux créer un script SQL qui dump la structure :
```sql
-- Copie-colle ce code dans SQL Editor Supabase et exécute
SELECT table_name, 
       string_agg(
         column_name || ' ' || data_type || 
         CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
         ', ' ORDER BY ordinal_position
       ) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('tournaments', 'matches', 'participants', 'teams', 'match_games', 'game_score_reports', 'swiss_scores', 'final_standings', 'messages')
GROUP BY table_name;
```

---

### **ÉTAPE 2 : Me donner les RLS Policies**

J'ai besoin de savoir les permissions actuelles pour ne pas les casser.

**Dans SQL Editor Supabase, exécute :**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tournaments', 'matches', 'participants', 'teams', 'match_games', 'game_score_reports', 'swiss_scores', 'final_standings', 'messages')
ORDER BY tablename, policyname;
```

Copie-colle le résultat.

| schemaname | tablename          | policyname                                      | permissive | roles    | cmd    | qual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | with_check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------------------ | ----------------------------------------------- | ---------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | game_score_reports | Game score reports are viewable by everyone.    | PERMISSIVE | {public} | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | game_score_reports | Participants can create game score reports.     | PERMISSIVE | {public} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | (EXISTS ( SELECT 1
   FROM ((match_games mg
     JOIN matches m ON ((mg.match_id = m.id)))
     JOIN team_members tm ON (((tm.team_id = m.player1_id) OR (tm.team_id = m.player2_id))))
  WHERE ((mg.id = game_score_reports.game_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| public     | match_games        | Participants and owners can manage match games. | PERMISSIVE | {public} | ALL    | (EXISTS ( SELECT 1
   FROM matches
  WHERE ((matches.id = match_games.match_id) AND ((matches.player1_id IN ( SELECT team_members.team_id
           FROM team_members
          WHERE (team_members.user_id = ( SELECT auth.uid() AS uid))
        UNION
         SELECT teams.id
           FROM teams
          WHERE (teams.captain_id = ( SELECT auth.uid() AS uid)))) OR (matches.player2_id IN ( SELECT team_members.team_id
           FROM team_members
          WHERE (team_members.user_id = ( SELECT auth.uid() AS uid))
        UNION
         SELECT teams.id
           FROM teams
          WHERE (teams.captain_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
           FROM tournaments
          WHERE ((tournaments.id = matches.tournament_id) AND (tournaments.owner_id = ( SELECT auth.uid() AS uid)))))))))                                                                                                                                                                                                                                                                                                                                                                                                              | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | matches            | Authorized users can update matches             | PERMISSIVE | {public} | UPDATE | ((( SELECT auth.uid() AS uid) IN ( SELECT profiles.id
   FROM profiles
  WHERE ((profiles.role = 'superadmin'::text) OR (profiles.role = 'organizer'::text)))) OR (EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = matches.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = ( SELECT auth.uid() AS uid)) AND ((tm.team_id = matches.player1_id) OR (tm.team_id = matches.player2_id))))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | matches            | Matches are viewable by everyone.               | PERMISSIVE | {public} | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | matches            | Only organizers can insert matches              | PERMISSIVE | {public} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | (EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = matches.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid)))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public     | messages           | Authenticated users can send messages           | PERMISSIVE | {public} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ((auth.role() = 'authenticated'::text) AND (((match_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM matches m
  WHERE ((m.id = messages.match_id) AND ((EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = m.player1_id) AND (tm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM teams t
          WHERE ((t.id = m.player1_id) AND (t.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = m.player2_id) AND (tm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM teams t
          WHERE ((t.id = m.player2_id) AND (t.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM tournaments t
          WHERE ((t.id = m.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid)))))))))) OR ((tournament_id IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = messages.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (participants p
     JOIN team_members tm ON ((p.team_id = tm.team_id)))
  WHERE ((p.tournament_id = messages.tournament_id) AND (tm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (participants p
     JOIN teams t ON ((p.team_id = t.id)))
  WHERE ((p.tournament_id = messages.tournament_id) AND (t.captain_id = ( SELECT auth.uid() AS uid))))))))) |
| public     | messages           | Users can view relevant messages                | PERMISSIVE | {public} | SELECT | (((match_id IS NULL) AND (tournament_id IS NULL)) OR ((match_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM matches m
  WHERE ((m.id = messages.match_id) AND ((EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = ANY (ARRAY[m.player1_id, m.player2_id])) AND (tm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM teams t
          WHERE ((t.id = ANY (ARRAY[m.player1_id, m.player2_id])) AND (t.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM tournaments t
          WHERE ((t.id = m.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid)))))))))) OR ((tournament_id IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = messages.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (participants p
     JOIN team_members tm ON ((p.team_id = tm.team_id)))
  WHERE ((p.tournament_id = messages.tournament_id) AND (tm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (participants p
     JOIN teams t ON ((p.team_id = t.id)))
  WHERE ((p.tournament_id = messages.tournament_id) AND (t.captain_id = ( SELECT auth.uid() AS uid)))))))) | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | participants       | Authorized users can update participants        | PERMISSIVE | {public} | UPDATE | ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = participants.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))) OR ((EXISTS ( SELECT 1
   FROM teams
  WHERE ((teams.id = participants.team_id) AND (teams.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM team_members
  WHERE ((team_members.team_id = participants.team_id) AND (team_members.user_id = ( SELECT auth.uid() AS uid)))))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = participants.tournament_id) AND (t.owner_id = ( SELECT auth.uid() AS uid))))) OR ((EXISTS ( SELECT 1
   FROM teams
  WHERE ((teams.id = participants.team_id) AND (teams.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM team_members
  WHERE ((team_members.team_id = participants.team_id) AND (team_members.user_id = ( SELECT auth.uid() AS uid)))))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| public     | participants       | Captains or owners can delete participants      | PERMISSIVE | {public} | DELETE | ((EXISTS ( SELECT 1
   FROM teams
  WHERE ((teams.id = participants.team_id) AND (teams.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM tournaments
  WHERE ((tournaments.id = participants.tournament_id) AND (tournaments.owner_id = ( SELECT auth.uid() AS uid))))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | participants       | Captains or owners can insert participants      | PERMISSIVE | {public} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ((EXISTS ( SELECT 1
   FROM teams t
  WHERE ((t.id = participants.team_id) AND (t.captain_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM tournaments
  WHERE ((tournaments.id = participants.tournament_id) AND (tournaments.owner_id = ( SELECT auth.uid() AS uid))))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| public     | participants       | Users can view participants                     | PERMISSIVE | {public} | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | swiss_scores       | Tournament owners can manage swiss scores.      | PERMISSIVE | {public} | ALL    | (EXISTS ( SELECT 1
   FROM tournaments
  WHERE ((tournaments.id = swiss_scores.tournament_id) AND (tournaments.owner_id = ( SELECT auth.uid() AS uid)))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | (EXISTS ( SELECT 1
   FROM tournaments
  WHERE ((tournaments.id = swiss_scores.tournament_id) AND (tournaments.owner_id = ( SELECT auth.uid() AS uid)))))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public     | teams              | Captains can manage teams                       | PERMISSIVE | {public} | UPDATE | (( SELECT auth.uid() AS uid) = captain_id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | (( SELECT auth.uid() AS uid) = captain_id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public     | teams              | Teams are viewable by everyone                  | PERMISSIVE | {public} | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | teams              | Users can create teams                          | PERMISSIVE | {public} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | (( SELECT auth.uid() AS uid) = captain_id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public     | tournaments        | Owners can delete tournaments                   | PERMISSIVE | {public} | DELETE | (( SELECT auth.uid() AS uid) = owner_id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | tournaments        | Owners can update tournaments                   | PERMISSIVE | {public} | UPDATE | (( SELECT auth.uid() AS uid) = owner_id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (( SELECT auth.uid() AS uid) = owner_id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| public     | tournaments        | Tournaments are viewable by everyone.           | PERMISSIVE | {public} | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public     | tournaments        | Users can create tournaments                    | PERMISSIVE | {public} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | (( SELECT auth.role() AS role) = 'authenticated'::text)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
---

### **ÉTAPE 3 : Vérifier les fichiers .env**

**Envoie-moi le contenu de `.env.example` (PAS le .env avec tes clés !)**

Je veux voir quelles variables d'environnement tu utilises :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
(autres ?)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MONITORING_ENABLED=true
VITE_SENTRY_DSN=
VITE_MAKE_WEBHOOK_URL
---

### **ÉTAPE 4 : Me dire quelles features NE PAS CASSER**

**Questions critiques :**

1. **Y a-t-il des tournois en production actuellement ?**
   - Si OUI → On doit faire une migration sans downtime
   - Si NON → On peut casser et recréer

NON tu peux casser

2. **Quelles fonctionnalités sont ABSOLUMENT critiques ?**
   - Exemple : "Ne JAMAIS casser le système de check-in"
   - Exemple : "Le chat doit toujours marcher"
    Tu as cartes blanches tant que tout marche

3. **Y a-t-il des utilisateurs actifs ?**
   - Si OUI → On doit préserver les comptes utilisateurs
   - Si NON → On peut reset la DB
   J'ai mes comptes perso mais pas important je peux recrée

---

### **ÉTAPE 5 : Décider de la priorité #1**

**Choisis UNE seule fonctionnalité pour commencer :**

#### **Option A : Inscription équipe temporaire** (RECOMMANDÉ)
- ✅ Isolé, ne touche pas l'existant
- ✅ Impact immédiat (meilleure UX)
- ✅ On peut tester rapidement
- ⏱️ 1-2 jours de dev

**Ce qu'on va créer :**
1. Nouvelles tables : `temporary_teams`, `temporary_team_players`
2. Nouveau composant : `TournamentRegistration.jsx`
3. Formulaire avec choix équipe existante vs temporaire
4. Validation et preview

**Pas de risque de casser l'existant.**

---

#### **Option B : Système de phases**
- ⚠️ Refonte importante
- ⚠️ Migration de données nécessaire
- ⚠️ Risque de casser la génération de matchs actuelle
- ⏱️ 1-2 semaines de dev

**Ce qu'on va créer :**
1. Table `tournament_phases`
2. Migration `matches.phase_id`
3. Page `/organizer/tournament/:id/structure`
4. Refonte de `generateBracketInternal`

**Risque élevé sur l'existant.**

---

#### **Option C : Navigation par jeu (Play)**
- ✅ Aucun changement backend
- ✅ Pur frontend
- ✅ Pas de migration
- ⏱️ 2-3 jours de dev

**Ce qu'on va créer :**
1. `PlayHome.jsx`
2. `GamesDirectory.jsx`
3. `GamePage.jsx`
4. Routes `/play/*`

**Zéro risque.**

---

**👉 Quelle option choisis-tu ?** (A, B ou C)

Commence par le play le C 

### **ÉTAPE 6 : Configuration Git**

**Est-ce que tu utilises Git ?**

Si OUI :
```bash
# Avant de commencer, on crée une branche
cd "C:\Users\Dan\Documents\Fluky Boys\site\mon-tournoi"
git checkout -b feature/toornament-refactoring
git push -u origin feature/toornament-refactoring
```
Oui 

Si NON :
```bash
# Initialise Git maintenant (CRITIQUE pour ne pas perdre de code)
cd "C:\Users\Dan\Documents\Fluky Boys\site\mon-tournoi"
git init
git add .
git commit -m "État initial avant refonte Toornament"
```

---

### **ÉTAPE 7 : Tests et validation**

**Comment tu veux tester ?**

1. **Environnement de dev local** : `npm run dev`
2. **Tests automatisés** : Tu as Jest configuré, on va écrire des tests ?
3. **Review manuelle** : Tu testes toi-même chaque feature avant de merger ?

---
Je test en local mais toi fais des test automatique de ton coté

## 📊 RÉCAPITULATIF : CHECKLIST COMPLÈTE

### **Avant de commencer, envoie-moi :**

- [ ] **Schéma SQL complet** (ÉTAPE 1)
  - Via SQL Editor Supabase (recommandé)
  - Ou fichier de migration
  - Ou dump de structure

- [ ] **RLS Policies** (ÉTAPE 2)
  - Résultat de la requête `SELECT * FROM pg_policies`

- [ ] **Variables d'environnement** (ÉTAPE 3)
  - Contenu de `.env.example`

- [ ] **Contraintes métier** (ÉTAPE 4)
  - Tournois en production ? (OUI/NON)
  - Features critiques à ne pas casser
  - Utilisateurs actifs ? (OUI/NON)

- [ ] **Choix de la priorité** (ÉTAPE 5)
  - Option A, B ou C ?

- [ ] **Configuration Git** (ÉTAPE 6)
  - Git initialisé ? (OUI/NON)
  - Branche créée ? (OUI/NON)

- [ ] **Stratégie de test** (ÉTAPE 7)
  - Tests auto ou manuels ?

---

## 🚀 APRÈS TON ENVOI, JE POURRAI :

1. ✅ **Créer les migrations SQL** sans risque
2. ✅ **Coder les composants** en respectant ton design system
3. ✅ **Implémenter la feature** étape par étape
4. ✅ **T'envoyer des PR logiques** (petits morceaux)
5. ✅ **Documenter le code** pour faciliter ta review

---


## ⏱️ TEMPS ESTIMÉ POUR RÉPONDRE

- ÉTAPE 1 (Schéma SQL) : **5 minutes**
- ÉTAPE 2 (RLS) : **2 minutes**
- ÉTAPE 3 (.env) : **1 minute**
- ÉTAPE 4 (Contraintes) : **2 minutes**
- ÉTAPE 5 (Choix) : **1 minute**
- ÉTAPE 6 (Git) : **2 minutes**
- ÉTAPE 7 (Tests) : **1 minute**

**Total : ~15 minutes de travail pour toi**

---

## 🎯 APRÈS, JE PRENDS LE RELAIS

Une fois que tu m'as donné ces infos, **je code TOUT** et tu review. 

Tu n'auras plus qu'à :
1. Tester mes PR
2. Me dire "OK" ou "Change ça"
3. Merger quand c'est bon

**C'est parti ! 🚀**
