# Documentation API - Fluky Boys

## 📋 Vue d'ensemble

Cette documentation décrit l'API Supabase utilisée par la plateforme Fluky Boys pour la gestion des tournois e-sport.

## 🔐 Authentification

### Configuration

L'API utilise Supabase pour l'authentification et la base de données.

```javascript
import { supabase } from './supabaseClient';
```

### Endpoints d'Authentification

#### Connexion
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

#### Inscription
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      username: 'username'
    }
  }
});
```

#### Déconnexion
```javascript
const { error } = await supabase.auth.signOut();
```

#### Session actuelle
```javascript
const { data: { session } } = await supabase.auth.getSession();
```

## 📊 Tables de Base de Données

### Tournaments (Tournois)

#### Récupérer tous les tournois
```javascript
const { data, error } = await supabase
  .from('tournaments')
  .select('*')
  .in('status', ['draft', 'ongoing'])
  .order('created_at', { ascending: false });
```

#### Récupérer un tournoi par ID
```javascript
const { data, error } = await supabase
  .from('tournaments')
  .select('*')
  .eq('id', tournamentId)
  .single();
```

#### Créer un tournoi
```javascript
const { data, error } = await supabase
  .from('tournaments')
  .insert([{
    name: 'Tournoi Example',
    game: 'Valorant',
    format: 'elimination',
    max_participants: 16,
    start_date: '2024-12-31T00:00:00Z',
    registration_deadline: '2024-12-30T00:00:00Z',
    rules: 'Règles du tournoi...',
    prize_pool: 1000,
    entry_fee: 10,
    status: 'draft',
    owner_id: userId
  }]);
```

#### Mettre à jour un tournoi
```javascript
const { data, error } = await supabase
  .from('tournaments')
  .update({
    status: 'ongoing',
    name: 'Nouveau nom'
  })
  .eq('id', tournamentId);
```

#### Supprimer un tournoi
```javascript
const { error } = await supabase
  .from('tournaments')
  .delete()
  .eq('id', tournamentId);
```

### Participants

#### Récupérer les participants d'un tournoi
```javascript
const { data, error } = await supabase
  .from('participants')
  .select(`
    *,
    teams (
      id,
      name,
      tag,
      logo_url
    )
  `)
  .eq('tournament_id', tournamentId);
```

#### Inscrire une équipe
```javascript
const { data, error } = await supabase
  .from('participants')
  .insert([{
    tournament_id: tournamentId,
    team_id: teamId,
    registered_at: new Date().toISOString()
  }]);
```

#### Désinscrire une équipe
```javascript
const { error } = await supabase
  .from('participants')
  .delete()
  .eq('tournament_id', tournamentId)
  .eq('team_id', teamId);
```

### Teams (Équipes)

#### Récupérer toutes les équipes
```javascript
const { data, error } = await supabase
  .from('teams')
  .select('*');
```

#### Créer une équipe
```javascript
const { data, error } = await supabase
  .from('teams')
  .insert([{
    name: 'Team Example',
    tag: 'TEX',
    logo_url: 'https://example.com/logo.png',
    captain_id: userId
  }]);
```

#### Récupérer les membres d'une équipe
```javascript
const { data, error } = await supabase
  .from('team_members')
  .select(`
    *,
    profiles (
      id,
      username,
      avatar_url
    )
  `)
  .eq('team_id', teamId);
```

### Matches

#### Récupérer les matchs d'un tournoi
```javascript
const { data, error } = await supabase
  .from('matches')
  .select(`
    *,
    team1:teams!matches_team1_id_fkey (
      id,
      name,
      tag
    ),
    team2:teams!matches_team2_id_fkey (
      id,
      name,
      tag
    )
  `)
  .eq('tournament_id', tournamentId)
  .order('scheduled_at', { ascending: true });
```

#### Créer un match
```javascript
const { data, error } = await supabase
  .from('matches')
  .insert([{
    tournament_id: tournamentId,
    team1_id: team1Id,
    team2_id: team2Id,
    round: 1,
    match_number: 1,
    scheduled_at: '2024-12-31T14:00:00Z',
    status: 'scheduled'
  }]);
