# 🎯 Configuration du Compte Organisateur

## Instructions pour définir votre compte comme organisateur

Par défaut, tous les nouveaux comptes sont créés avec le rôle **"player"** (joueur). Seul votre compte peut avoir le rôle **"organizer"** (organisateur).

### Étape 1 : Exécuter la migration SQL

1. Ouvrez **Supabase SQL Editor**
2. Exécutez le fichier `database_migrations_user_roles.sql`
   - Ce script crée la table `user_roles` et les fonctions nécessaires

### Étape 2 : Trouver votre User ID

1. Dans Supabase, allez dans **Authentication** > **Users**
2. Trouvez votre compte (votre email)
3. Copiez votre **User ID** (UUID)

### Étape 3 : Définir votre compte comme organisateur

Exécutez cette requête SQL dans **Supabase SQL Editor** (remplacez `YOUR_USER_ID` par votre User ID) :

```sql
-- Définir votre compte comme organisateur
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'organizer')
ON CONFLICT (user_id) 
DO UPDATE SET role = 'organizer';
```

**OU** utilisez la fonction :

```sql
-- Utiliser la fonction set_user_role
SELECT set_user_role('YOUR_USER_ID', 'organizer');
```

### Étape 4 : Vérifier

Pour vérifier que votre rôle est bien défini :

```sql
-- Vérifier votre rôle
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';
```

Vous devriez voir `role = 'organizer'`.

### Important

- **Tous les autres comptes** auront automatiquement le rôle `'player'` (par défaut)
- **Seuls les comptes avec le rôle `'organizer'`** peuvent accéder aux routes `/organizer/*`
- **Les comptes `'player'`** ne peuvent accéder qu'aux routes `/player/*` et aux fonctionnalités joueur
- **Les comptes `'organizer'`** peuvent aussi accéder aux fonctionnalités joueur (ils peuvent être organisateur ET joueur)

### Sécurité

Les routes organisateur sont protégées :
- Si un joueur essaie d'accéder à `/organizer/dashboard`, il sera redirigé vers `/player/dashboard` avec un message d'erreur
- Seuls les comptes avec `role = 'organizer'` peuvent créer des tournois et accéder au panneau admin

