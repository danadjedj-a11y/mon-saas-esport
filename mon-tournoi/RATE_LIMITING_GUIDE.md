# 🛡️ Guide du Rate Limiting Backend

## 📋 Vue d'ensemble

Le système de rate limiting backend protège les opérations critiques contre les abus et attaques en limitant le nombre de requêtes qu'un utilisateur peut effectuer dans une fenêtre de temps donnée.

## 🎯 Objectifs

- **Protection contre les abus** : Empêcher les utilisateurs de spammer ou d'abuser du système
- **Sécurité** : Protection contre les attaques par déni de service (DoS)
- **Stabilité** : Éviter la surcharge de la base de données
- **Équité** : Assurer une utilisation équitable des ressources

## 🔧 Installation

### Étape 1 : Exécuter le script SQL

Exécutez le fichier `rate_limiting_backend.sql` dans l'éditeur SQL de Supabase :

1. Ouvrez Supabase Dashboard
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu de `rate_limiting_backend.sql`
5. Cliquez sur **Run**

### Étape 2 : Vérifier l'installation

Vérifiez que les tables ont été créées :

```sql
-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('rate_limits', 'rate_limit_config');

-- Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%rate_limit%';
```

## 📊 Opérations Protégées

Le système protège les opérations suivantes :

| Opération | Limite par défaut | Fenêtre |
|-----------|-------------------|---------|
| Création de tournois | 5 | 60 minutes |
| Création d'équipes | 10 | 60 minutes |
| Post de commentaires | 20 | 60 minutes |
| Inscriptions | 10 | 60 minutes |
| Création de templates | 5 | 60 minutes |
| Follow/Unfollow | 50 | 60 minutes |
| Déclarations de scores | 30 | 60 minutes |
| Check-ins | 20 | 60 minutes |

## ⚙️ Configuration

### Modifier les limites

Pour modifier les limites d'une opération :

```sql
-- Exemple : Augmenter la limite de création de tournois à 10 par heure
UPDATE rate_limit_config
SET max_requests = 10,
    window_minutes = 60
WHERE operation_type = 'tournament_create';
```

### Ajouter une nouvelle opération

Pour protéger une nouvelle opération :

```sql
-- 1. Ajouter la configuration
INSERT INTO rate_limit_config (operation_type, max_requests, window_minutes, description)
VALUES ('nouvelle_operation', 15, 60, 'Description de la nouvelle opération');

-- 2. Créer la fonction trigger
CREATE OR REPLACE FUNCTION rate_limit_nouvelle_operation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM check_rate_limit(NEW.user_id, 'nouvelle_operation');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger
CREATE TRIGGER trigger_rate_limit_nouvelle_operation
    BEFORE INSERT ON votre_table
    FOR EACH ROW
    EXECUTE FUNCTION rate_limit_nouvelle_operation();
```

## 🔍 Utilisation

### Gestion des erreurs côté client

Quand une limite est atteinte, PostgreSQL lève une exception. Côté client, vous devez capturer cette erreur :

```javascript
try {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([{ name: 'Mon Tournoi', ... }]);
  
  if (error) {
    if (error.message.includes('Rate limit exceeded')) {
      toast.error('Vous avez atteint la limite de création de tournois. Veuillez réessayer plus tard.');
    } else {
      toast.error('Erreur: ' + error.message);
    }
  }
} catch (err) {
  console.error('Erreur:', err);
}
```

### Vérifier les statistiques d'un utilisateur

Pour voir les statistiques de rate limiting d'un utilisateur :

```sql
-- Récupérer les stats pour un utilisateur
SELECT * FROM get_rate_limit_stats('user-uuid-here');
```

### Nettoyer les anciennes entrées

Pour nettoyer les entrées de plus de 24 heures :

```sql
SELECT cleanup_old_rate_limits();
```

**Note** : Pour automatiser le nettoyage, configurez un cron job dans Supabase ou une Edge Function qui appelle cette fonction périodiquement.

## 🛠️ Maintenance

### Monitoring

Surveillez les tentatives de rate limiting :

```sql
-- Voir les utilisateurs qui ont atteint leurs limites récemment
SELECT 
    user_id,
    operation_type,
    request_count,
    window_start,
    updated_at
FROM rate_limits
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

### Statistiques globales

```sql
-- Nombre total de requêtes par type d'opération
SELECT 
    operation_type,
    SUM(request_count) as total_requests,
    COUNT(DISTINCT user_id) as unique_users
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '24 hours'
GROUP BY operation_type
ORDER BY total_requests DESC;
```

## 🔒 Sécurité

### RLS (Row Level Security)

- Les utilisateurs peuvent uniquement voir leurs propres statistiques de rate limiting
- La configuration est en lecture seule pour tous les utilisateurs authentifiés
- Seuls les administrateurs peuvent modifier la configuration

### Fonctions SECURITY DEFINER

Les fonctions de rate limiting utilisent `SECURITY DEFINER` pour s'exécuter avec les privilèges du propriétaire de la fonction, garantissant que les vérifications ne peuvent pas être contournées.

## 📝 Notes importantes

1. **Fenêtres de temps** : Les fenêtres sont calculées en fonction de `window_minutes`. Par exemple, avec 60 minutes, la fenêtre change toutes les heures.

2. **Nettoyage automatique** : Les entrées de plus de 24 heures sont automatiquement supprimées lors du nettoyage. Configurez un cron job pour automatiser cela.

3. **Performance** : Les index sont créés pour optimiser les requêtes. Surveillez les performances si vous avez beaucoup d'utilisateurs.

4. **Limites par défaut** : Les limites par défaut sont conservatrices. Ajustez-les selon vos besoins réels.

## 🐛 Dépannage

### Problème : Les limites ne fonctionnent pas

1. Vérifiez que les triggers sont actifs :
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%rate_limit%';
```

2. Vérifiez que la configuration existe :
```sql
SELECT * FROM rate_limit_config;
```

3. Vérifiez les logs d'erreurs dans Supabase Dashboard

### Problème : Limites trop strictes

Ajustez les limites dans `rate_limit_config` selon vos besoins.

### Problème : Performance dégradée

- Vérifiez que les index existent
- Surveillez la taille de la table `rate_limits`
- Exécutez `cleanup_old_rate_limits()` plus fréquemment

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

