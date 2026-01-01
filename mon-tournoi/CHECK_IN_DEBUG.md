# 🔍 Débogage du Check-in

## Problèmes identifiés

1. Le bouton ne passe pas en vert après le clic
2. Au refresh, le check-in est perdu (revient en jaune)
3. Au lancement du tournoi, aucune équipe n'est détectée comme check-in

## Vérifications à faire

### 1. Vérifier que le champ `checked_in` existe dans la table `participants`

Exécutez dans Supabase SQL Editor :

```sql
-- Vérifier la structure de la table participants
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'participants'
ORDER BY ordinal_position;
```

Vous devriez voir `checked_in` avec le type `boolean` et une valeur par défaut `false`.

### 2. Si le champ n'existe pas, l'ajouter

```sql
-- Ajouter le champ checked_in s'il n'existe pas
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;
```

### 3. Vérifier les permissions RLS (Row Level Security)

Le problème peut venir des politiques RLS qui bloquent les updates. Vérifiez dans Supabase :

1. Allez dans **Authentication** > **Policies**
2. Sélectionnez la table `participants`
3. Vérifiez qu'il existe une politique UPDATE qui autorise les utilisateurs à mettre à jour leurs propres participants

Si aucune politique n'existe, créez-en une :

```sql
-- Politique pour permettre aux utilisateurs de mettre à jour leur check-in
CREATE POLICY "Users can update their own team check-in"
ON participants
FOR UPDATE
USING (
  -- L'utilisateur est capitaine de l'équipe
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = participants.team_id
    AND teams.captain_id = auth.uid()
  )
  OR
  -- L'utilisateur est membre de l'équipe
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = participants.team_id
    AND team_members.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Même condition pour vérifier qu'on peut seulement modifier son propre check-in
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = participants.team_id
    AND teams.captain_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = participants.team_id
    AND team_members.user_id = auth.uid()
  )
);
```

### 4. Tester l'update manuellement

Exécutez cette requête (remplacez les IDs par les vôtres) :

```sql
-- Test d'update manuel (remplacez les IDs)
UPDATE participants
SET checked_in = true
WHERE tournament_id = 'VOTRE_TOURNAMENT_ID'
  AND team_id = 'VOTRE_TEAM_ID'
RETURNING *;
```

Si ça fonctionne, le problème vient du code frontend. Si ça ne fonctionne pas, c'est un problème de permissions RLS.

### 5. Vérifier dans la console du navigateur

Ouvrez la console (F12) et vérifiez :
- S'il y a des erreurs lors du clic sur "Valider ma présence"
- Le message "Check-in réussi:" avec les données
- Les logs des participants chargés

### 6. Vérifier que les participants sont bien chargés avec checked_in

Dans `Tournament.jsx`, j'ai ajouté un log console. Vérifiez dans la console si `checked_in` apparaît dans les données des participants.

## Solution temporaire (si RLS bloque)

Si les politiques RLS bloquent, vous pouvez temporairement permettre tous les updates pour les tests :

```sql
-- ATTENTION : Ceci est pour les tests uniquement, pas pour la production !
CREATE POLICY "Allow all updates for testing"
ON participants
FOR UPDATE
USING (true)
WITH CHECK (true);
```

N'oubliez pas de supprimer cette politique après les tests !

## Solution définitive

Une fois que vous avez vérifié que le champ existe et que les politiques RLS sont correctes, le code devrait fonctionner. Le problème vient probablement de :

1. Le champ `checked_in` n'existe pas dans la table
2. Les politiques RLS bloquent les updates
3. Un problème de cache côté Supabase



