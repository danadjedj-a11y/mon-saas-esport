# 📋 Analyse Complète : Améliorations par rapport à Toornament Organizer

**Date :** 19 janvier 2026  
**Projet :** Mon-Tournoi  
**Référence :** Toornament.com (Interface Organizer)

---

## 🎯 Vue d'Ensemble

Cette analyse compare votre plateforme **Mon-Tournoi** avec **Toornament Organizer** pour identifier les fonctionnalités manquantes et les axes d'amélioration prioritaires. L'analyse se concentre sur **l'interface d'organisation/administration** des tournois.

---

## 📂 Structure de Navigation Toornament vs Mon-Tournoi

### **Navigation Toornament Organizer**
```
📁 Vue d'ensemble
📁 Paramètres
   ├── Général
   ├── Apparence
   ├── Discipline
   ├── Match
   ├── Inscriptions
   ├── Participant
   ├── Champs personnalisés
   ├── Emplacements de match
   ├── Langues
   ├── Permissions
   └── Opérations globales
📁 Structure
📁 Participants
   ├── Liste
   ├── Éditer tous
   └── Exporter
📁 Placement
   ├── Vue d'ensemble
   └── 1. Playoffs (par phase)
📁 Matchs
   ├── Vue d'ensemble
   └── 1. Playoffs (par phase)
📁 Classement final
📁 Partage
   ├── Page publique du tournoi
   ├── Widgets
   └── Toornament TV
📁 Sponsors
📁 Streams
📁 Support & Legal
📁 Language
```

### **Navigation Mon-Tournoi (Actuelle)**
```
📁 Vue d'ensemble
📁 Paramètres (basique)
📁 Structure (manquant)
📁 Participants (liste simple dans AdminPanel)
📁 Placement (manquant en tant que section dédiée)
📁 Matchs (dans AdminPanel)
📁 Classement final (existe)
📁 Partage (manquant)
📁 Sponsors (dans CreateTournament)
📁 Streams (dans CreateTournament)
```

---

## 🚨 PROBLÈMES MAJEURS IDENTIFIÉS

### **1. ❌ ABSENCE TOTALE DE SECTION "STRUCTURE"**

**Ce qui manque :**
- Page dédiée `/organizer/tournament/:id/structure`
- Gestion des phases/stages multiples
- Visualisation de l'arbre AVANT le lancement
- Édition manuelle de la structure du tournoi

**Impact :** 
- Impossible de créer un tournoi avec Qualifications (Round Robin) + Playoffs (Elimination)
- Pas de contrôle sur la structure avant de lancer
- Workflow rigide et non professionnel

**Solution proposée :**
```jsx
// Nouveau composant à créer
src/pages/organizer/TournamentStructure.jsx
  ├── PhaseList (liste des phases)
  ├── PhaseCreator (modal création phase)
  ├── BracketEditor (éditeur visuel d'arbre)
  └── PhaseConfiguration (paramètres par phase)
```

---

### **2. ❌ SECTION "PLACEMENT" ABSENTE**

**Sur Toornament :**
- Vue d'ensemble du placement
- Sous-section par phase ("1. Playoffs", "2. Finals", etc.)
- Interface dédiée pour placer les équipes dans l'arbre
- Options : Placement manuel, automatique, par seeding

