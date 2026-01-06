# ⏰ Fonctionnalité Check-in Avancé

## Description

Le **Check-in Avancé** permet de gérer la présence des équipes avec une fenêtre temporelle (ex: 15 minutes avant le début) et une disqualification automatique des équipes absentes.

## Installation

### 1. Migration de la base de données

Avant d'utiliser cette fonctionnalité, vous devez exécuter la migration SQL dans Supabase.

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez la partie "Check-in Avancé" du script dans `database_migrations.sql` :

```sql
-- Ajouter des champs pour le check-in avancé dans tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS check_in_window_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS check_in_deadline TIMESTAMP WITH TIME ZONE;

-- Ajouter un champ pour marquer si une équipe a été disqualifiée
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS disqualified BOOLEAN DEFAULT FALSE;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_participants_disqualified ON participants(tournament_id, disqualified);
CREATE INDEX IF NOT EXISTS idx_tournaments_check_in_deadline ON tournaments(check_in_deadline);
```

### 2. Vérification

Une fois la migration exécutée, la fonctionnalité est automatiquement disponible.

## Fonctionnement

### Fenêtre de Check-in

La fenêtre de check-in s'ouvre **X minutes avant le début du tournoi** (par défaut 15 minutes) et se ferme au moment du début du tournoi.

**Exemple** :
- Début du tournoi : 20:00
- Fenêtre de check-in : 15 minutes avant
- Check-in ouvert : 19:45 → 20:00
- Check-in fermé : Avant 19:45 et après 20:00

### États du Check-in

1. **Avant l'ouverture** :
   - Compte à rebours affiché : "Check-in ouvre dans : X:XX"
   - Bouton désactivé

2. **Fenêtre ouverte** :
   - Bouton "Valider ma présence" actif
   - Compte à rebours : "Fermeture dans : X:XX"
   - Les équipes peuvent check-in

3. **Fenêtre fermée** :
   - Bouton désactivé : "Check-in fermé"
   - Les équipes non check-in sont disqualifiées automatiquement

4. **Check-in validé** :
   - Badge vert : "✅ Présence Validée"
   - L'équipe est prête pour le tournoi

5. **Disqualifié** :
   - Badge rouge : "❌ Disqualifié (Check-in manqué)"
   - L'équipe ne participe pas au tournoi

### Disqualification Automatique

Les équipes qui n'ont pas fait leur check-in avant la deadline sont **automatiquement disqualifiées** :

- Au moment du lancement du tournoi
- Lors du chargement de la page (si deadline passée)
- Les équipes disqualifiées sont exclues de la génération des matchs

### Interface Admin

L'organisateur peut voir dans la liste des participants :
- ✅ Équipes check-in (fond vert)
- ❌ Équipes disqualifiées (fond rouge, opacité réduite)
- Équipes en attente (fond normal)

## Configuration

### Lors de la création du tournoi

Actuellement, la fenêtre de check-in est fixée à **15 minutes** par défaut. Cette valeur peut être modifiée dans la base de données.

Pour changer la durée :
```sql
UPDATE tournaments 
SET check_in_window_minutes = 30  -- 30 minutes au lieu de 15
WHERE id = 'tournament-id';
```

## Utilisation

### Pour les équipes

1. **Inscription au tournoi** :
   - S'inscrire normalement au tournoi
   - Attendre l'ouverture de la fenêtre de check-in

2. **Check-in** :
   - Quand la fenêtre s'ouvre (15 min avant le début), le bouton devient actif
   - Cliquer sur "👋 Valider ma présence (Check-in)"
   - Confirmer la présence
   - ✅ Badge vert affiché

3. **Après la deadline** :
   - Si check-in non fait → Disqualification automatique
   - L'équipe ne pourra plus participer

### Pour l'organisateur

1. **Créer le tournoi** :
   - Définir une date/heure de début
   - La fenêtre de check-in sera calculée automatiquement (15 min avant)

2. **Lancer le tournoi** :
   - Cliquer sur "Générer l'Arbre et Lancer"
   - Les équipes non check-in sont automatiquement disqualifiées
   - Seules les équipes check-in participent au tournoi

3. **Surveiller** :
   - Voir le statut de chaque équipe dans la liste
   - Équipes check-in en vert
   - Équipes disqualifiées en rouge

## Workflow Complet

```
1. Tournoi créé avec date de début
   ↓
2. Équipes s'inscrivent
   ↓
3. (Date début - 15 min) → Fenêtre de check-in s'ouvre
   ↓
4. Équipes font leur check-in
   ↓
5. Date de début atteinte → Fenêtre fermée
   ↓
6. Organisateur lance le tournoi
   ↓
7. Équipes non check-in → Disqualification automatique
   ↓
8. Matchs générés uniquement avec les équipes check-in
```

## Cas d'usage

✅ **Tournois en ligne** : S'assurer que les équipes sont présentes avant de commencer  
✅ **LAN Events** : Valider la présence physique des équipes  
✅ **Tournois compétitifs** : Garantir que seules les équipes sérieuses participent  
✅ **Prévention des absences** : Éviter les matchs avec des équipes absentes

## Notes techniques

- La deadline est calculée automatiquement : `start_date - check_in_window_minutes`
- Les disqualifications sont appliquées au lancement du tournoi
- Les équipes disqualifiées sont visuellement distinctes dans l'interface
- Le système vérifie automatiquement la deadline au chargement de la page

## Améliorations futures

- ⚙️ Configuration de la fenêtre de check-in dans l'interface (au lieu de SQL)
- 📧 Notifications par email avant l'ouverture du check-in
- 🔔 Rappels automatiques (5 min, 1 min avant la fermeture)
- ⏰ Affichage de l'heure du début du tournoi dans l'interface
- 📊 Statistiques de check-in (taux de participation)



