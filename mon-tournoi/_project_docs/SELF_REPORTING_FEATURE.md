# 📝 Fonctionnalité Self-Reporting de Scores

## Description

Le **Self-Reporting de Scores** permet aux équipes de déclarer indépendamment leur score après un match. Le système valide automatiquement si les deux déclarations concordent, ou signale un conflit pour intervention administrateur.

## Installation

### 1. Migration de la base de données

Avant d'utiliser cette fonctionnalité, vous devez exécuter la migration SQL dans Supabase.

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez la partie "Self-Reporting" du script dans `database_migrations.sql` :

```sql
-- Ajouter des champs pour le système de déclaration de scores
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS score_p1_reported INTEGER,
ADD COLUMN IF NOT EXISTS score_p2_reported INTEGER,
ADD COLUMN IF NOT EXISTS reported_by_team1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reported_by_team2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS score_status VARCHAR(20) DEFAULT 'pending';

-- Créer une table pour l'historique des déclarations de scores
CREATE TABLE IF NOT EXISTS score_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    score_team INTEGER NOT NULL,
    score_opponent INTEGER NOT NULL,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_score_reports_match_id ON score_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_score_reports_team_id ON score_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_score_status ON matches(score_status);
```

### 2. Vérification

Une fois la migration exécutée, la fonctionnalité est automatiquement disponible dans le MatchLobby.

## Fonctionnement

### Pour les joueurs

1. **Accéder au Match Lobby** :
   - Cliquez sur un match dans l'arbre du tournoi
   - Vous arrivez sur la page du lobby du match

2. **Déclarer votre score** :
   - Si vous êtes membre d'une équipe du match, vous verrez une zone "📝 Déclarer mon score"
   - Entrez votre score et le score adverse
   - Cliquez sur **"✉️ Envoyer ma déclaration"**

3. **Attendre la déclaration adverse** :
   - Une fois votre score déclaré, vous devez attendre que l'adversaire déclare également son score
   - Si les deux scores concordent → **Validation automatique** ✅
   - Si les scores diffèrent → **Conflit détecté** ⚠️

### États du score

- **`pending`** : En attente de déclaration (une ou aucune équipe n'a déclaré)
- **`confirmed`** : Scores confirmés automatiquement (concordance)
- **`disputed`** : Conflit détecté (scores différents) - intervention admin requise

### Validation automatique

Le système vérifie la concordance en comparant les deux déclarations :
- Si l'équipe 1 déclare `(3, 2)` et l'équipe 2 déclare `(2, 3)` → **Concordance** ✅
- Si l'équipe 1 déclare `(3, 2)` et l'équipe 2 déclare `(3, 1)` → **Conflit** ⚠️

### Résolution des conflits (Admin)

Lorsqu'un conflit est détecté :

1. **L'administrateur** voit une zone spéciale "⚖️ Résoudre le conflit (Admin)"
2. Il peut entrer manuellement le score correct
3. Clique sur **"✅ Valider ce score"**
4. Le match est terminé avec le score validé par l'admin
5. Le vainqueur avance automatiquement au round suivant

## Historique des déclarations

Toutes les déclarations sont enregistrées dans la table `score_reports` et affichées dans le Match Lobby :
- Date et heure de la déclaration
- Équipe qui a déclaré
- Utilisateur qui a fait la déclaration
- Statut (résolu ou non)

## Avantages

✅ **Transparence** : Chaque équipe déclare indépendamment son score  
✅ **Automatisation** : Validation automatique si concordance  
✅ **Traçabilité** : Historique complet de toutes les déclarations  
✅ **Résolution de conflits** : Interface admin pour trancher en cas de litige  
✅ **Sécurité** : Seuls les membres des équipes peuvent déclarer leur score

## Flux complet

```
1. Match terminé
   ↓
2. Équipe 1 déclare son score
   ↓
3. Équipe 2 déclare son score
   ↓
4. Vérification automatique
   ├─→ Concordance → ✅ Validation automatique → Match terminé
   └─→ Conflit → ⚠️ Signalement admin → Résolution manuelle → Match terminé
```

## Notes techniques

- Les scores sont stockés dans `matches.score_p1_reported` et `matches.score_p2_reported`
- L'historique est dans la table `score_reports`
- La validation automatique avance automatiquement le vainqueur au round suivant
- Les déclarations sont en temps réel via Supabase Realtime

## Sécurité

- Seuls les membres d'une équipe (membres ou capitaine) peuvent déclarer le score
- L'administrateur du tournoi peut résoudre les conflits
- Chaque déclaration est tracée avec l'utilisateur qui l'a faite