**Votre projet :**
- Le `SeedingModal` existe mais est limité (juste une liste d'ordre)
- Pas de visualisation de l'arbre avec les positions
- Pas de drag & drop visuel des équipes dans les brackets
- Placement automatique forcé au lancement

**Solution proposée :**
```jsx
// Nouvelle page
src/pages/organizer/TournamentPlacement.jsx
  ├── PlacementOverview (vue d'ensemble)
  ├── PhaseSelector (sélecteur de phase)
  ├── BracketPlacementEditor (drag & drop visuel)
  │   ├── Affichage de l'arbre avec "Seed #1", "Seed #2"...
  │   ├── Drag & drop des équipes inscrites
  │   ├── Bouton "Auto-placer selon seeding"
  │   └── Bouton "Placer aléatoirement"
  └── PlacementValidation (vérification avant lancement)
```

---

### **3. ❌ SECTION "MATCHS" INSUFFISANTE**

**Sur Toornament :**
- **Vue d'ensemble** : statistiques globales des matchs
- **Par phase** : affichage et gestion des matchs de chaque phase
- Filtres avancés (statut, round, bracket)
- Export des résultats

**Votre projet :**
- AdminPanel avec onglet "Matchs"
- Vue basique sans filtres avancés
- Pas de séparation par phase (car pas de phases)
- Pas d'export

**Améliorations nécessaires :**
```jsx
// Améliorer AdminMatchesTab.jsx
- Ajouter filtres : Phase, Round, Bracket, Statut, Date
- Vue calendrier vs vue liste
- Export CSV/JSON des matchs
- Actions en masse (planifier plusieurs matchs d'un coup)
- Statistiques : temps moyen de match, conflits, retards
```

---

### **4. ⚠️ PARAMÈTRES FRAGMENTÉS**

**Sur Toornament :** 11 sous-sections de paramètres

**Détails des sous-sections manquantes :**

#### **a) Apparence**
- Logo du tournoi
- Couleur principale
- Bannière personnalisée
- Thème (clair/sombre/personnalisé)

**Votre projet :** Basique (logo via sponsors)

---

#### **b) Discipline**
- Choix du jeu
- Configuration spécifique au jeu (maps, modes de jeu, règles)
- Intégration API du jeu (stats, comptes de joueurs)

**Votre projet :** Choix de jeu basique, pas de config avancée

---

#### **c) Match - Paramètres de Match**
- Format de score (points, rounds, victoires)
- Règles de victoire (premier à X, total, différence)
- Temps limite de match
- Pause autorisée ?
- Report de match autorisé ?
- Configuration des maps (veto, pick & ban)

**Votre projet :** Seulement Best-of-X et maps_pool basique

---

#### **d) Inscriptions**
- Date d'ouverture/fermeture des inscriptions
- Limite de participants
- Validation manuelle ou auto
- Formulaire d'inscription personnalisé
- Frais d'inscription
- Liste d'attente automatique

**Votre projet :** Inscription basique, waitlist existe mais pas auto

---

#### **e) Participant**
- Type de participant (Solo, Équipe, Duo)
- Taille min/max des équipes
- Rôles dans les équipes
- Vérification des comptes de jeu
- Restrictions (région, rang, etc.)

**Votre projet :** Équipes seulement, pas de config avancée

---

#### **f) Champs personnalisés**
- Créer des champs custom pour l'inscription
- Ex: "Rank League of Legends", "Discord", "Numéro de licence", etc.
- Types : texte, nombre, choix multiple, case à cocher

**Votre projet :** ❌ N'existe pas

---

#### **g) Emplacements de match**
- Définir des lieux physiques (pour LAN)
- Ou serveurs de jeu (EU-West, NA, etc.)
- Assigner des matchs à des emplacements
- Capacité de chaque emplacement

**Votre projet :** ❌ N'existe pas (scheduling basique seulement)

---

#### **h) Langues**
- Multi-langue pour le tournoi
- Traductions des règles, descriptions
- Langue par défaut

**Votre projet :** i18n existe (config.js) mais pas intégré à l'admin

---

#### **i) Permissions**
- Gérer les rôles (Admin, Modérateur, Arbitre, Caster)
- Inviter des co-organisateurs
- Permissions granulaires (qui peut éditer quoi)

**Votre projet :** ❌ N'existe pas (un seul owner)

---

#### **j) Opérations globales**
- Exporter le tournoi (backup)
- Dupliquer le tournoi (existe partiellement)
- Archiver
- Supprimer définitivement
- Réinitialiser les résultats

**Votre projet :** Duplication existe, le reste manque

---

### **5. ❌ SECTION "PARTICIPANTS" LIMITÉE**

**Sur Toornament : 3 sous-sections**

#### **a) Liste**
- Tableau avec filtres (checked-in, disqualifié, etc.)
- Recherche
- Tri par colonne
- Actions : DQ, éditer, contacter

**Votre projet :** Liste basique dans AdminPanel

---

#### **b) Éditer tous**
- **Fonctionnalité puissante :** éditer plusieurs participants en même temps
- Ex: changer le seeding de 10 équipes d'un coup
- Import CSV pour mise à jour en masse

**Votre projet :** ❌ N'existe pas

---

#### **c) Exporter**
- Export CSV des participants
- Export avec stats (matchs joués, victoires, etc.)
- Export pour impression (badges, check-in list)

**Votre projet :** ❌ N'existe pas

---

### **6. ❌ SECTION "PARTAGE" ABSENTE**

**Sur Toornament : 3 sous-sections**

#### **a) Page publique du tournoi**
- URL personnalisée
- SEO (meta description, keywords)
- Partage social (OpenGraph, Twitter Cards)
- Embed code

**Votre projet :** PublicTournament.jsx existe mais pas de config admin

---

#### **b) Widgets**
- Widget bracket pour intégrer sur site externe
- Widget classement
- Widget prochains matchs
- Code iframe généré

**Votre projet :** ❌ N'existe pas

---

#### **c) Toornament TV**
- Streaming overlay
- Écran de contrôle pour les casters
- Affichage automatique des scores

**Votre projet :** StreamOverlay.jsx existe mais pas intégré dans l'admin

---

### **7. ⚠️ SPONSORS ET STREAMS PAS EN ADMIN**

**Sur Toornament :** Sections dédiées dans l'interface organizer

**Votre projet :** 
- Dans CreateTournament uniquement
- Pas d'édition après création
- Pas de gestion visuelle

**Solution :**
- Créer page `/organizer/tournament/:id/sponsors`
- Créer page `/organizer/tournament/:id/streams`
- Interface drag & drop pour réorganiser
- Preview en temps réel

---

## 🎨 FONCTIONNALITÉS AVANCÉES MANQUANTES

### **8. Format "Gauntlet"**
**Description :** Les équipes moins bien classées combattent progressivement les mieux classées (format "échelle")

**Exemple :**
```
Seed #8 vs Seed #7 → Gagnant vs Seed #6 → Gagnant vs Seed #5 → ... → Gagnant vs Seed #1
```

**Utilisation :** Qualifications, tournois avec têtes de série protégées

---

### **9. Groupes d'Arbres**
**Description :** Plusieurs brackets parallèles (ex: Bracket EU + Bracket NA)

**Cas d'usage :**
- Tournois multi-régions
- Tournois multi-jeux
- Divisions séparées

---

### **10. Arbre Personnalisé**
**Description :** L'admin crée manuellement la structure (nombre de rounds, matchs par round, etc.)

**Cas d'usage :**
- Formats non standards
- Tournois expérimentaux
- Events spéciaux

---

### **11. Système de Ligue avec Divisions**
**Description :** Saison avec plusieurs journées, classement cumulé, promotion/relégation

**Cas d'usage :**
- Ligues esport (LEC, LCS, etc.)
- Championnats sur plusieurs semaines

---

### **12. Configuration Avancée de Grande Finale**

**Sur Toornament :**
- Simple : 1 seul match pour la finale
- Double : Le gagnant du Losers Bracket doit gagner 2 fois (bracket reset)
- Personnalisé : Définir l'avantage (1-0 de base, ban bonus, etc.)

**Votre projet :** 
- is_reset existe dans le code mais pas configurable
- Pas de choix de format de finale

---

### **13. Gestion des Conflits de Planning**

**Manque :**
- Détection automatique des conflits (équipe jouant 2 matchs en même temps)
- Suggestions de re-planification
- Calendrier visuel avec conflits surlignés

**Votre projet :** Basique (juste affichage des conflits disputés)

---

### **14. Système de Check-in Avancé**

**Manque :**
- Check-in par round (pas juste au début)
- Fenêtre de check-in configurable (15 min avant le match)
- Auto-DQ si pas de check-in
- Notifications automatiques

**Votre projet :** Check-in global uniquement

---

### **15. Gestion des Matchs Reports/Forfaits**

**Manque :**
- Demande de report par les équipes
- Validation par l'admin
- Historique des reports
- Pénalités automatiques

---

### **16. Statistiques Avancées**

**Manque :**
- Statistiques par joueur (pas juste par équipe)
- Heatmap des performances
- Comparaison équipes
- Export des stats pour analyse

---

### **17. Système de Notifications Push**

**Votre projet :** NotificationCenter existe mais limité

**Manque :**
- Notifications push navigateur
- Notifications email automatiques
- Templates de notifications personnalisables
- Envoi groupé

---

### **18. Modération et Rapports**

**Manque :**
- Système de rapport de triche/toxicité
- Interface de modération
- Historique des sanctions
- Bannissement d'équipes/joueurs

---

### **19. Intégration Paiements**

**Manque :**
- Frais d'inscription payants
- Gestion des cashprizes (paiement automatique)
- Remboursements
- Dashboard financier

---

### **20. API Publique**

**Manque :**
- API REST pour consommer les données
- Documentation OpenAPI
- Webhooks (match terminé, inscription, etc.)
- Rate limiting

---

## 📊 TABLEAU COMPARATIF PAR FONCTIONNALITÉ

| Fonctionnalité | Toornament | Mon-Tournoi | Priorité |
|----------------|------------|-------------|----------|
| **Gestion multi-phases** | ✅ Complet | ❌ N'existe pas | 🔴 CRITIQUE |
| **Éditeur de bracket pré-tournoi** | ✅ Complet | ❌ N'existe pas | 🔴 CRITIQUE |
| **Placement manuel visuel** | ✅ Drag & drop | ⚠️ Liste seeding | 🔴 CRITIQUE |
| **Section Structure dédiée** | ✅ Oui | ❌ Non | 🔴 CRITIQUE |
| **Section Placement dédiée** | ✅ Oui | ❌ Non | 🔴 CRITIQUE |
| **Paramètres avancés (11 sections)** | ✅ Complet | ⚠️ Basique | 🟠 HAUTE |
| **Participants - Éditer tous** | ✅ Oui | ❌ Non | 🟠 HAUTE |
| **Participants - Exporter** | ✅ CSV/JSON | ❌ Non | 🟡 MOYENNE |
| **Section Partage** | ✅ Widgets + embed | ❌ Non | 🟠 HAUTE |
| **Champs personnalisés** | ✅ Oui | ❌ Non | 🟡 MOYENNE |
| **Emplacements de match** | ✅ Oui | ❌ Non | 🟡 MOYENNE |
| **Permissions/Rôles** | ✅ Granulaire | ❌ 1 owner | 🟠 HAUTE |
| **Format Gauntlet** | ✅ Oui | ❌ Non | 🟢 BASSE |
| **Groupes d'arbres** | ✅ Oui | ❌ Non | 🟢 BASSE |
| **Arbre personnalisé** | ✅ Oui | ❌ Non | 🟡 MOYENNE |
| **Système de ligue** | ✅ Oui | ❌ Non | 🟢 BASSE |
| **Grande finale configurable** | ✅ 3 modes | ⚠️ Basique | 🟡 MOYENNE |
| **Conflits planning auto** | ✅ Détection + suggestions | ⚠️ Affichage | 🟡 MOYENNE |
| **Check-in par round** | ✅ Oui | ❌ Global seulement | 🟡 MOYENNE |
| **Gestion reports/forfaits** | ✅ Workflow complet | ❌ Manuel | 🟡 MOYENNE |
| **Stats avancées** | ✅ Par joueur | ⚠️ Par équipe | 🟢 BASSE |
| **Notifications push** | ✅ Email + Push | ⚠️ Basique | 🟡 MOYENNE |
| **Modération/Rapports** | ✅ Interface dédiée | ❌ Non | 🟢 BASSE |
| **Paiements** | ✅ Intégré | ❌ Non | 🟢 BASSE |
| **API publique** | ✅ Oui | ❌ Non | 🟢 BASSE |

---

## 🚀 PLAN D'ACTION PRIORISÉ

### **Phase 1 : Fondations Critiques (3-4 semaines)**

#### **Semaine 1-2 : Système de Phases**
```bash
# Tâches
1. Créer migration SQL pour table tournament_phases
2. Créer modèle/services pour les phases
3. Créer page /organizer/tournament/:id/structure
4. Implémenter UI de création de phase (modal comme Toornament)
5. Modifier la génération de matchs pour supporter les phases
6. Ajouter phase_id à la table matches
```

**Fichiers à créer :**
- `src/pages/organizer/TournamentStructure.jsx`
- `src/components/phases/PhaseList.jsx`
- `src/components/phases/PhaseCreator.jsx`
- `src/components/phases/PhaseCard.jsx`
- `src/shared/services/api/phases.js`
- `migrations/XXX_add_tournament_phases.sql`

---

#### **Semaine 3-4 : Éditeur de Bracket Pré-Tournoi**
```bash
# Tâches
1. Créer BracketEditor avec affichage de l'arbre vide
2. Afficher "Seed #1", "Seed #2", etc. dans les slots
3. Permettre le placement manuel avant génération
4. Sauvegarder le placement dans une table bracket_slots
5. Modifier startTournament pour utiliser le placement sauvegardé
```

**Fichiers à créer :**
- `src/components/bracket/BracketEditor.jsx`
- `src/components/bracket/BracketSlot.jsx`
- `src/components/bracket/TeamDraggable.jsx`
- `migrations/XXX_add_bracket_slots.sql`

---

### **Phase 2 : Placement et Paramètres (2-3 semaines)**

#### **Semaine 5-6 : Section Placement**
```bash
# Tâches
1. Créer page /organizer/tournament/:id/placement
2. Implémenter PlacementOverview (vue d'ensemble)
3. Placement par phase avec sélecteur
4. Drag & drop visuel des équipes dans l'arbre
5. Boutons "Auto-placer" et "Réinitialiser"
```

**Fichiers à créer :**
- `src/pages/organizer/TournamentPlacement.jsx`
- `src/components/placement/PlacementOverview.jsx`
- `src/components/placement/BracketPlacementEditor.jsx`

---

#### **Semaine 7 : Paramètres Avancés**
```bash
# Tâches
1. Réorganiser CreateTournament en sections (comme Toornament)
2. Créer pages de paramètres pour chaque section
3. Implémenter :
   - Apparence (logo, couleurs, bannière)
   - Match (config avancée)
   - Champs personnalisés
```

**Fichiers à créer :**
- `src/pages/organizer/settings/TournamentAppearance.jsx`
- `src/pages/organizer/settings/MatchSettings.jsx`
- `src/pages/organizer/settings/CustomFields.jsx`

---

### **Phase 3 : Participants et Partage (2 semaines)**

#### **Semaine 8 : Participants Avancés**
```bash
# Tâches
1. Améliorer AdminParticipantsTab avec filtres avancés
2. Implémenter "Éditer tous" (bulk edit)
3. Implémenter "Exporter" (CSV/JSON)
```

---

#### **Semaine 9 : Section Partage**
```bash
# Tâches
1. Créer page /organizer/tournament/:id/sharing
2. Configuration page publique (SEO, URL custom)
3. Générateur de widgets (iframe embed)
4. Intégration StreamOverlay dans l'admin
```

**Fichiers à créer :**
- `src/pages/organizer/TournamentSharing.jsx`
- `src/components/sharing/WidgetGenerator.jsx`
- `src/components/sharing/EmbedCode.jsx`

---

### **Phase 4 : Fonctionnalités Avancées (4+ semaines)**

#### **Semaine 10-11 : Formats Avancés**
- Gauntlet
- Groupes d'arbres
- Arbre personnalisé

#### **Semaine 12-13 : Gestion Avancée**
- Permissions/Rôles
- Check-in par round
- Gestion reports/forfaits
- Conflits planning auto

#### **Semaine 14+ : Nice to Have**
- Système de ligue
- Modération
- Paiements
- API publique

---

## 🗂️ ARCHITECTURE PROPOSÉE

### **Nouvelle Structure de Dossiers**
```
src/
├── pages/
│   ├── organizer/
│   │   ├── TournamentStructure.jsx          [NOUVEAU]
│   │   ├── TournamentPlacement.jsx          [NOUVEAU]
│   │   ├── TournamentSharing.jsx            [NOUVEAU]
│   │   ├── TournamentSponsors.jsx           [NOUVEAU]
│   │   ├── TournamentStreams.jsx            [NOUVEAU]
│   │   └── settings/
│   │       ├── TournamentGeneral.jsx
│   │       ├── TournamentAppearance.jsx     [NOUVEAU]
│   │       ├── TournamentDiscipline.jsx     [NOUVEAU]
│   │       ├── MatchSettings.jsx            [NOUVEAU]
│   │       ├── RegistrationSettings.jsx     [NOUVEAU]
│   │       ├── ParticipantSettings.jsx      [NOUVEAU]
│   │       ├── CustomFields.jsx             [NOUVEAU]
│   │       ├── MatchLocations.jsx           [NOUVEAU]
│   │       ├── LanguageSettings.jsx         [NOUVEAU]
│   │       ├── Permissions.jsx              [NOUVEAU]
│   │       └── GlobalOperations.jsx         [NOUVEAU]
├── components/
│   ├── phases/
│   │   ├── PhaseList.jsx                    [NOUVEAU]
│   │   ├── PhaseCard.jsx                    [NOUVEAU]
│   │   ├── PhaseCreator.jsx                 [NOUVEAU]
│   │   └── PhaseConfiguration.jsx           [NOUVEAU]
│   ├── bracket/
│   │   ├── BracketEditor.jsx                [NOUVEAU]
│   │   ├── BracketSlot.jsx                  [NOUVEAU]
│   │   └── TeamDraggable.jsx                [NOUVEAU]
│   ├── placement/
│   │   ├── PlacementOverview.jsx            [NOUVEAU]
│   │   ├── BracketPlacementEditor.jsx       [NOUVEAU]
│   │   └── PlacementValidation.jsx          [NOUVEAU]
│   ├── sharing/
│   │   ├── WidgetGenerator.jsx              [NOUVEAU]
│   │   ├── EmbedCode.jsx                    [NOUVEAU]
│   │   └── SEOConfiguration.jsx             [NOUVEAU]
│   └── permissions/
│       ├── RoleManager.jsx                  [NOUVEAU]
│       ├── InviteCoOrganizer.jsx            [NOUVEAU]
│       └── PermissionMatrix.jsx             [NOUVEAU]
├── shared/
│   └── services/
│       └── api/
│           ├── phases.js                    [NOUVEAU]
│           ├── placement.js                 [NOUVEAU]
│           ├── widgets.js                   [NOUVEAU]
│           └── permissions.js               [NOUVEAU]
```

---

## 📝 MIGRATIONS SQL NÉCESSAIRES

### **1. Table tournament_phases**
```sql
CREATE TABLE tournament_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  format TEXT NOT NULL, -- 'elimination', 'double_elimination', 'round_robin', 'swiss', 'gauntlet', 'custom'
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft', -- 'draft', 'ongoing', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, phase_order)
);

-- Index
CREATE INDEX idx_tournament_phases_tournament ON tournament_phases(tournament_id);
CREATE INDEX idx_tournament_phases_order ON tournament_phases(tournament_id, phase_order);
```

### **2. Ajouter phase_id aux matchs**
```sql
ALTER TABLE matches ADD COLUMN phase_id UUID REFERENCES tournament_phases(id) ON DELETE CASCADE;
CREATE INDEX idx_matches_phase ON matches(phase_id);
```

### **3. Table bracket_slots (placement pré-tournoi)**
```sql
CREATE TABLE bracket_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL, -- Position dans l'arbre (1 = Seed #1, etc.)
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phase_id, slot_number)
);

CREATE INDEX idx_bracket_slots_phase ON bracket_slots(phase_id);
```

### **4. Table custom_fields**
```sql
CREATE TABLE tournament_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'select', 'checkbox', 'date'
  field_options JSONB, -- Pour les selects (liste des options)
  required BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participant_custom_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES tournament_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE(participant_id, custom_field_id)
);
```

### **5. Table match_locations**
```sql
CREATE TABLE match_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL, -- 'physical', 'server', 'online'
  capacity INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN location_id UUID REFERENCES match_locations(id) ON DELETE SET NULL;
```

### **6. Table permissions (rôles et permissions)**
```sql
CREATE TABLE tournament_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'admin', 'moderator', 'referee', 'caster'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_roles_tournament ON tournament_roles(tournament_id);
CREATE INDEX idx_tournament_roles_user ON tournament_roles(user_id);
```

### **7. Table pour les widgets**
```sql
CREATE TABLE tournament_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL, -- 'bracket', 'standings', 'upcoming_matches', 'results'
  config JSONB DEFAULT '{}',
  embed_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 💻 EXEMPLES DE CODE

### **Exemple 1 : PhaseCreator Modal**
```jsx
// src/components/phases/PhaseCreator.jsx
import React, { useState } from 'react';
import { Button, Input, Select } from '../../shared/components/ui';

export default function PhaseCreator({ tournamentId, onPhaseCreated, phaseOrder }) {
  const [phaseName, setPhaseName] = useState('');
  const [phaseType, setPhaseType] = useState('');
  
  const phaseTypes = [
    { value: 'elimination', label: 'Élimination directe', icon: '🏆' },
    { value: 'double_elimination', label: 'Double élimination', icon: '⚔️' },
    { value: 'round_robin', label: 'Round Robin', icon: '🔄' },
    { value: 'swiss', label: 'Système Suisse', icon: '🇨🇭' },
    { value: 'gauntlet', label: 'Gauntlet', icon: '🎯' },
    { value: 'custom', label: 'Personnalisé', icon: '⚙️' },
  ];
  
  const handleCreate = async () => {
    // Créer la phase via API
    const newPhase = await createPhase({
      tournament_id: tournamentId,
      name: phaseName,
      phase_order: phaseOrder,
      format: phaseType,
      status: 'draft'
    });
    
    onPhaseCreated(newPhase);
  };
  
  return (
    <div className="phase-creator">
      <h2>Choisir un type de phase</h2>
      
      <div className="phase-types-grid">
        {phaseTypes.map(type => (
          <div 
            key={type.value}
            className={`phase-type-card ${phaseType === type.value ? 'selected' : ''}`}
            onClick={() => setPhaseType(type.value)}
          >
            <div className="icon">{type.icon}</div>
            <div className="label">{type.label}</div>
          </div>
        ))}
      </div>
      
      <Input 
        label="Nom de la phase"
        placeholder="Ex: Qualifications, Playoffs..."
        value={phaseName}
        onChange={(e) => setPhaseName(e.target.value)}
      />
      
      <Button onClick={handleCreate} disabled={!phaseName || !phaseType}>
        Créer la phase
      </Button>
    </div>
  );
}
```

### **Exemple 2 : BracketEditor**
```jsx
// src/components/bracket/BracketEditor.jsx
import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function BracketSlot({ slotNumber, team, onDrop }) {
  const [{ isOver }, drop] = useDrop({
    accept: 'TEAM',
    drop: (item) => onDrop(item.teamId, slotNumber),
    collect: (monitor) => ({ isOver: monitor.isOver() })
  });
  
  return (
    <div 
      ref={drop}
      className={`bracket-slot ${isOver ? 'hover' : ''}`}
    >
      {team ? (
        <TeamCard team={team} />
      ) : (
        <div className="empty-slot">Seed #{slotNumber}</div>
      )}
    </div>
  );
}

function DraggableTeam({ team }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TEAM',
    item: { teamId: team.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  });
  
  return (
    <div ref={drag} className={`draggable-team ${isDragging ? 'dragging' : ''}`}>
      <img src={team.logo_url} alt={team.name} />
      <span>{team.name}</span>
    </div>
  );
}

