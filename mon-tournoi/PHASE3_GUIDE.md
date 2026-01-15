# Phase 3 Implementation - Guide d'Utilisation

## Nouvelles Fonctionnalités Implémentées

### 1. Création de Tournois Améliorée (Multi-Step Wizard)

La création de tournois a été complètement refaite avec un wizard en 4 étapes :

#### Étape 1 : Détails du Tournoi
- Nom de l'événement
- Jeu
- Format de compétition (Elimination, Double Elimination, Round Robin, Swiss)
- Date de début
- Nombre maximum d'équipes (optionnel)
- Date limite d'inscription (optionnelle)

#### Étape 2 : Description & Règles
- **Description** : Zone de texte enrichi (WYSIWYG) sans limite de caractères pour décrire le tournoi
- **Règlement** : Éditeur WYSIWYG pour rédiger les règles du tournoi (pas de limite de caractères)

#### Étape 3 : Récompenses (Cashprize)
- Montant total du cashprize
- Distribution par rang (1ère, 2ème, 3ème place)
- Format stocké en JSON : `{"1": 500, "2": 300, "3": 200}`

#### Étape 4 : Configuration Avancée
- **Format des matchs** : Best-of-1, 3, 5, ou 7
- **Pool de cartes** : Liste des cartes disponibles pour le tournoi
- **Streams officiels** : URLs Twitch et YouTube
- **Sponsors** : Liste dynamique de sponsors avec nom et logo

