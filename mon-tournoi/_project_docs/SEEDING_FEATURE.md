# 🎯 Fonctionnalité Seeding (God Mode)

## Description

Le **Seeding (God Mode)** permet à l'organisateur d'un tournoi de placer manuellement les équipes dans l'arbre avant la génération. C'est un outil puissant pour contrôler les matchs et éviter que les meilleures équipes se rencontrent trop tôt.

## Installation

### 1. Migration de la base de données

Avant d'utiliser cette fonctionnalité, vous devez ajouter le champ `seed_order` à la table `participants` dans Supabase.

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez le script suivant (disponible dans `database_migrations.sql`) :

```sql
-- Ajouter la colonne seed_order (nullable, pour permettre les tournois sans seeding)
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS seed_order INTEGER;

-- Créer un index pour améliorer les performances lors du tri
CREATE INDEX IF NOT EXISTS idx_participants_seed_order 
ON participants(tournament_id, seed_order);
```

### 2. Vérification

Une fois la migration exécutée, la fonctionnalité est automatiquement disponible dans l'interface.

## Utilisation

### Pour l'organisateur

1. **Accéder au Seeding** :
   - Ouvrez un tournoi en mode "Draft" (inscriptions ouvertes)
   - Cliquez sur le bouton **"🎯 God Mode - Seeding"** dans le panneau admin

2. **Réorganiser les équipes** :
   - Dans la modale qui s'ouvre, vous verrez toutes les équipes inscrites
   - **Glissez-déposez** les équipes pour les réorganiser
   - Le seed #1 sera placé en haut de l'arbre, le seed #2 en bas, etc.

3. **Sauvegarder** :
   - Cliquez sur **"💾 Sauvegarder le Seeding"** pour enregistrer l'ordre
   - Vous pouvez réinitialiser l'ordre avec **"🔄 Réinitialiser"** si besoin

4. **Générer l'arbre** :
   - Une fois le seeding sauvegardé, cliquez sur **"Générer l'Arbre et Lancer"**
   - Les équipes seront placées dans l'arbre selon l'ordre défini

### Indicateurs visuels

- **Seed #1** : Badge doré (or) - Meilleur placement
- **Seed #2** : Badge argenté (argent) - Deuxième meilleur placement
- **Seed #3** : Badge bronze - Troisième meilleur placement
- **Autres seeds** : Badge gris

## Comportement

### Avec Seeding

Si un seeding a été défini :
- Les équipes sont placées dans l'arbre selon leur `seed_order`
- Le seed #1 est en haut, le seed #2 en bas
- Les seeds pairs se rencontrent en finale si tout se passe bien

### Sans Seeding

Si aucun seeding n'a été défini :
- Les équipes sont mélangées aléatoirement
- L'ordre est généré de manière aléatoire

## Format de tournoi

### Élimination Directe (Single Elimination)

Le seeding est particulièrement utile pour ce format :
- Seed #1 vs Seed #8 (si 8 équipes)
- Seed #2 vs Seed #7
- Seed #3 vs Seed #6
- Seed #4 vs Seed #5

### Round Robin (Championnat)

Le seeding influence l'ordre d'affichage dans le classement initial, mais tous les matchs sont joués de toute façon.

## Notes techniques

- Le champ `seed_order` est **nullable** : les tournois sans seeding fonctionnent toujours
- L'ordre est sauvegardé dans la table `participants`
- Le seeding peut être modifié à tout moment avant le lancement du tournoi
- Une fois le tournoi lancé, le seeding ne peut plus être modifié

## Exemple de stratégie

Pour un tournoi à 8 équipes :
1. **Seed #1** : L'équipe favorite (évite les matchs difficiles au début)
2. **Seed #2** : Deuxième meilleure équipe (rencontre la #1 en finale)
3. **Seeds #3-4** : Équipes moyennes-fortes
4. **Seeds #5-8** : Équipes plus faibles ou nouvelles

Cette stratégie garantit des matchs équilibrés et une finale excitante !



