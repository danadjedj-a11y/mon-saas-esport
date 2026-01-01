# 🔧 Débogage du Panneau Admin

## Problèmes Identifiés

Si les fonctions d'admin (disqualification, check-in manuel, réintégration) ne fonctionnent pas, voici les causes possibles :

## 1. Vérifier les Permissions RLS (Row Level Security)

Les politiques RLS dans Supabase peuvent bloquer les updates. Vérifiez dans Supabase :

### Politique UPDATE pour participants (Admin du tournoi)

Exécutez cette requête SQL dans Supabase SQL Editor :

```sql
-- Politique pour permettre au propriétaire du tournoi de modifier les participants
CREATE POLICY "Tournament owners can update participants"
ON participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = participants.tournament_id
    AND tournaments.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = participants.tournament_id
    AND tournaments.owner_id = auth.uid()
  )
);
```

### Vérifier les politiques existantes

```sql
-- Voir toutes les politiques sur participants
SELECT * FROM pg_policies WHERE tablename = 'participants';
```

## 2. Vérifier que les champs existent

Vérifiez que les champs `checked_in` et `disqualified` existent bien :

```sql
-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'participants'
AND column_name IN ('checked_in', 'disqualified');
```

Si les champs n'existent pas, exécutez :

```sql
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disqualified BOOLEAN DEFAULT FALSE;
```

## 3. Tester manuellement

Testez une update manuelle dans Supabase SQL Editor (remplacez les IDs) :

```sql
-- Test de disqualification
UPDATE participants
SET disqualified = true
WHERE id = 'VOTRE_PARTICIPANT_ID'
RETURNING *;

-- Test de check-in
UPDATE participants
SET checked_in = true, disqualified = false
WHERE id = 'VOTRE_PARTICIPANT_ID'
RETURNING *;

-- Test de réintégration
UPDATE participants
SET disqualified = false
WHERE id = 'VOTRE_PARTICIPANT_ID'
RETURNING *;
```

Si ces requêtes fonctionnent, le problème vient du code frontend ou des permissions RLS.

## 4. Vérifier dans la Console du Navigateur

Ouvrez la console (F12) et vérifiez :
- Les erreurs lors du clic sur les boutons
- Les messages "Erreur check-in manuel:", "Erreur disqualification:", etc.
- Les erreurs de permissions (403, etc.)

## 5. Vérifier que vous êtes bien propriétaire

Dans AdminPanel, vérifiez que `isOwner` est bien `true`. Le composant AdminPanel ne devrait s'afficher que si vous êtes propriétaire.

## Solution Rapide (pour tests uniquement)

Si vous voulez tester rapidement sans configurer RLS, vous pouvez temporairement permettre tous les updates (ATTENTION : à supprimer après les tests !) :

```sql
-- ⚠️ POUR TESTS UNIQUEMENT - À SUPPRIMER APRÈS
CREATE POLICY "Allow all updates for testing"
ON participants
FOR UPDATE
USING (true)
WITH CHECK (true);
```

N'oubliez pas de supprimer cette politique après les tests :

```sql
DROP POLICY IF EXISTS "Allow all updates for testing" ON participants;
```