**Navigation du wizard :**
- Boutons "Précédent" et "Suivant" pour naviguer entre les étapes
- Indicateur visuel de progression (numéros d'étapes avec checkmarks)
- Validation à chaque étape avant de continuer
- Bouton "Créer le Tournoi" à la dernière étape

### 2. Section Actualités (News)

#### Affichage Public (HomePage)
- Section "📰 Actualités" sur la page d'accueil
- Affichage des 6 derniers articles publiés
- Grille responsive (1 colonne mobile, 2 colonnes tablette, 3 colonnes desktop)
- Carte d'article avec :
  - Image featured (si disponible)
  - Titre
  - Extrait du contenu (150 caractères max)
  - Date de publication
  - Bouton "Lire plus"
- Modal pour afficher l'article complet au clic

#### Gestion des News (Pour Organisateurs)
Composant `NewsManagement` disponible pour les organisateurs :

**Fonctionnalités :**
- Créer un nouvel article
- Modifier un article existant
- Supprimer un article
- Publier/Dépublier un article
- Éditeur WYSIWYG pour le contenu
- Upload d'image featured (URL)
- Status : Brouillon ou Publié

**Accès :**
Pour intégrer le composant NewsManagement dans une page :
```jsx
import NewsManagement from './components/NewsManagement';

<NewsManagement session={session} />
```

### 3. Widget Match Actif

Widget persistant affiché sur toutes les pages du dashboard pour les joueurs ayant un match en cours.

**Caractéristiques :**
- Position : En bas à droite de l'écran
- Affichage si l'utilisateur a un match actif (status: pending ou ongoing)
- Informations affichées :
  - Nom du tournoi et jeu
  - Équipes en présence avec logos
  - Score en temps réel
  - Status du match
  - Bouton "Aller au match"
- Possibilité de minimiser le widget
- Mises à jour en temps réel via Supabase Realtime

**Hook personnalisé :**
```javascript
import { useActiveMatch } from './shared/hooks';

const { activeMatch, loading, error, refetch } = useActiveMatch(session);
```

### 4. Matchs Cliquables avec Page de Détails

**Amélioration de l'expérience utilisateur :**
- Tous les matchs sont maintenant cliquables (pour tous les utilisateurs, pas seulement les admins)
- Cliquer sur un match affiche la page de détails du match

**Routes :**
- `/match/:id` : Page de détails publique du match (accessible à tous)
- `/match/:id/lobby` : Lobby du match pour les participants (nécessite authentification)

**Page MatchDetails :**
- Informations du match :
  - Équipes en présence avec logos
  - Score actuel
  - Statut (En attente, En cours, Terminé)
  - Round et bracket (si applicable)
  - Date planifiée (si applicable)
- Affichage du vainqueur (si match terminé)
- Lien vers le tournoi parent
- Bouton "Accéder au lobby" pour les participants

## Modifications de la Base de Données

### Table `tournaments` - Nouvelles Colonnes
```sql
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS cashprize_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cashprize_distribution JSONB,
ADD COLUMN IF NOT EXISTS sponsors JSONB,
ADD COLUMN IF NOT EXISTS stream_urls JSONB,
ALTER COLUMN rules TYPE TEXT;
```

### Table `news_articles` - Nouvelle Table
```sql
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID REFERENCES auth.users(id),
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);
```

## Fichiers Créés

### Composants
- `/src/shared/components/ui/WYSIWYGEditor.jsx` - Éditeur WYSIWYG simple
- `/src/components/NewsSection.jsx` - Section actualités pour HomePage
- `/src/components/NewsManagement.jsx` - Gestion des actualités (admin)
- `/src/components/ActiveMatchWidget.jsx` - Widget match actif persistant
- `/src/pages/MatchDetails.jsx` - Page de détails d'un match

### Hooks
- `/src/shared/hooks/useActiveMatch.js` - Hook pour récupérer le match actif de l'utilisateur

### Migrations
- `/_db_scripts/phase3_tournament_news_migrations.sql` - Migrations SQL pour Phase 3

## Fichiers Modifiés

- `/src/CreateTournament.jsx` - Refonte complète en wizard multi-étapes
- `/src/HomePage.jsx` - Ajout de la section News
- `/src/App.jsx` - Ajout des routes pour MatchDetails et séparation lobby
- `/src/Tournament.jsx` - Matchs cliquables pour tous les utilisateurs
- `/src/layouts/DashboardLayout.jsx` - Intégration du widget match actif
- `/src/shared/components/ui/index.js` - Export du WYSIWYGEditor
- `/src/shared/hooks/index.js` - Export du hook useActiveMatch

## Instructions de Déploiement

### 1. Base de Données
Exécuter le script SQL de migration dans l'éditeur SQL de Supabase :
```bash
/_db_scripts/phase3_tournament_news_migrations.sql
```

### 2. Permissions RLS
Les politiques RLS pour `news_articles` sont incluses dans le script de migration :
- Public peut lire les articles publiés
- Organisateurs peuvent créer/modifier/supprimer leurs articles

### 3. Test des Fonctionnalités

#### Test Création de Tournois
1. Se connecter en tant qu'organisateur
2. Aller sur "Créer un Tournoi"
3. Remplir chaque étape du wizard
4. Tester la navigation entre les étapes
5. Créer le tournoi
6. Vérifier que toutes les données sont sauvegardées (description, cashprize, sponsors, streams)

#### Test News
1. Créer une page pour accéder à NewsManagement (ou l'intégrer dans OrganizerDashboard)
2. Créer un article avec image et contenu riche
3. Publier l'article
4. Vérifier qu'il apparaît sur la HomePage
5. Cliquer pour voir les détails dans le modal

#### Test Widget Match Actif
1. S'inscrire à un tournoi avec une équipe
2. Lancer le tournoi (admin)
3. Vérifier que le widget apparaît en bas à droite
4. Tester la minimisation
5. Naviguer sur différentes pages du site
6. Vérifier que le widget reste visible

#### Test Matchs Cliquables
1. Aller sur la page d'un tournoi en cours
2. Cliquer sur un match dans l'arbre
3. Vérifier que la page MatchDetails s'affiche
4. Vérifier toutes les informations affichées
5. Cliquer sur "Accéder au lobby" (si participant)

## Notes Techniques

### WYSIWYG Editor
L'éditeur WYSIWYG est implémenté sans dépendances externes en utilisant `contentEditable` et `document.execCommand()`. Il supporte :
- Gras, Italique, Souligné, Barré
- Listes à puces et numérotées
- Alignement (gauche, centre, droite)
- Insertion de liens
- Suppression du formatage

Pour des besoins plus avancés, envisager d'intégrer TipTap ou Slate.js.

### Temps Réel
Le widget ActiveMatchWidget utilise Supabase Realtime pour les mises à jour en temps réel :
```javascript
const channel = supabase
  .channel('active-match-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, ...)
  .subscribe();
```

### Format JSON
Les nouveaux champs JSON dans la table tournaments :
- `cashprize_distribution` : `{"1": 500, "2": 300, "3": 200}`
- `sponsors` : `[{"name": "Sponsor 1", "logo_url": "url"}]`
- `stream_urls` : `{"twitch": "url", "youtube": "url"}`

## Améliorations Futures Possibles

1. **Éditeur WYSIWYG avancé** : Remplacer par TipTap ou Slate.js pour plus de fonctionnalités
2. **Upload d'images** : Intégrer Supabase Storage pour l'upload direct d'images au lieu d'URLs
3. **Template de tournois** : Sauvegarder les configurations complètes (incluant cashprize, sponsors) comme templates
4. **Catégories de news** : Ajouter des catégories/tags pour filtrer les actualités
5. **Commentaires sur les news** : Permettre aux utilisateurs de commenter les articles
6. **Notifications push** : Notifier les utilisateurs d'un nouveau match via le widget
7. **Statistiques détaillées** : Ajouter plus de détails sur la page MatchDetails (historique, stats joueurs)
