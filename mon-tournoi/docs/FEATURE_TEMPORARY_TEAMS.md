# 🎯 Système d'Inscription avec Équipe Temporaire

## Vue d'ensemble

Cette fonctionnalité permet aux joueurs de s'inscrire à un tournoi de deux façons :
1. **Équipe existante** : Inscrire une équipe permanente dont ils sont capitaine
2. **Équipe temporaire** : Créer une équipe à la volée, uniquement pour ce tournoi

## Structure des fichiers

```
src/
├── components/
│   └── registration/
│       ├── index.js                    # Export centralisé
│       ├── TournamentRegistration.jsx  # Composant principal
│       ├── RegistrationTypeSelector.jsx # Choix du type d'inscription
│       ├── ExistingTeamSelector.jsx    # Sélection équipe existante
│       ├── TemporaryTeamForm.jsx       # Formulaire équipe temporaire
│       └── PlayerFieldsRepeater.jsx    # Champs répétables pour joueurs
├── shared/
│   └── services/
│       └── api/
│           └── registration.js         # Service API inscription
└── supabase/
    └── migrations/
        └── 20260119_temporary_teams.sql # Migration SQL
```

## Tables SQL créées

### `temporary_teams`
Stocke les équipes temporaires liées à une inscription de tournoi.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| tournament_id | UUID | Référence au tournoi |
| name | TEXT | Nom de l'équipe |
| tag | VARCHAR(5) | Tag court (optionnel) |
| logo_url | TEXT | URL du logo (optionnel) |
| captain_id | UUID | Créateur de l'équipe |
| captain_email | TEXT | Email de contact |
| discord_contact | TEXT | Discord (optionnel) |
| status | VARCHAR(20) | pending, validated, rejected, checked_in |
| converted_to_team_id | UUID | Si convertie en équipe permanente |

### `temporary_team_players`
Stocke les joueurs d'une équipe temporaire.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| temporary_team_id | UUID | Référence à l'équipe temp |
| player_name | TEXT | Pseudo du joueur |
| player_email | TEXT | Email (optionnel) |
| game_account | TEXT | Compte en jeu |
| game_account_platform | VARCHAR(50) | Plateforme (riot, steam...) |
| role | VARCHAR(50) | Rôle dans l'équipe |
| user_id | UUID | Lien vers compte existant (optionnel) |

### Modification de `participants`
Ajout de la colonne `temporary_team_id` pour permettre l'inscription avec équipe temporaire.

## Utilisation

### Dans un composant React

```jsx
import { TournamentRegistration } from './components/registration';

// Dans TournamentOverview ou PublicTournament
{tournoi.status === 'draft' && (
  <TournamentRegistration
    tournamentId={tournamentId}
    tournament={tournoi}
    session={session}
    onSuccess={onRefetch}
  />
)}
```

### API disponibles

```javascript
import { 
  checkRegistrationEligibility,
  getUserTeams,
  registerExistingTeam,
  registerTemporaryTeam,
  getUserTemporaryTeams,
  updateTemporaryTeam,
  cancelTemporaryTeamRegistration,
  convertToPermanentTeam
} from './shared/services/api/registration';

// Vérifier si un utilisateur peut s'inscrire
const { canRegister, reason, tournament, isFull, spotsLeft } = 
  await checkRegistrationEligibility(tournamentId, userId);

// Inscrire avec équipe existante
const result = await registerExistingTeam(tournamentId, teamId);

// Créer équipe temporaire et inscrire
const result = await registerTemporaryTeam(tournamentId, teamData, players);

// Convertir en équipe permanente après le tournoi
const { teamId } = await convertToPermanentTeam(tempTeamId);
```

## Flow utilisateur

1. **Clic sur "S'inscrire"** → Ouverture de la modale
2. **Choix du type** :
   - "Équipe existante" si le joueur est capitaine d'au moins une équipe
   - "Équipe temporaire" pour créer une nouvelle équipe à la volée
3. **Si équipe existante** :
   - Sélection parmi les équipes disponibles
   - Confirmation
4. **Si équipe temporaire** :
   - Remplir les infos de l'équipe (nom, tag, logo)
   - Ajouter les joueurs (pseudo, email, compte en jeu, rôle)
   - Validation et inscription

## RLS Policies

- **Lecture** : Tout le monde peut voir les équipes temporaires des tournois publics
- **Création** : Tout utilisateur connecté peut créer une équipe temporaire
- **Modification/Suppression** : Seul le capitaine ou l'owner du tournoi

## Prochaines améliorations possibles

1. **Validation par l'organisateur** : L'organisateur peut valider/refuser les inscriptions
2. **Import CSV** : Importer une liste de joueurs depuis un fichier
3. **Invitation par email** : Envoyer des invitations aux joueurs pour qu'ils lient leur compte
4. **Conversion automatique** : Proposer de convertir l'équipe temporaire après le tournoi
5. **Historique** : Voir les équipes temporaires passées d'un joueur