```

#### Mettre à jour le résultat d'un match
```javascript
const { data, error } = await supabase
  .from('matches')
  .update({
    team1_score: 2,
    team2_score: 1,
    winner_id: team1Id,
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('id', matchId);
```

### Tournament Follows (Suivis)

#### Suivre un tournoi
```javascript
const { data, error } = await supabase
  .from('tournament_follows')
  .insert([{
    tournament_id: tournamentId,
    user_id: userId
  }]);
```

#### Ne plus suivre un tournoi
```javascript
const { error } = await supabase
  .from('tournament_follows')
  .delete()
  .eq('tournament_id', tournamentId)
  .eq('user_id', userId);
```

#### Récupérer les tournois suivis
```javascript
const { data, error } = await supabase
  .from('tournament_follows')
  .select(`
    *,
    tournaments (
      *
    )
  `)
  .eq('user_id', userId);
```

### Tournament Templates

#### Récupérer les templates
```javascript
const { data, error } = await supabase
  .from('tournament_templates')
  .select('*')
  .or('is_public.eq.true,created_by.eq.' + userId)
  .order('usage_count', { ascending: false });
```

#### Créer un template
```javascript
const { data, error } = await supabase
  .from('tournament_templates')
  .insert([{
    name: 'Template Example',
    description: 'Description...',
    game: 'Valorant',
    format: 'elimination',
    max_participants: 16,
    rules: 'Règles...',
    is_public: false,
    created_by: userId
  }]);
```

### Badges & XP

#### Récupérer les badges d'un utilisateur
```javascript
const { data, error } = await supabase
  .from('user_badges')
  .select(`
    *,
    badges (
      *
    )
  `)
  .eq('user_id', userId);
```

#### Récupérer le niveau d'un utilisateur
```javascript
const { data, error } = await supabase
  .from('user_levels')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Comments (Commentaires)

#### Récupérer les commentaires d'un tournoi
```javascript
const { data, error } = await supabase
  .from('tournament_comments')
  .select('*')
  .eq('tournament_id', tournamentId)
  .order('created_at', { ascending: false });
```

#### Ajouter un commentaire
```javascript
const { data, error } = await supabase
  .from('tournament_comments')
  .insert([{
    tournament_id: tournamentId,
    user_id: userId,
    content: 'Commentaire...',
    rating: 5
  }]);
```

#### Liker un commentaire
```javascript
const { data, error } = await supabase
  .from('comment_votes')
  .upsert([{
    comment_id: commentId,
    user_id: userId,
    vote_type: 'like'
  }]);
```

### Notifications

#### Récupérer les notifications
```javascript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

#### Marquer comme lu
```javascript
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId);
```

## 🔄 Real-time Subscriptions

### Écouter les changements de tournois
```javascript
const channel = supabase.channel('tournament-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tournaments',
    filter: `id=eq.${tournamentId}`
  }, (payload) => {
    console.log('Changement:', payload);
  })
  .subscribe();
```

### Écouter les nouveaux matchs
```javascript
const channel = supabase.channel('match-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'matches',
    filter: `tournament_id=eq.${tournamentId}`
  }, (payload) => {
    console.log('Nouveau match:', payload);
  })
  .subscribe();
```

## 🛡️ Row Level Security (RLS)

Toutes les tables utilisent Row Level Security pour garantir que les utilisateurs ne peuvent accéder qu'aux données autorisées.

### Politiques principales :
- **Tournaments** : Lecture publique, écriture pour les organisateurs
- **Participants** : Lecture publique, écriture pour les membres d'équipe
- **Teams** : Lecture publique, écriture pour les capitaines
- **Matches** : Lecture publique, écriture pour les organisateurs
- **Comments** : Lecture publique, écriture pour les utilisateurs authentifiés

## 📝 Exemples d'Utilisation

### Exemple complet : Créer et lancer un tournoi

```javascript
// 1. Créer le tournoi
const { data: tournament, error: tournamentError } = await supabase
  .from('tournaments')
  .insert([{
    name: 'Tournoi Valorant',
    game: 'Valorant',
    format: 'elimination',
    max_participants: 16,
    start_date: '2024-12-31T00:00:00Z',
    registration_deadline: '2024-12-30T00:00:00Z',
    rules: 'Règles...',
    status: 'draft',
    owner_id: userId
  }])
  .select()
  .single();

// 2. Mettre à jour le statut
const { error: updateError } = await supabase
  .from('tournaments')
  .update({ status: 'ongoing' })
  .eq('id', tournament.id);
```

## 🚨 Gestion des Erreurs

Toujours vérifier les erreurs :

```javascript
const { data, error } = await supabase
  .from('tournaments')
  .select('*');

if (error) {
  console.error('Erreur:', error.message);
  // Gérer l'erreur
} else {
  // Utiliser les données
  console.log('Données:', data);
}
```

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