export default function BracketEditor({ phaseId, participants }) {
  const [slots, setSlots] = useState([]);
  const [unplacedTeams, setUnplacedTeams] = useState([]);
  
  useEffect(() => {
    // Charger les slots existants ou créer l'arbre vide
    loadBracketSlots(phaseId);
  }, [phaseId]);
  
  const handleDrop = async (teamId, slotNumber) => {
    // Sauvegarder le placement
    await saveBracketSlot(phaseId, slotNumber, teamId);
    
    // Mettre à jour l'UI
    setSlots(prev => prev.map(slot => 
      slot.number === slotNumber 
        ? { ...slot, team_id: teamId }
        : slot
    ));
    
    setUnplacedTeams(prev => prev.filter(t => t.id !== teamId));
  };
  
  const autoPlace = async () => {
    // Placement automatique selon le seeding
    const orderedTeams = [...participants].sort((a, b) => 
      (a.seed_order || 999) - (b.seed_order || 999)
    );
    
    for (let i = 0; i < orderedTeams.length; i++) {
      await saveBracketSlot(phaseId, i + 1, orderedTeams[i].team_id);
    }
    
    loadBracketSlots(phaseId);
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bracket-editor">
        <div className="toolbar">
          <button onClick={autoPlace}>Auto-placer selon seeding</button>
          <button onClick={resetPlacement}>Réinitialiser</button>
        </div>
        
        <div className="editor-container">
          {/* Arbre visuel avec les slots */}
          <div className="bracket-view">
            {slots.map(slot => (
              <BracketSlot 
                key={slot.number}
                slotNumber={slot.number}
                team={slot.team}
                onDrop={handleDrop}
              />
            ))}
          </div>
          
          {/* Équipes non placées */}
          <div className="unplaced-teams">
            <h3>Équipes non placées</h3>
            {unplacedTeams.map(team => (
              <DraggableTeam key={team.id} team={team} />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
```

### **Exemple 3 : Widget Generator**
```jsx
// src/components/sharing/WidgetGenerator.jsx
import React, { useState } from 'react';
import { Button, Select, Card } from '../../shared/components/ui';

export default function WidgetGenerator({ tournamentId }) {
  const [widgetType, setWidgetType] = useState('bracket');
  const [config, setConfig] = useState({
    theme: 'dark',
    showLogos: true,
    showScores: true,
  });
  
  const widgetTypes = [
    { value: 'bracket', label: 'Arbre du tournoi' },
    { value: 'standings', label: 'Classement' },
    { value: 'upcoming', label: 'Prochains matchs' },
    { value: 'results', label: 'Derniers résultats' },
  ];
  
  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      type: widgetType,
      theme: config.theme,
      showLogos: config.showLogos,
      showScores: config.showScores,
    });
    
    return `<iframe 
  src="${baseUrl}/widget/${tournamentId}?${params}" 
  width="100%" 
  height="600" 
  frameborder="0"
></iframe>`;
  };
  
  return (
    <Card>
      <h3>Générateur de Widget</h3>
      
      <Select 
        label="Type de widget"
        options={widgetTypes}
        value={widgetType}
        onChange={setWidgetType}
      />
      
      <div className="widget-config">
        <label>
          <input 
            type="checkbox" 
            checked={config.showLogos}
            onChange={(e) => setConfig({ ...config, showLogos: e.target.checked })}
          />
          Afficher les logos
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={config.showScores}
            onChange={(e) => setConfig({ ...config, showScores: e.target.checked })}
          />
          Afficher les scores
        </label>
      </div>
      
      <div className="preview">
        <h4>Prévisualisation</h4>
        <iframe 
          src={`/widget/${tournamentId}?${new URLSearchParams({ type: widgetType })}`}
          style={{ width: '100%', height: '400px', border: '1px solid #333' }}
        />
      </div>
      
      <div className="embed-code">
        <h4>Code d'intégration</h4>
        <pre>{generateEmbedCode()}</pre>
        <Button onClick={() => navigator.clipboard.writeText(generateEmbedCode())}>
          Copier le code
        </Button>
      </div>
    </Card>
  );
}
```

---

## 📱 NAVIGATION RECOMMANDÉE

### **Menu Latéral Organizer (à implémenter)**
```jsx
// src/layouts/OrganizerLayout.jsx
const navigation = [
  { name: 'Vue d\'ensemble', href: `/organizer/tournament/${id}`, icon: '📊' },
  { 
    name: 'Paramètres', 
    icon: '⚙️',
    subItems: [
      { name: 'Général', href: `/organizer/tournament/${id}/settings/general` },
      { name: 'Apparence', href: `/organizer/tournament/${id}/settings/appearance` },
      { name: 'Discipline', href: `/organizer/tournament/${id}/settings/discipline` },
      { name: 'Match', href: `/organizer/tournament/${id}/settings/match` },
      { name: 'Inscriptions', href: `/organizer/tournament/${id}/settings/registration` },
      { name: 'Participant', href: `/organizer/tournament/${id}/settings/participant` },
      { name: 'Champs personnalisés', href: `/organizer/tournament/${id}/settings/custom-fields` },
      { name: 'Emplacements de match', href: `/organizer/tournament/${id}/settings/locations` },
      { name: 'Langues', href: `/organizer/tournament/${id}/settings/languages` },
      { name: 'Permissions', href: `/organizer/tournament/${id}/settings/permissions` },
      { name: 'Opérations globales', href: `/organizer/tournament/${id}/settings/operations` },
    ]
  },
  { name: 'Structure', href: `/organizer/tournament/${id}/structure`, icon: '🏗️' },
  { 
    name: 'Participants', 
    icon: '👥',
    subItems: [
      { name: 'Liste', href: `/organizer/tournament/${id}/participants` },
      { name: 'Éditer tous', href: `/organizer/tournament/${id}/participants/bulk-edit` },
      { name: 'Exporter', href: `/organizer/tournament/${id}/participants/export` },
    ]
  },
  { 
    name: 'Placement', 
    icon: '🎯',
    subItems: [
      { name: 'Vue d\'ensemble', href: `/organizer/tournament/${id}/placement` },
      // Phases dynamiques ajoutées ici
    ]
  },
  { 
    name: 'Matchs', 
    icon: '⚔️',
    subItems: [
      { name: 'Vue d\'ensemble', href: `/organizer/tournament/${id}/matches` },
      // Phases dynamiques ajoutées ici
    ]
  },
  { name: 'Classement final', href: `/organizer/tournament/${id}/final-standings`, icon: '🏆' },
  { 
    name: 'Partage', 
    icon: '📤',
    subItems: [
      { name: 'Page publique', href: `/organizer/tournament/${id}/sharing/public` },
      { name: 'Widgets', href: `/organizer/tournament/${id}/sharing/widgets` },
      { name: 'Toornament TV', href: `/organizer/tournament/${id}/sharing/tv` },
    ]
  },
  { name: 'Sponsors', href: `/organizer/tournament/${id}/sponsors`, icon: '💼' },
  { name: 'Streams', href: `/organizer/tournament/${id}/streams`, icon: '📺' },
];
```

---

## 🎯 CHECKLIST DE MIGRATION VERS ARCHITECTURE TOORNAMENT

### **Backend/Database**
- [ ] Créer table `tournament_phases`
- [ ] Ajouter `phase_id` à `matches`
- [ ] Créer table `bracket_slots`
- [ ] Créer table `tournament_custom_fields`
- [ ] Créer table `participant_custom_data`
- [ ] Créer table `match_locations`
- [ ] Créer table `tournament_roles`
- [ ] Créer table `tournament_widgets`
- [ ] Créer RLS policies pour les nouvelles tables
- [ ] Créer fonctions SQL helpers (génération d'arbre par phase, etc.)

### **Services/API**
- [ ] Service `phases.js` (CRUD phases)
- [ ] Service `placement.js` (gestion bracket_slots)
- [ ] Service `widgets.js` (génération widgets)
- [ ] Service `permissions.js` (gestion rôles)
- [ ] Service `customFields.js`
- [ ] Service `locations.js`
- [ ] Modifier `tournaments.js` pour supporter les phases

### **Composants UI**
- [ ] `PhaseList`, `PhaseCard`, `PhaseCreator`
- [ ] `BracketEditor`, `BracketSlot`, `TeamDraggable`
- [ ] `PlacementOverview`, `BracketPlacementEditor`
- [ ] `WidgetGenerator`, `EmbedCode`
- [ ] `RoleManager`, `InviteCoOrganizer`
- [ ] `CustomFieldEditor`
- [ ] Améliorer `AdminParticipantsTab` avec bulk edit

### **Pages**
- [ ] `TournamentStructure.jsx`
- [ ] `TournamentPlacement.jsx`
- [ ] `TournamentSharing.jsx`
- [ ] `TournamentSponsors.jsx`
- [ ] `TournamentStreams.jsx`
- [ ] Pages settings (11 sous-pages)

### **Routing**
- [ ] Ajouter routes `/organizer/tournament/:id/structure`
- [ ] Ajouter routes `/organizer/tournament/:id/placement`
- [ ] Ajouter routes `/organizer/tournament/:id/sharing/*`
- [ ] Ajouter routes `/organizer/tournament/:id/settings/*`
- [ ] Ajouter routes `/organizer/tournament/:id/participants/*`

### **Layout/Navigation**
- [ ] Créer `OrganizerLayout.jsx` avec menu latéral
- [ ] Implémenter menu avec sous-sections repliables
- [ ] Breadcrumb navigation
- [ ] Indicateurs de progression (ex: "Structure configurée ✅")

---

## 📈 METRICS DE SUCCÈS

Pour mesurer si les améliorations sont efficaces :

1. **Adoption de la section Structure** : % de tournois utilisant plusieurs phases
2. **Utilisation du placement manuel** : % de tournois avec placement custom vs auto
3. **Temps de setup** : Réduction du temps pour créer un tournoi complet
4. **Widgets générés** : Nombre de widgets créés et intégrés
5. **Collaboration** : Nombre de tournois avec plusieurs organisateurs (permissions)
6. **Exports** : Nombre d'exports de participants/résultats
7. **Satisfaction utilisateur** : Feedback sur la complexité vs Toornament

---

## 🎨 DESIGN SYSTEM

Pour rester cohérent avec Toornament :

### **Couleurs**
- **Primary** : Violet (#8e44ad, #9b59b6)
- **Success** : Vert (#4ade80, #22c55e)
- **Warning** : Orange (#f59e0b)
- **Danger** : Rouge (#e74c3c, #ef4444)
- **Info** : Bleu (#3498db, #3b82f6)
- **Dark** : #1a1a1a, #252525, #333
- **Text** : #fff, #aaa

### **Typographie**
- **Titres** : font-display (actuel)
- **Corps** : font-sans (actuel)
- **Code** : font-mono

### **Espacement**
- Padding cards : 20px, 30px
- Gap grids : 10px, 15px, 20px
- Border radius : 8px, 12px, 15px

---

## 🚀 CONCLUSION

**Votre projet Mon-Tournoi est déjà solide** avec :
- ✅ Formats de base (Elimination, Double Elimination, Round Robin, Swiss)
- ✅ Best-of-X
- ✅ Check-in
- ✅ Scheduling
- ✅ AdminPanel fonctionnel
- ✅ Interface joueur/organisateur séparée

**Mais pour rivaliser avec Toornament, il manque :**

### **Top 3 Priorités Absolues** 🔴
1. **Système de phases multi-formats**
2. **Éditeur de bracket pré-tournoi avec placement manuel**
3. **Section Structure dédiée**

### **Top 5 Améliorations Importantes** 🟠
4. Paramètres avancés (11 sections comme Toornament)
5. Section Placement avec drag & drop visuel
6. Participants - Éditer tous / Exporter
7. Section Partage (Widgets, embed codes)
8. Permissions / Rôles multi-organisateurs

### **Nice to Have** 🟡
9. Formats avancés (Gauntlet, Custom)
10. Champs personnalisés
11. Emplacements de match
12. Check-in par round
13. Gestion avancée des conflits

---

**Estimation totale : 12-16 semaines** pour atteindre la parité avec Toornament sur les fonctionnalités core.

**Budget estimé (si développeur solo) :**
- Phase 1 (Critique) : ~160 heures
- Phase 2 (Haute) : ~120 heures
- Phase 3 (Moyenne) : ~80 heures
- Phase 4 (Basse) : ~160 heures

**Total : ~520 heures de développement**

---

## 📞 PROCHAINES ÉTAPES RECOMMANDÉES

1. **Valider l'architecture proposée** (tables SQL, structure composants)
2. **Créer les migrations SQL** pour les phases et bracket_slots
3. **Développer un prototype** de la section Structure avec 1 phase
4. **Tester le workflow complet** : Créer phase → Placer équipes → Lancer → Voir bracket
5. **Itérer** en ajoutant progressivement les fonctionnalités

---

---

# 🎮 PARTIE 2 : INTERFACE PLAY TOORNAMENT (CÔTÉ JOUEUR)

## 📱 Navigation Play Toornament

### **Structure de Navigation Observée**
```
🏠 Page d'accueil Play
   ├── Barre de recherche (tournois/circuits)
   ├── Tournoi mis en avant (carousel/hero)
   └── Jeux populaires (grille de jeux)

🎮 Jeux
   └── Grille complète de tous les jeux disponibles (20+ jeux)

🏆 Circuits
   └── Ligues et circuits esport professionnels

👤 Menu utilisateur
   ├── Mon profil
   ├── Mes tournois
   ├── Mes équipes
   ├── Notifications
   └── Paramètres
```

---

## 🎯 FONCTIONNALITÉS CLÉS PAR PAGE

### **1. Page d'Accueil Play (`/fr/`)**

**Éléments observés :**
- 🔍 **Barre de recherche globale** : "Cherchez un jeu, tournoi ou circuit"
- 🎪 **Tournoi en vedette** : Grande bannière avec OWN ZARAGOZA - TORNEOS LAN
  - Plusieurs tournois visibles en carousel
  - Logo + bannière du jeu
  - Nom du tournoi
- 📊 **Jeux populaires** : Grille de jeux tendance (FC 25, Free Fire, Battle Arena, Mobile Legends, eFootball, Valorant, etc.)
- 🔘 **Bouton "Charger plus"** pour voir plus de jeux

**Votre projet :**
- ❌ Pas de page d'accueil dédiée Play
- ❌ Pas de recherche globale de tournois
- ❌ Pas de section "Jeux" avec filtrage
- ❌ HomePage.jsx existe mais est générique

**Besoin :**
```jsx
// Créer une vraie page d'accueil Play
src/pages/play/PlayHome.jsx
  ├── SearchBar (recherche globale)
  ├── FeaturedTournaments (carousel hero)
  ├── PopularGames (grille de jeux)
  └── UpcomingTournaments (prochains tournois)
```

---

### **2. Page Jeux (`/fr/games/`)**

**Éléments observés :**
- 🎮 **Grille complète de jeux** : FC 25, Free Fire, Battle Arena, Mobile Legends, eFootball, Valorant, League of Legends, Tekken 8, Rocket League, Fortnite, Counter-Strike 2, Teamfight Tactics, eFootball 2022, PUBG Mobile, Quake Champions, Clash Royale, Standoff 2, eFootball 2024, Mario Kart World, Mario Kart 8 Deluxe
- 🔍 **Barre de recherche de jeux** : "Chercher un jeu"
- 📦 **Cards avec logo du jeu** + nom

**Votre projet :**
- ⚠️ Pas de page dédiée aux jeux
- ⚠️ Filtre par jeu dans Dashboard mais pas de vue globale
- ⚠️ Pas de stats par jeu (nombre de tournois, joueurs actifs)

**Besoin :**
```jsx
// Créer page Jeux
src/pages/play/GamesDirectory.jsx
  ├── Grille de jeux avec logos
  ├── Recherche de jeux
  ├── Stats par jeu (X tournois actifs)
  └── Lien vers page du jeu
```

---

### **3. Page Jeu Spécifique (`/fr/games/valorant`)**

**Éléments observés :**
- 🎨 **Bannière du jeu** : Grande bannière visuelle Valorant
- 📑 **Onglets** : 
  - "Vue d'ensemble" (infos sur le jeu)
  - "Tournois" (liste des tournois)
- 📅 **Section "Tournois à venir"** : Grille de tournois
  - Cards avec :
    - Logo de l'organisateur
    - Nom du tournoi
    - Date
    - Statut : "En attente", "Inscriptions ouvertes", "En cours"
    - Nombre d'équipes/joueurs
    - Drapeau du pays
    - Logo du jeu (Valorant)
- 📜 **Section "Tournois passés"**
- 🔘 **Bouton "Voir tous"**

**Détails des Cards Tournoi :**
```
┌─────────────────────────────────────┐
│ [Logo Organisateur]                 │
│ Dach Challenge by BSeS              │
│ 19 janv. 2026                       │
│                                     │
│ En attente    16 Équipes      🇫🇷    │
│                              [V]    │
└─────────────────────────────────────┘
```

**Votre projet :**
- ❌ Pas de page par jeu
- ❌ Pas de filtrage automatique par jeu
- ❌ Dashboard affiche tous les tournois mélangés

**Besoin :**
```jsx
// Créer page par jeu
src/pages/play/GamePage.jsx
  ├── GameBanner (hero avec visuel du jeu)
  ├── GameTabs (Vue d'ensemble, Tournois, Stats)
  ├── TournamentsGrid (à venir, en cours, passés)
  └── GameStats (total joueurs, tournois, prix)
```

---

### **4. Page Tournoi Vue Joueur (`/fr/tournaments/:id`)**

**Éléments observés dans les captures :**

#### **Header**
- 🎨 **Bannière du tournoi** : Visuel Valorant
- 🏷️ **Logo + Nom** : E-coffee CUP Valorant 4
- 📅 **Date** : 31 janv. 2026
- 📍 **Statut** : "En attente"
- 🟢 **Bouton CTA** : "Inscriptions ouvertes" ou "S'inscrire au tournoi"

#### **Onglets**
1. ✅ **Vue d'ensemble** (actif dans la capture)
2. **Phases**
3. **Matchs**
4. **Participants**
5. **Règles**
6. **Streams et vidéos**

#### **Contenu Vue d'Ensemble**

**Section Informations** (gauche) :
```
📋 Informations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 VALORANT
    Taille: 10 Équipes
    Format: France 🇫🇷
    Lieu: Adunément Esport Body LAN

📝 Règles
[Bouton "Règles"]

📅 Tournoi Valorant - E-coffee - 31 janvier 2026
📺 LAN Valorant niveaux 1 (ou E-coffee)
📆 Date: Samedi 31 janvier 2026
⏰ Horaires: 10h - 23h (arrivée des équipes entre 8h et 9h pour installation et check-in)
👥 Participants: Maximum 10 équipes (5v5) - niveau amateur à confirmer

💰 Affrontez 9 autres équipes dans une journée de compétition intense et tentez de remporter 1 000 € 
   de cashprize, 140% cash. 🏆💰

☕ Formules disponibles:
   - Standard - 35 € / joueur : apportez votre setup complet (PC, écran, clavier, souris, casque).
   - Confort - 45 € / joueur : setup premium fourni (PC, écran, fauteuil, choix gaming, périphériques)

📧 Inscriptions et coupons:
   - Inscription sur Toornament (solo ou en équipe)
   - Rejoindre le Discord officiel : https://discord.gg/WotZ0CjBJ
   
🔗 Compléter le channel "#ekip-pen" avec tous les joueurs de NotJps et la formule choisie
🎵 Toornament et validations au règlement (#ekip-pen avant LAN) et plus tard (sauf accord spécial en DM)

📍 Les places sont limitées ! Réservez vite pour ne pas manquer cette LAN explosive! 🔥

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Organisateur & contact
E-coffee
contact@e-coffee.fr
https://discord.gg/WotZ0CjBJ
https://www.e-coffee.fr
```

**Section Planning** (droite) :
```
📅 Planning        [Passé/En-cours/Futur]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dates et époques
31 janv. 2026

Inscriptions
Ouvertes jusqu'au 30 janv. 2026 à 20:00
```

**Section Récompenses** (droite) :
```
🏆 Récompenses
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cash prize
Total cash prize : 1 000 €

Répartition :
  1er → 750 % soit → 700 €
  2e → 20 % soit → 200 €
  3e → 10 % soit → 100 €

Aucun lot pour les autres équipes

💡 Le 1er cash prize sera partagé selon la nombre 
d'équipes inscrites, le montant final sera 
confirmé le jour du tournoi.
```

**Votre projet (PublicTournament.jsx) :**
- ✅ Vue tournoi public existe
- ⚠️ Onglets : Aperçu, Bracket, Participants, Règles, Chat (différent)
- ❌ Pas d'onglet "Phases" séparé
- ❌ Pas d'onglet "Streams et vidéos"
- ❌ Pas de section "Planning" détaillée
- ⚠️ Récompenses affichées mais format différent
- ❌ Pas de mise en avant du statut d'inscription
- ❌ Pas de format "Formules" (Standard/Confort comme dans le LAN)

**Besoin :**
```jsx
// Améliorer PublicTournament.jsx
- Ajouter onglet "Phases"
- Ajouter onglet "Streams et vidéos"
- Section Planning avec timeline visuelle
- Section Récompenses avec répartition visuelle (camembert?)
- Support des champs personnalisés (formules, etc.)
- Badge statut inscription bien visible
```

---

### **5. Page Inscription (`/fr/tournaments/:id/registration`)**

#### **Étape 1 : Choix du type d'inscription**

**Interface observée :**
```
┌─────────────────────────────────────────────┐
│ E-coffee CUP Valorant 4      [En attente]  │
├─────────────────────────────────────────────┤
│                                             │
│  Inscriptions au tournoi                    │
│  Ouvertes jusqu'au 30 janv. 2026 à 20:00   │
│                          [Règles]           │
│                                             │
│  Informations d'inscription                 │
│  Inscription des équipes: 5 joueurs minimum,│
│  5 joueurs maximum.                         │
│                                             │
│  Organisateur: E-coffee                     │
│  E-mail de contact: rioa.herbachi@e-coffee.fr│
│                                             │
│    ┌───────────────────────────────┐        │
│    │   [S'inscrire au tournoi]     │        │
│    └───────────────────────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

**Après clic, 2 options :**

#### **Option A : Inscription avec équipe existante**
```
┌─────────────────────────────────────────────┐
│ Inscription de l'équipe                     │
│                                             │
│ Sélectionnez une équipe de VALORANT dont   │
│ vous êtes le capitaine et choisissez les   │
│ joueurs qui participeront à ce tournoi     │
│ (min : 5, max : 5).                        │
│                                             │
│ Équipe                                      │
│ ┌─────────────────────────────────┐        │
│ │ [Dropdown: Sélectionner équipe] │        │
│ └─────────────────────────────────┘        │
│                                             │
│ [Annuler]  [Sauvegarder]                   │
└─────────────────────────────────────────────┘
```

#### **Option B : Inscription équipe temporaire**
```
┌─────────────────────────────────────────────┐
│ Inscription d'une équipe temporaire         │
│                          [Équipe permanente]│
│                                             │
│ Fournissez les informations concernant     │
│ votre équipe et ses joueurs (min : 5, max: 5)│
│ Si vous inscrivez à ce tournoi.            │
│                                             │
│ Équipe                                      │
│ Informations de contact                     │
│ ┌─────────────────────────────────┐        │
│ │ E-mail                          │        │
│ │ dan.adjed@yahoo.fr              │        │
│ └─────────────────────────────────┘        │
│                                             │
│ Nom de l'équipe                            │
│ ┌─────────────────────────────────┐        │
│ │ [                              ]│        │
│ └─────────────────────────────────┘        │
│                                             │
│ Joueur 1                                   │
│ Nom du joueur                              │
│ ┌─────────────────────────────────┐        │
│ │ [                              ]│        │
│ └─────────────────────────────────┘        │
│ Email du joueur                            │
│ ┌─────────────────────────────────┐        │
│ │ [                              ]│        │
│ └─────────────────────────────────┘        │
│                                             │
│ Joueur 2                                   │
│ Nom du joueur                              │
│ ┌─────────────────────────────────┐        │
│ │ [                              ]│        │
│ └─────────────────────────────────┘        │
│ Email du joueur                            │
│ ┌─────────────────────────────────┐        │
│ │ [                              ]│        │
│ └─────────────────────────────────┘        │
│                                             │
│ [... Joueur 3, 4, 5 identique]            │
│                                             │
└─────────────────────────────────────────────┘
```

**Votre projet :**
- ✅ Inscription existe (TeamJoinButton, CreateTeam, JoinTeam)
- ❌ Pas de système "équipe temporaire" pour un tournoi
- ❌ Pas de choix équipe existante vs nouvelle
- ❌ Pas d'email de contact pour l'équipe
- ❌ Pas de formulaire pour les joueurs individuels
- ❌ Pas de validation min/max joueurs dans le formulaire
- ❌ Pas de bouton "Équipe permanente" vs "Temporaire"

**Besoin :**
```jsx
// Créer nouveau système d'inscription
src/pages/play/TournamentRegistration.jsx
  ├── RegistrationInfo (infos + deadline)
  ├── RegistrationTypeSelector (Équipe existante vs Temporaire)
  ├── TeamRegistrationForm (sélection équipe existante)
  ├── TemporaryTeamForm (création équipe temporaire)
  │   ├── TeamContactInfo (email de contact)
  │   ├── TeamBasicInfo (nom équipe)
  │   └── PlayersList (joueurs avec nom + email)
  └── RegistrationValidation

// Nouvelle table
CREATE TABLE temporary_teams (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  team_name TEXT,
  contact_email TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE temporary_team_players (
  id UUID PRIMARY KEY,
  temporary_team_id UUID REFERENCES temporary_teams(id),
  player_name TEXT,
  player_email TEXT,
  player_order INTEGER, -- 1, 2, 3, 4, 5
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **6. Autres Pages Joueur (Non montrées mais essentielles)**

#### **a) Mon Profil (`/profile` ou `/user/me`)**

**Fonctionnalités attendues :**
- Photo de profil
- Nom d'utilisateur
- Bio
- Comptes de jeu (Valorant ID, League IGN, etc.)
- Statistiques globales :
  - Tournois joués
  - Victoires / Défaites
  - Taux de victoire
  - Podiums
- Historique des tournois
- Badges / Achievements
- Équipes actuelles

**Votre projet :**
- ✅ Profile.jsx existe
- ⚠️ Manque comptes de jeu
- ⚠️ Manque statistiques tournois
- ⚠️ Manque badges

---

#### **b) Mes Tournois (`/my-tournaments`)**

**Fonctionnalités attendues :**
- Onglets :
  - "En cours" : Tournois actifs
  - "À venir" : Tournois inscrits
  - "Terminés" : Historique
- Par tournoi :
  - Statut (À jouer, Check-in requis, En attente, Terminé)
  - Prochains matchs
  - Résultats
  - Actions rapides (Check-in, Voir bracket, Chat)

**Votre projet :**
- ✅ PlayerDashboard.jsx existe
- ⚠️ Manque filtres par statut
- ⚠️ Manque actions rapides par tournoi

---

#### **c) Mes Équipes (`/my-teams`)**

**Fonctionnalités attendues :**
- Liste des équipes dont je suis membre
- Rôle dans l'équipe (Capitaine, Membre)
- Membres de l'équipe
- Statistiques de l'équipe
- Tournois joués ensemble
- Invitations en attente

**Votre projet :**
- ✅ MyTeam.jsx existe
- ⚠️ Limitée à 1 équipe ?
- ⚠️ Pas de stats d'équipe

---

#### **d) Notifications (`/notifications`)**

**Fonctionnalités attendues :**
- Match à venir (30 min, 1h, 24h)
- Check-in requis
- Résultat de match validé
- Invitation à une équipe
- Inscription acceptée/refusée
- Modification de planning
- Messages de l'organisateur
- Filtres : Non lues / Toutes / Par type

**Votre projet :**
- ✅ NotificationCenter.jsx existe
- ⚠️ Manque notifications planifiées
- ⚠️ Pas de filtres avancés

---

#### **e) Circuits (`/circuits`)**

**Fonctionnalités attendues :**
- Ligues esport (LEC, LCS, etc.)
- Circuits multi-tournois
- Classement global du circuit
- Points cumulés
- Calendrier du circuit

**Votre projet :**
- ❌ N'existe pas

---

## 🔍 COMPARAISON DÉTAILLÉE PAR FONCTIONNALITÉ

### **Tableau Comparatif Interface Play**

| Fonctionnalité | Toornament Play | Mon-Tournoi | Priorité | Notes |
|----------------|-----------------|-------------|----------|-------|
| **Page d'accueil Play** | ✅ Recherche + Hero + Jeux | ❌ HomePage générique | 🔴 CRITIQUE | Besoin d'une vraie landing page |
| **Page Jeux (directory)** | ✅ Grille complète | ❌ Non | 🟠 HAUTE | Facilite la découverte |
| **Page par jeu** | ✅ Tournois filtrés | ❌ Non | 🟠 HAUTE | Essentiel pour UX |
| **Recherche globale tournois** | ✅ Oui | ⚠️ Basique | 🟠 HAUTE | Améliorer recherche |
| **Inscription équipe existante** | ✅ Dropdown + sélection | ✅ Oui | 🟢 OK | Fonctionne |
| **Inscription équipe temporaire** | ✅ Formulaire complet | ❌ Non | 🔴 CRITIQUE | Manque majeur |
| **Email de contact équipe** | ✅ Obligatoire | ❌ Non | 🟡 MOYENNE | Utile pour LAN |
| **Formulaire joueurs (nom+email)** | ✅ Pour chaque joueur | ❌ Non | 🟡 MOYENNE | Utile pour validation |
| **Onglet Phases (vue joueur)** | ✅ Oui | ❌ Non | 🟠 HAUTE | Cohérence avec Organizer |
| **Onglet Streams et vidéos** | ✅ Oui | ❌ Non | 🟡 MOYENNE | Engagement |
| **Section Planning détaillée** | ✅ Timeline | ⚠️ Basique | 🟡 MOYENNE | Améliorer visualisation |
| **Récompenses visuelles** | ✅ Répartition claire | ⚠️ Texte simple | 🟡 MOYENNE | Graphique pizza |
| **Formules/Options (LAN)** | ✅ Champs custom | ❌ Non | 🟡 MOYENNE | Via custom fields |
| **Badge statut inscription** | ✅ Très visible | ⚠️ Petit | 🟡 MOYENNE | UX |
| **Mon Profil complet** | ✅ Stats + Comptes jeu | ⚠️ Basique | 🟠 HAUTE | Manque comptes jeu |
| **Mes Tournois avec filtres** | ✅ En cours/À venir/Terminés | ⚠️ Pas de filtres | 🟡 MOYENNE | Améliorer filtres |
| **Mes Équipes (multi)** | ✅ Liste complète | ⚠️ 1 équipe ? | 🟡 MOYENNE | Vérifier multi-équipes |
| **Circuits/Ligues** | ✅ Oui | ❌ Non | 🟢 BASSE | Nice to have |
| **Actions rapides par tournoi** | ✅ Check-in, Voir bracket | ⚠️ Limité | 🟡 MOYENNE | Raccourcis UX |

---

## 🚨 PROBLÈMES MAJEURS CÔTÉ PLAY

### **1. ❌ ABSENCE D'INSCRIPTION ÉQUIPE TEMPORAIRE**

**Impact :** 
- Les joueurs sans équipe permanente ne peuvent pas s'inscrire facilement
- Pas de solution pour LAN ou tournois occasionnels
- Friction énorme dans le parcours d'inscription

**Solution prioritaire :**
```jsx
// Implémenter système équipe temporaire
1. Modifier CreateTeam.jsx pour supporter mode "Temporaire"
2. Ajouter toggle "Équipe permanente" vs "Pour ce tournoi uniquement"
3. Formulaire avec email de contact + joueurs (nom + email)
4. Stocker dans temporary_teams + temporary_team_players
5. Validation par l'organisateur (si nécessaire)
```

---

### **2. ❌ PAS DE NAVIGATION PAR JEU**

**Impact :**
- Difficile de découvrir les tournois d'un jeu spécifique
- Pas de communauté par jeu
- Expérience découverte pauvre

**Solution :**
```jsx
// Créer architecture par jeu
src/pages/play/
  ├── PlayHome.jsx              (nouvelle page d'accueil)
  ├── GamesDirectory.jsx        (grille de jeux)
  └── GamePage.jsx              (page par jeu avec tournois)

// Routes
/play                           → PlayHome
/play/games                     → GamesDirectory
/play/games/valorant            → GamePage
/play/games/valorant/tournaments→ Liste complète
```

---

### **3. ⚠️ FORMULAIRE D'INSCRIPTION INCOMPLET**

**Manque :**
- Email de contact de l'équipe
- Informations joueurs individuels (nom + email)
- Champs personnalisés (formule LAN, restrictions, etc.)
- Validation min/max joueurs en temps réel

**Solution :**
```jsx
// Améliorer formulaire d'inscription
- Support champs custom par tournoi
- Validation dynamique selon config tournoi
- Preview des infos avant soumission
- Email de confirmation automatique
```

---

### **4. ⚠️ PAGE TOURNOI VUE JOUEUR INCOMPLÈTE**

**Manque :**
- Onglet "Phases" (si phases multiples)
- Onglet "Streams et vidéos"
- Section Planning avec timeline
- Mise en avant du CTA inscription
- Format récompenses visuel

**Solution :**
```jsx
// Améliorer PublicTournament.jsx
- Ajouter TournamentPhases.jsx (onglet phases)
- Ajouter TournamentStreams.jsx (onglet streams)
- Créer PlanningTimeline.jsx (vue chronologique)
- Créer PrizesVisualization.jsx (camembert répartition)
```

---

## 💡 AMÉLIORATIONS PRIORITAIRES CÔTÉ PLAY

### **🥇 Priorité 1 : Système d'Inscription Complet**

**Tâches :**
1. ✅ Créer TournamentRegistration.jsx
2. ✅ Implémenter choix équipe existante vs temporaire
3. ✅ Formulaire équipe temporaire avec joueurs
4. ✅ Email de contact équipe
5. ✅ Validation min/max joueurs
6. ✅ Support champs personnalisés
7. ✅ Prévisualisation avant validation

**Fichiers à créer :**
```
src/pages/play/TournamentRegistration.jsx
src/components/registration/
  ├── RegistrationTypeSelector.jsx
  ├── ExistingTeamForm.jsx
  ├── TemporaryTeamForm.jsx
  ├── PlayerFieldsRepeater.jsx
  └── RegistrationPreview.jsx
```

**SQL :**
```sql
CREATE TABLE temporary_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE temporary_team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporary_team_id UUID NOT NULL REFERENCES temporary_teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_email TEXT NOT NULL,
  player_order INTEGER NOT NULL,
  is_captain BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(temporary_team_id, player_order)
);

-- Index
CREATE INDEX idx_temporary_teams_tournament ON temporary_teams(tournament_id);
CREATE INDEX idx_temporary_teams_creator ON temporary_teams(created_by);
CREATE INDEX idx_temporary_team_players_team ON temporary_team_players(temporary_team_id);
```

---

### **🥈 Priorité 2 : Navigation par Jeu**

**Tâches :**
1. ✅ Créer PlayHome.jsx (page d'accueil)
2. ✅ Créer GamesDirectory.jsx (grille jeux)
3. ✅ Créer GamePage.jsx (page par jeu)
4. ✅ Barre de recherche globale
5. ✅ Filtres tournois (à venir, en cours, passés)
6. ✅ Stats par jeu

**Composants :**
```
src/pages/play/
  ├── PlayHome.jsx
  │   ├── SearchBar (recherche globale)
  │   ├── FeaturedTournaments (hero carousel)
  │   ├── PopularGames (grille 8 jeux)
  │   └── UpcomingTournaments (liste)
  │
  ├── GamesDirectory.jsx
  │   ├── GamesGrid (tous les jeux)
  │   ├── SearchGames (barre de recherche)
  │   └── GameCard (logo + nom + stats)
  │
  └── GamePage.jsx
      ├── GameBanner (hero)
      ├── GameTabs (Vue d'ensemble, Tournois)
      ├── TournamentsGrid (à venir, en cours, passés)
      └── GameStats (total tournois, joueurs, prix)
```

---

### **🥉 Priorité 3 : Améliorer Page Tournoi Vue Joueur**

**Tâches :**
1. ✅ Ajouter onglet "Phases"
2. ✅ Ajouter onglet "Streams et vidéos"
3. ✅ Section Planning avec timeline
4. ✅ Section Récompenses visuelle
5. ✅ Badge statut inscription proéminent
6. ✅ Support formules/champs custom

**Améliorations PublicTournament.jsx :**
```jsx
// Nouveaux onglets
const tabs = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'phases', label: 'Phases' },          // NOUVEAU
  { id: 'bracket', label: 'Bracket' },
  { id: 'matches', label: 'Matchs' },
  { id: 'participants', label: 'Participants' },
  { id: 'rules', label: 'Règles' },
  { id: 'streams', label: 'Streams et vidéos' }, // NOUVEAU
  { id: 'chat', label: 'Chat' },
];

// Composants à créer
<TournamentPhases phases={tournament.phases} />
<TournamentStreams 
  streams={tournament.stream_urls} 
  clips={tournament.clips} 
/>
<PlanningTimeline 
  registrationDeadline={tournament.registration_deadline}
  startDate={tournament.start_date}
  checkInTime={tournament.check_in_time}
/>
<PrizesVisualization 
  total={tournament.cashprize_total}
  distribution={tournament.cashprize_distribution}
/>
```

---

### **🏅 Priorité 4 : Mon Profil Amélioré**

**Tâches :**
1. ✅ Comptes de jeu (Riot ID, Steam, etc.)
2. ✅ Statistiques tournois
3. ✅ Badges / Achievements
4. ✅ Historique complet
5. ✅ Équipes actuelles/passées

**Nouveau profil :**
```jsx
src/pages/play/UserProfile.jsx
  ├── ProfileHeader (photo, nom, bio)
  ├── GamingAccounts (Riot, Steam, Epic, etc.)
  ├── TournamentStats (joués, victoires, podiums)
  ├── BadgesDisplay (achievements)
  ├── CurrentTeams (équipes actuelles)
  └── TournamentHistory (historique complet)

// Table SQL
CREATE TABLE user_gaming_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'riot', 'steam', 'epic', 'xbox', 'psn'
  game TEXT, -- 'valorant', 'league_of_legends', etc.
  username TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, game)
);
```

---

## 📊 STATISTIQUES ET MÉTRIQUES JOUEUR

### **Stats à Implémenter**

**Globales (profil joueur) :**
- Tournois joués
- Victoires / Défaites / Nuls
- Taux de victoire (%)
- Podiums (1er, 2e, 3e)
- Cash prize total gagné
- Jeux joués
- Équipes actuelles/passées

**Par jeu :**
- Tournois joués (Valorant, LoL, etc.)
- Taux de victoire par jeu
- Meilleur placement
- Équipes dans ce jeu

**Par équipe :**
- Tournois joués ensemble
- Victoires d'équipe
- Synergies (qui joue avec qui)

**SQL pour stats :**
```sql
-- Vue matérialisée pour perfs
CREATE MATERIALIZED VIEW user_tournament_stats AS
SELECT 
  p.user_id,
  COUNT(DISTINCT p.tournament_id) as tournaments_played,
  COUNT(DISTINCT CASE WHEN m.winner_id = p.team_id THEN m.id END) as matches_won,
  COUNT(DISTINCT CASE WHEN m.status = 'completed' AND (m.player1_id = p.team_id OR m.player2_id = p.team_id) THEN m.id END) as matches_played,
  COUNT(DISTINCT CASE WHEN fs.position = 1 THEN p.tournament_id END) as first_places,
  COUNT(DISTINCT CASE WHEN fs.position = 2 THEN p.tournament_id END) as second_places,
  COUNT(DISTINCT CASE WHEN fs.position = 3 THEN p.tournament_id END) as third_places,
  SUM(COALESCE((t.cashprize_distribution->>(fs.position::text))::numeric, 0)) as total_prize_money
FROM participants p
LEFT JOIN matches m ON (m.player1_id = p.team_id OR m.player2_id = p.team_id)
LEFT JOIN tournaments t ON t.id = p.tournament_id
LEFT JOIN final_standings fs ON fs.team_id = p.team_id AND fs.tournament_id = p.tournament_id
GROUP BY p.user_id;

CREATE UNIQUE INDEX ON user_tournament_stats(user_id);
```

---

## 🎨 DESIGN PATTERNS TOORNAMENT PLAY

### **Cards Tournoi**

**Structure observée :**
```jsx
<TournamentCard>
  <CardHeader>
    <OrganizerLogo size="sm" />
    <TournamentName />
    <TournamentDate />
  </CardHeader>
  
  <CardBody>
    <TournamentBanner /> {/* Visuel du jeu */}
  </CardBody>
  
  <CardFooter>
    <StatusBadge /> {/* En attente, Inscriptions ouvertes, En cours */}
    <ParticipantsCount /> {/* 16 Équipes */}
    <CountryFlag /> {/* 🇫🇷 */}
    <GameLogo size="xs" /> {/* Logo Valorant */}
  </CardFooter>
</TournamentCard>
```

**Styles :**
- Cards avec hover effect
- Bannières visuelles du jeu (pas juste logo)
- Badges colorés selon statut :
  - 🟡 "En attente" → Jaune
  - 🟢 "Inscriptions ouvertes" → Vert
  - 🔵 "En cours" → Bleu
  - ⚫ "Terminé" → Gris

---

### **Barre de Recherche Globale**

```jsx
<GlobalSearch>
  <SearchIcon />
  <Input 
    placeholder="Cherchez un jeu, tournoi ou circuit"
    onChange={handleSearch}
  />
  <SearchResults>
    <ResultsSection title="Jeux">
      {games.map(game => <GameResult />)}
    </ResultsSection>
    <ResultsSection title="Tournois">
      {tournaments.map(t => <TournamentResult />)}
    </ResultsSection>
    <ResultsSection title="Circuits">
      {circuits.map(c => <CircuitResult />)}
    </ResultsSection>
  </SearchResults>
</GlobalSearch>
```

---

### **Timeline Planning**

```jsx
<PlanningTimeline>
  <TimelineItem 
    icon="📝" 
    label="Inscriptions ouvertes"
    date="Maintenant"
    status="active"
  />
  <TimelineItem 
    icon="⏰" 
    label="Deadline inscriptions"
    date="30 janv. 2026 à 20:00"
    status="upcoming"
  />
  <TimelineItem 
    icon="✅" 
    label="Check-in"
    date="31 janv. 2026 à 08:00"
    status="future"
  />
  <TimelineItem 
    icon="⚔️" 
    label="Début du tournoi"
    date="31 janv. 2026 à 10:00"
    status="future"
  />
  <TimelineItem 
    icon="🏆" 
    label="Finale"
    date="31 janv. 2026 à 22:00"
    status="future"
  />
</PlanningTimeline>
```

---

## 🔗 ROUTING COMPLET PLAY

### **Routes à Créer**

```jsx
// Routes Play
/play                                    → PlayHome
/play/games                              → GamesDirectory
/play/games/:gameSlug                    → GamePage
/play/games/:gameSlug/tournaments        → GameTournaments (liste complète)
/play/circuits                           → CircuitsDirectory
/play/circuits/:circuitId                → CircuitPage

// Routes Tournoi (vue joueur)
/play/tournaments/:id                    → PublicTournament (vue d'ensemble)
/play/tournaments/:id/registration       → TournamentRegistration
/play/tournaments/:id/phases             → TournamentPhases
/play/tournaments/:id/matches            → TournamentMatches
/play/tournaments/:id/participants       → TournamentParticipants
/play/tournaments/:id/rules              → TournamentRules
/play/tournaments/:id/streams            → TournamentStreams

// Routes Utilisateur
/play/profile                            → UserProfile (mon profil)
/play/profile/:userId                    → PublicProfile (profil public)
/play/my-tournaments                     → MyTournaments
/play/my-teams                           → MyTeams
/play/notifications                      → Notifications
/play/settings                           → UserSettings
```

---

## 📧 EMAILS ET NOTIFICATIONS

### **Emails Automatiques à Implémenter**

**1. Inscription confirmée**
```
Objet: ✅ Inscription confirmée - [Nom du tournoi]

Bonjour [Nom],

Votre inscription au tournoi "[Nom du tournoi]" a été confirmée !

📅 Date: [Date]
🎮 Jeu: [Jeu]
👥 Équipe: [Nom équipe]

Prochaines étapes:
1. Check-in: [Date et heure]
2. Début du tournoi: [Date et heure]

[Voir le tournoi] [Voir le bracket]
```

**2. Rappel check-in (24h avant)**
```
Objet: ⏰ Check-in demain - [Nom du tournoi]

Le check-in pour "[Nom du tournoi]" commence demain !

⏰ Fenêtre de check-in: [Heure début] - [Heure fin]
❌ Sans check-in, votre équipe sera disqualifiée.

[Faire le check-in maintenant]
```

**3. Match à venir (1h avant)**
```
Objet: ⚔️ Votre match commence dans 1h

Votre match commence bientôt !

🆚 [Équipe A] vs [Équipe B]
⏰ Heure: [Heure]
🎮 Jeu: [Jeu]

[Voir le match] [Rejoindre le lobby]
```

**4. Résultat de match**
```
Objet: 🏆 Résultat de votre match

Le résultat de votre match a été validé.

[Équipe gagnante] 2 - 1 [Équipe perdante]

Prochain match: [Date et heure] ou "Fin du parcours"

[Voir le bracket]
```

---

## 🎮 EXEMPLE DE WORKFLOW COMPLET JOUEUR

### **Parcours Inscription**

```
1. Joueur arrive sur /play
   └─> Voit les tournois en vedette
   └─> Recherche "Valorant"
   └─> Clique sur "Jeux" > "Valorant"

2. Sur /play/games/valorant
   └─> Voit tous les tournois Valorant
   └─> Filtre "À venir"
   └─> Clique sur "E-coffee CUP Valorant 4"

3. Sur /play/tournaments/xxx
   └─> Lit les informations (onglet Vue d'ensemble)
   └─> Vérifie Planning (deadline 30 janv.)
   └─> Vérifie Récompenses (1000€)
   └─> Lit Règles (LAN, 10h-23h, formules)
   └─> Clique "S'inscrire au tournoi"

4. Sur /play/tournaments/xxx/registration
   └─> Choix: "Équipe existante" ou "Équipe temporaire"
   
   Option A (Équipe existante):
   └─> Sélectionne son équipe "Team Alpha"
   └─> Choisit les 5 joueurs participant
   └─> Valide
   
   Option B (Équipe temporaire):
   └─> Remplit email de contact
   └─> Nom de l'équipe "Les Cafeinés"
   └─> Joueur 1: Nom + Email
   └─> Joueur 2: Nom + Email
   └─> ... (jusqu'à 5)
   └─> Valide

5. Inscription validée
   └─> Email de confirmation
   └─> Ajouté à /play/my-tournaments (onglet "À venir")
   └─> Notification "Inscription réussie"

6. 24h avant (30 janv.)
   └─> Email rappel check-in
   └─> Notification push "Check-in demain 8h-9h"

7. Jour J (31 janv. 8h)
   └─> Check-in disponible
   └─> Capitaine fait le check-in pour l'équipe
   └─> ✅ Équipe validée

8. 10h - Début du tournoi
   └─> Bracket généré
   └─> Premier match assigné
   └─> Notification "Match dans 30 min"

9. Pendant le match
   └─> Lobby de match (/match/:id)
   └─> Soumission des résultats
   └─> Vote si désaccord

10. Après le match
    └─> Email résultat
    └─> Prochain match ou fin de parcours
    └─> Stats mises à jour

11. Fin du tournoi
    └─> Classement final
    └─> Stats enregistrées dans le profil
    └─> Badges/Achievements débloqués (si applicable)
```

---

## 📝 CHECKLIST IMPLÉMENTATION PLAY

### **Pages**
- [ ] PlayHome.jsx (page d'accueil)
- [ ] GamesDirectory.jsx (grille jeux)
- [ ] GamePage.jsx (page par jeu)
- [ ] TournamentRegistration.jsx (inscription complète)
- [ ] MyTournaments.jsx (mes tournois avec filtres)
- [ ] MyTeams.jsx (mes équipes)
- [ ] UserProfile.jsx (profil amélioré)

### **Composants**
- [ ] SearchBar (recherche globale)
- [ ] FeaturedTournaments (carousel hero)
- [ ] PopularGames (grille jeux)
- [ ] TournamentCard (card améliorée avec bannière)
- [ ] RegistrationTypeSelector (équipe existante vs temporaire)
- [ ] TemporaryTeamForm (formulaire équipe temp)
- [ ] PlayerFieldsRepeater (joueurs avec nom+email)
- [ ] PlanningTimeline (timeline visuelle)
- [ ] PrizesVisualization (graphique répartition)
- [ ] GamingAccountsSection (comptes de jeu)
- [ ] TournamentPhases (onglet phases)
- [ ] TournamentStreams (onglet streams)

### **Backend/Database**
- [ ] Table temporary_teams
- [ ] Table temporary_team_players
- [ ] Table user_gaming_accounts
- [ ] Vue materialized user_tournament_stats
- [ ] API endpoints inscription temporaire
- [ ] Emails automatiques (inscription, check-in, match)

### **Services**
- [ ] Service temporaryTeams.js
- [ ] Service gamingAccounts.js
- [ ] Service userStats.js
- [ ] Service emails.js (templates)

### **Routing**
- [ ] Routes /play/* (toutes les routes Play)
- [ ] Routes /play/games/*
- [ ] Routes /play/tournaments/:id/*
- [ ] Routes /play/profile/*

---

## 🎯 RÉCAPITULATIF PRIORITÉS PLAY

### **🔴 CRITIQUE (3-4 semaines)**
1. **Système inscription équipe temporaire**
   - Formulaire complet avec joueurs (nom + email)
   - Tables SQL temporary_teams
   - Validation par organisateur
   
2. **Navigation par jeu**
   - PlayHome, GamesDirectory, GamePage
   - Recherche globale
   - Filtres tournois par jeu

3. **Page tournoi vue joueur améliorée**
   - Onglets Phases + Streams
   - Planning timeline
   - Récompenses visuelles

### **🟠 HAUTE (2-3 semaines)**
4. **Mon Profil amélioré**
   - Comptes de jeu
   - Statistiques complètes
   - Badges

5. **Mes Tournois avec filtres**
   - En cours / À venir / Terminés
   - Actions rapides par tournoi

6. **Emails automatiques**
   - Inscription confirmée
   - Rappel check-in
   - Match à venir
   - Résultats

### **🟡 MOYENNE (2 semaines)**
7. Mes Équipes (multi-équipes)
8. Notifications push
9. Historique complet
10. Stats avancées

### **🟢 BASSE (Nice to have)**
11. Circuits/Ligues
12. Achievements/Badges système
13. Comparaison joueurs
14. Replay/VODs

---

## 💻 EXEMPLE CODE: INSCRIPTION ÉQUIPE TEMPORAIRE

```jsx
// src/pages/play/TournamentRegistration.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../shared/components/ui';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';

export default function TournamentRegistration() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const [registrationType, setRegistrationType] = useState(null); // 'existing' | 'temporary'
  
  // État formulaire équipe temporaire
  const [teamName, setTeamName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [players, setPlayers] = useState(
    Array.from({ length: 5 }, (_, i) => ({ 
      name: '', 
      email: '', 
      order: i + 1 
    }))
  );
  
  const handleSubmitTemporaryTeam = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!teamName.trim()) {
      toast.error('Le nom de l\'équipe est requis');
      return;
    }
    if (!contactEmail.trim()) {
      toast.error('L\'email de contact est requis');
      return;
    }
    
    const filledPlayers = players.filter(p => p.name.trim() && p.email.trim());
    if (filledPlayers.length < 5) {
      toast.error('Les 5 joueurs sont requis');
      return;
    }
    
    try {
      // 1. Créer l'équipe temporaire
      const { data: tempTeam, error: teamError } = await supabase
        .from('temporary_teams')
        .insert({
          tournament_id: tournamentId,
          team_name: teamName,
          contact_email: contactEmail,
          status: 'pending'
        })
        .select()
        .single();
      
      if (teamError) throw teamError;
      
      // 2. Créer les joueurs
      const playersData = filledPlayers.map((p, idx) => ({
        temporary_team_id: tempTeam.id,
        player_name: p.name,
        player_email: p.email,
        player_order: idx + 1,
        is_captain: idx === 0 // Premier joueur = capitaine
      }));
      
      const { error: playersError } = await supabase
        .from('temporary_team_players')
        .insert(playersData);
      
      if (playersError) throw playersError;
      
      // 3. Créer le participant (en attente de validation)
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          tournament_id: tournamentId,
          team_id: tempTeam.id, // Référence à temporary_team
          is_temporary: true,
          status: 'pending_approval'
        });
      
      if (participantError) throw participantError;
      
      toast.success('Inscription envoyée ! En attente de validation par l\'organisateur.');
      navigate(`/play/tournaments/${tournamentId}`);
      
    } catch (error) {
      console.error('Erreur inscription:', error);
      toast.error('Erreur lors de l\'inscription: ' + error.message);
    }
  };
  
  const updatePlayer = (index, field, value) => {
    setPlayers(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };
  
  if (!registrationType) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Choisissez le type d'inscription</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:border-violet-500 transition"
            onClick={() => setRegistrationType('existing')}
          >
            <h3 className="text-xl font-bold mb-2">Équipe existante</h3>
            <p className="text-gray-400">
              Sélectionnez une de vos équipes permanentes
            </p>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-violet-500 transition"
            onClick={() => setRegistrationType('temporary')}
          >
            <h3 className="text-xl font-bold mb-2">Équipe temporaire</h3>
            <p className="text-gray-400">
              Créez une équipe pour ce tournoi uniquement
            </p>
          </Card>
        </div>
      </div>
    );
  }
  
  if (registrationType === 'temporary') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Inscription d'une équipe temporaire</h2>
          <Button 
            variant="ghost" 
            onClick={() => setRegistrationType('existing')}
          >
            Équipe permanente
          </Button>
        </div>
        
        <Card>
          <form onSubmit={handleSubmitTemporaryTeam}>
            {/* Informations de contact */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Informations de contact</h3>
              <Input
                label="E-mail de contact"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@exemple.fr"
                required
              />
            </div>
            
            {/* Nom de l'équipe */}
            <div className="mb-6">
              <Input
                label="Nom de l'équipe"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Les Cafeinés"
                required
              />
            </div>
            
            {/* Joueurs */}
            <div className="space-y-6">
              {players.map((player, index) => (
                <div key={index} className="border-t border-gray-700 pt-4">
                  <h4 className="text-md font-semibold mb-3">
                    Joueur {index + 1} {index === 0 && '(Capitaine)'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nom du joueur"
                      value={player.name}
                      onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                      placeholder="Pseudo du joueur"
                      required
                    />
                    <Input
                      label="Email du joueur"
                      type="email"
                      value={player.email}
                      onChange={(e) => updatePlayer(index, 'email', e.target.value)}
                      placeholder="joueur@exemple.fr"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex gap-4 mt-8">
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => navigate(`/play/tournaments/${tournamentId}`)}
              >
                Annuler
              </Button>
              <Button type="submit">
                Valider l'inscription
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }
  
  // registrationType === 'existing'
  return (
    <div>
      {/* Formulaire sélection équipe existante */}
      {/* À implémenter */}
    </div>
  );
}
```

---

**Bon courage pour cette refonte ! 🚀**

Si vous avez besoin de détails sur une section spécifique ou d'aide pour l'implémentation, je suis là.
