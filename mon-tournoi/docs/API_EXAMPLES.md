# Exemples d'Utilisation API - Fluky Boys

## 📋 Vue d'ensemble

Ce document contient des exemples pratiques d'utilisation de l'API Supabase pour la plateforme Fluky Boys.

## 🔐 Authentification

### Exemple : Connexion et récupération de session

```javascript
import { supabase } from './supabaseClient';

// Connexion
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Erreur de connexion:', error.message);
    return null;
  }

  return data.session;
}

// Récupérer la session actuelle
async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
```

## 🏆 Tournois

### Exemple : Lister les tournois disponibles

```javascript
async function getAvailableTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['draft', 'ongoing'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur:', error);
    return [];
  }

  return data;
}
```

### Exemple : Créer un tournoi complet

```javascript
async function createTournament(tournamentData) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Non authentifié');
  }

  const { data, error } = await supabase
    .from('tournaments')
    .insert([{
      name: tournamentData.name,
      game: tournamentData.game,
      format: tournamentData.format,
      max_participants: tournamentData.maxParticipants,
      start_date: tournamentData.startDate,
      registration_deadline: tournamentData.registrationDeadline,
      rules: tournamentData.rules,
      prize_pool: tournamentData.prizePool,
      entry_fee: tournamentData.entryFee,
      status: 'draft',
      owner_id: session.user.id
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

### Exemple : Rechercher des tournois

```javascript
async function searchTournaments(query, filters = {}) {
  let queryBuilder = supabase
    .from('tournaments')
    .select('*');

  // Recherche par nom
  if (query) {
    queryBuilder = queryBuilder.ilike('name', `%${query}%`);
  }

  // Filtres
  if (filters.game) {
    queryBuilder = queryBuilder.eq('game', filters.game);
  }

  if (filters.format) {
    queryBuilder = queryBuilder.eq('format', filters.format);
  }

  if (filters.status) {
    queryBuilder = queryBuilder.eq('status', filters.status);
  }

  // Tri
  const sortBy = filters.sortBy || 'created_at';
  queryBuilder = queryBuilder.order(sortBy, { ascending: false });

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Erreur:', error);
    return [];
  }

  return data;
}
```

## 👥 Équipes

### Exemple : Créer une équipe et ajouter des membres

```javascript
async function createTeamWithMembers(teamData, memberIds) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Non authentifié');
  }

  // 1. Créer l'équipe
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert([{
      name: teamData.name,
      tag: teamData.tag,
      logo_url: teamData.logoUrl,
      captain_id: session.user.id
    }])
    .select()
    .single();

  if (teamError) {
    throw teamError;
  }

  // 2. Ajouter les membres
  const members = memberIds.map(userId => ({
    team_id: team.id,
    user_id: userId
  }));

  const { error: membersError } = await supabase
    .from('team_members')
    .insert(members);

  if (membersError) {
    throw membersError;
  }

  return team;
}
```

### Exemple : Récupérer les équipes d'un utilisateur

```javascript
async function getUserTeams(userId) {
  // Équipes où l'utilisateur est capitaine
  const { data: captainTeams } = await supabase
    .from('teams')
    .select('*')
    .eq('captain_id', userId);

  // Équipes où l'utilisateur est membre
  const { data: memberTeams } = await supabase
    .from('team_members')
    .select(`
      *,
      teams (*)
    `)
    .eq('user_id', userId);

  return {
    captain: captainTeams.data || [],
    member: memberTeams.data || []
  };
}
```

## ⚔️ Matchs

### Exemple : Créer un bracket d'élimination

```javascript
async function createEliminationBracket(tournamentId, participants) {
  const rounds = Math.ceil(Math.log2(participants.length));
  const matches = [];

  // Premier round
  for (let i = 0; i < participants.length; i += 2) {
    matches.push({
      tournament_id: tournamentId,
      team1_id: participants[i].team_id,
      team2_id: participants[i + 1]?.team_id || null,
      round: 1,
      match_number: Math.floor(i / 2) + 1,
      status: 'scheduled'
    });
  }

  const { data, error } = await supabase
    .from('matches')
    .insert(matches)
    .select();

  if (error) {
    throw error;
  }

  return data;
}
```

### Exemple : Déclarer le résultat d'un match

```javascript
async function reportMatchResult(matchId, team1Score, team2Score) {
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match) {
    throw new Error('Match non trouvé');
  }

  const winnerId = team1Score > team2Score 
    ? match.team1_id 
    : team2Score > team1Score 
      ? match.team2_id 
      : null;

  const { data, error } = await supabase
    .from('matches')
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      winner_id: winnerId,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

## 🔔 Notifications

### Exemple : Créer une notification

```javascript
async function createNotification(userId, type, message, relatedData = {}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      type,
      message,
      related_tournament_id: relatedData.tournamentId || null,
      related_comment_id: relatedData.commentId || null,
      related_user_id: relatedData.userId || null,
      is_read: false
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

### Exemple : Marquer toutes les notifications comme lues

```javascript
async function markAllNotificationsAsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}
```

## 📊 Real-time

### Exemple : Écouter les mises à jour d'un tournoi

```javascript
function subscribeToTournament(tournamentId, callback) {
  const channel = supabase.channel(`tournament-${tournamentId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournaments',
      filter: `id=eq.${tournamentId}`
    }, (payload) => {
      callback(payload);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'matches',
      filter: `tournament_id=eq.${tournamentId}`
    }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Utilisation
const unsubscribe = subscribeToTournament(tournamentId, (payload) => {
  console.log('Mise à jour:', payload);
  // Mettre à jour l'UI
});

// Nettoyer l'abonnement
// unsubscribe();
```

## 🎯 Badges & XP

### Exemple : Attribuer de l'XP et vérifier les badges

```javascript
async function awardXP(userId, amount, reason) {
  // Récupérer le niveau actuel
  const { data: currentLevel } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .single();

  const newTotalXP = (currentLevel?.total_xp || 0) + amount;
  const newLevel = calculateLevel(newTotalXP);

  // Mettre à jour le niveau
  const { data, error } = await supabase
    .from('user_levels')
    .upsert({
      user_id: userId,
      level: newLevel,
      total_xp: newTotalXP,
      xp: newTotalXP - getXPForLevel(newLevel)
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Vérifier les badges
  await checkAndAwardBadges(userId);

  return data;
}

function calculateLevel(totalXP) {
  // Formule : level = floor(sqrt(totalXP / 100))
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}
```

## 💬 Commentaires

### Exemple : Ajouter un commentaire avec notation

```javascript
async function addTournamentComment(tournamentId, content, rating) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Non authentifié');
  }

  const { data, error } = await supabase
    .from('tournament_comments')
    .insert([{
      tournament_id: tournamentId,
      user_id: session.user.id,
      content,
      rating: rating || null
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

## 🔍 Recherche Avancée

### Exemple : Recherche complète avec pagination

```javascript
async function searchWithPagination(query, filters, page = 1, pageSize = 10) {
  let queryBuilder = supabase
    .from('tournaments')
    .select('*', { count: 'exact' });

  // Recherche
  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,game.ilike.%${query}%`);
  }

  // Filtres
  if (filters.game) {
    queryBuilder = queryBuilder.eq('game', filters.game);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  queryBuilder = queryBuilder.range(from, to);

  // Tri
  queryBuilder = queryBuilder.order('created_at', { ascending: false });

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw error;
  }

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize)
  };
}
```

