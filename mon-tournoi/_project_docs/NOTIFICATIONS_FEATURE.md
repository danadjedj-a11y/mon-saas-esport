# 🔔 Système de Notifications

## Description

Le système de notifications permet aux utilisateurs de recevoir des alertes en temps réel pour les événements importants de leurs tournois : matchs planifiés, résultats de matchs, conflits de scores, messages admin, etc.

## Fonctionnalités

### ✅ Composant NotificationCenter
- **Badge avec compteur** : Affiche le nombre de notifications non lues
- **Dropdown interactif** : Liste des notifications avec icônes par type
- **Marquer comme lu** : Individuellement ou toutes d'un coup
- **Suppression** : Possibilité de supprimer des notifications
- **Liens cliquables** : Redirection automatique vers la page concernée
- **Temps réel** : Mises à jour automatiques via Supabase Realtime

### ✅ Types de Notifications

1. **⏰ match_upcoming** : Match planifié
   - Déclenché quand un match est programmé avec une date/heure
   - Notifie les deux équipes participantes

2. **🏆 match_result** : Résultat de match
   - Déclenché quand un match se termine
   - Notification différente pour gagnants et perdants

3. **⚠️ score_dispute** : Conflit de scores
   - Déclenché quand les deux équipes déclarent des scores différents
   - Notifie les deux équipes qu'un admin doit intervenir

4. **📢 admin_message** : Message de l'organisateur
   - Pour les messages personnalisés de l'admin aux participants

5. **📊 tournament_update** : Mise à jour du tournoi
   - Pour les annonces générales du tournoi

6. **👥 team_invite** : Invitation d'équipe
   - Pour les invitations à rejoindre une équipe (à implémenter)

## Installation

### 1. Migration SQL

Exécuter la migration dans Supabase (section SQL Editor) :

```sql
-- Voir database_migrations.sql section "Système de Notifications"
```

La migration crée :
- Table `notifications` avec tous les champs nécessaires
- Index pour optimiser les performances
- Structure pour stocker métadonnées (JSONB)

### 2. Composants

Le système est déjà intégré dans :
- ✅ `Dashboard.jsx` : NotificationCenter visible dans le header
- ✅ `SchedulingModal.jsx` : Notifications pour matchs planifiés
- ✅ `Tournament.jsx` : Notifications pour résultats (admin)
- ✅ `MatchLobby.jsx` : Notifications pour résultats (self-reporting) et conflits

## Utilisation

### Pour les Utilisateurs

1. **Voir les notifications** : Cliquer sur l'icône 🔔 dans le header
2. **Marquer comme lu** : Cliquer sur une notification ou utiliser "Tout marquer comme lu"
3. **Accéder au contenu** : Cliquer sur une notification pour aller à la page concernée
4. **Supprimer** : Cliquer sur le ✕ à droite de chaque notification

### Pour les Développeurs

#### Créer une notification simple

```javascript
import { createNotification } from './notificationUtils';

await createNotification(
  userId,                    // ID de l'utilisateur
  'match_upcoming',          // Type de notification
  'Match à venir',           // Titre
  'Votre match commence dans 1h', // Message
  '/match/123',              // Lien (optionnel)
  { match_id: '123' }        // Métadonnées (optionnel)
);
```

#### Créer des notifications pour une équipe

```javascript
import { notifyMatchUpcoming } from './notificationUtils';

await notifyMatchUpcoming(
  matchId,      // ID du match
  team1Id,      // ID équipe 1
  team2Id,      // ID équipe 2
  scheduledDate // Date/heure du match
);
```

#### Fonctions disponibles

- `createNotification(userId, type, title, message, link, metadata)`
- `createNotificationsForUsers(userIds[], type, title, message, link, metadata)`
- `notifyMatchUpcoming(matchId, team1Id, team2Id, scheduledAt)`
- `notifyMatchResult(matchId, winnerTeamId, loserTeamId, score1, score2)`
- `notifyScoreDispute(matchId, team1Id, team2Id)`
- `notifyAdminMessage(tournamentId, userIds, message)`
- `notifyTournamentUpdate(tournamentId, tournamentName, message)`

## Structure de la Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);
```

## Design

- **Badge rouge** : Compteur de notifications non lues (99+ si > 99)
- **Dropdown** : Fond sombre (#1a1a1a), 400px de large, max 500px de hauteur
- **Notifications non lues** : Fond légèrement plus clair (#2a2a2a) + point bleu
- **Icônes** : Différentes selon le type de notification
- **Temps** : Format relatif (Il y a 5 min, Il y a 2h, etc.)

## Événements Automatiques

### Matchs planifiés
- Déclenché dans `SchedulingModal.jsx` quand un admin planifie un match
- Notifie automatiquement les deux équipes

### Résultats de matchs
- Déclenché dans `Tournament.jsx` (admin) et `MatchLobby.jsx` (self-reporting)
- Notifie les deux équipes (message différent pour gagnants/perdants)

### Conflits de scores
- Déclenché dans `MatchLobby.jsx` quand les scores ne concordent pas
- Notifie les deux équipes qu'un admin doit intervenir

## Améliorations Futures

- 📧 **Notifications email** : Envoyer par email pour les notifications importantes
- 🔔 **Push notifications** : Notifications push navigateur
- 📱 **Notifications mobile** : Pour application mobile
- ⚙️ **Préférences** : Permettre aux utilisateurs de choisir quelles notifications recevoir
- 🔕 **Mode Ne pas déranger** : Désactiver temporairement les notifications
- 📊 **Statistiques** : Voir combien de notifications ont été lues/ignorées
- 🔍 **Filtres** : Filtrer les notifications par type
- 📅 **Notifications programmées** : Notifications récurrentes (ex: rappel 1h avant match)

## Notes Techniques

- **Performance** : Index sur `user_id`, `read`, `created_at` pour requêtes rapides
- **Temps réel** : Utilise Supabase Realtime pour les mises à jour instantanées
- **Limite** : Affiche les 50 dernières notifications par utilisateur
- **Nettoyage** : Les notifications sont liées aux utilisateurs (CASCADE DELETE)

## Sécurité

- Les notifications sont privées : chaque utilisateur ne voit que ses propres notifications
- RLS (Row Level Security) devrait être configuré dans Supabase :
  ```sql
  CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);
  ```

