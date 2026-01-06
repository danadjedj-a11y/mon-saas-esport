# 🔒 CORRECTION DES WARNINGS DE SÉCURITÉ
**Date:** 2026-01-06  
**Source:** Supabase Database Linter  
**Niveau:** ⚠️ WARN (Non urgent, mais recommandé)

---

## 📋 RÉSUMÉ DES PROBLÈMES

### 1. **Function Search Path Mutable** (37 fonctions)
**Niveau:** ⚠️ WARN  
**Impact:** 🟡 MOYEN - Vulnérabilité potentielle de sécurité

### 2. **Leaked Password Protection Disabled** (1 problème)
**Niveau:** ⚠️ WARN  
**Impact:** 🟡 MOYEN - Protection contre les mots de passe compromis désactivée

---

## 🔍 PROBLÈME 1: FUNCTION SEARCH PATH MUTABLE

### Description
Les fonctions PostgreSQL sans `search_path` défini sont vulnérables à des attaques de manipulation de `search_path`. Un attaquant pourrait potentiellement créer des objets (tables, fonctions) dans un schéma malveillant et les faire référencer par vos fonctions.

### Fonctions concernées (37 fonctions)

#### Fonctions de validation (5)
- `validate_match_score`
- `validate_game_score`
- `validate_tournament`
- `validate_team`
- `validate_message`

#### Fonctions de gestion des rôles (2)
- `get_user_role`
- `set_user_role`

#### Fonctions de gestion des équipes (1)
- `add_creator_to_team`

#### Fonctions de suisse (1)
- `update_swiss_scores_updated_at`

#### Fonctions de follow (2)
- `is_following_tournament`
- `is_following_team`

#### Fonctions de templates (2)
- `increment_template_usage`
- `update_tournament_templates_updated_at`

#### Fonctions de système XP/Badges (4)
- `calculate_level`
- `add_xp`
- `check_and_award_badges`
- `update_user_levels_updated_at`

#### Fonctions de ratings (1)
- `get_tournament_rating`

#### Fonctions de comments (2)
- `update_tournament_comments_updated_at`
- `update_comment_replies_updated_at`

#### Fonctions de notifications (3)
- `create_notification_with_deduplication`
- `get_unread_notifications_count`
- `cleanup_old_deduplication`

#### Fonctions de rate limiting (10)
- `cleanup_old_rate_limits`
- `check_rate_limit`
- `rate_limit_tournament_create`
- `rate_limit_team_create`
- `rate_limit_comment_post`
- `rate_limit_registration`
- `rate_limit_template_create`
- `rate_limit_follow_toggle`
- `rate_limit_score_report`
- `rate_limit_check_in`
- `get_rate_limit_stats`

#### Fonctions d'authentification (1)
- `handle_new_user`

### Solution
Définir un `search_path` fixe pour chaque fonction en utilisant:
```sql
ALTER FUNCTION function_name SET search_path = public, pg_catalog;
```

**Explication:**
- `public` - Accès au schéma public (vos tables/fonctions)
- `pg_catalog` - Accès aux types/fonctions PostgreSQL standard

### Script de correction
Le script `_db_scripts/fix_function_search_path_security.sql` corrige automatiquement toutes les 37 fonctions.

---

## 🔍 PROBLÈME 2: LEAKED PASSWORD PROTECTION DISABLED

### Description
La protection contre les mots de passe compromis (HaveIBeenPwned) est actuellement désactivée. Cette fonctionnalité vérifie si un mot de passe a été compromis dans des fuites de données publiques.

### Impact
🟡 **MOYEN** - Les utilisateurs peuvent utiliser des mots de passe qui ont été compromis dans des fuites de données, ce qui augmente le risque de compromission de compte.

### Solution
**Cette correction ne peut PAS être faite via SQL.** Elle doit être activée dans l'interface Supabase Dashboard:

1. **Allez dans:** Authentication > Settings > Password
2. **Activez:** "Leaked Password Protection"
3. **Optionnel:** Configurez les paramètres de force du mot de passe

### Documentation
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## 🛠️ ACTIONS REQUISES

### Action 1: Corriger les fonctions (SQL)
**Fichier:** `_db_scripts/fix_function_search_path_security.sql`

**Instructions:**
1. Ouvrez le script dans l'éditeur SQL de Supabase
2. Exécutez le script complet
3. Vérifiez que toutes les fonctions ont maintenant un `search_path` défini (la requête de vérification à la fin du script vous le confirmera)

**Temps estimé:** 2-3 minutes

### Action 2: Activer la protection des mots de passe (Dashboard)
**Interface:** Supabase Dashboard > Authentication > Settings > Password

**Instructions:**
1. Connectez-vous au Dashboard Supabase
2. Allez dans Authentication > Settings > Password
3. Activez "Leaked Password Protection"
4. (Optionnel) Configurez les paramètres de force du mot de passe

**Temps estimé:** 1-2 minutes

---

## ✅ VÉRIFICATION POST-CORRECTION

### Vérifier les fonctions corrigées
Exécutez cette requête dans Supabase SQL Editor:

```sql
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  CASE 
    WHEN p.proconfig IS NULL THEN '⚠️ No search_path set'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path set'
    ELSE '⚠️ No search_path in config'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_swiss_scores_updated_at',
    'get_user_role',
    'set_user_role',
    'add_creator_to_team',
    'validate_match_score',
    'validate_game_score',
    'validate_tournament',
    'validate_team',
    'validate_message',
    'is_following_tournament',
    'is_following_team',
    'increment_template_usage',
    'update_tournament_templates_updated_at',
    'calculate_level',
    'add_xp',
    'check_and_award_badges',
    'update_user_levels_updated_at',
    'get_tournament_rating',
    'update_tournament_comments_updated_at',
    'update_comment_replies_updated_at',
    'create_notification_with_deduplication',
    'get_unread_notifications_count',
    'cleanup_old_deduplication',
    'cleanup_old_rate_limits',
    'check_rate_limit',
    'rate_limit_tournament_create',
    'rate_limit_team_create',
    'rate_limit_comment_post',
    'rate_limit_registration',
    'rate_limit_template_create',
    'rate_limit_follow_toggle',
    'rate_limit_score_report',
    'rate_limit_check_in',
    'get_rate_limit_stats',
    'handle_new_user'
  )
ORDER BY p.proname;
```

**Résultat attendu:** Toutes les fonctions doivent avoir `✅ search_path set`

### Vérifier la protection des mots de passe
1. Allez dans Supabase Dashboard > Authentication > Settings > Password
2. Vérifiez que "Leaked Password Protection" est activé

---

## 📊 STATISTIQUES

- **Fonctions à corriger:** 37
- **Temps de correction estimé:** 2-3 minutes (SQL) + 1-2 minutes (Dashboard)
- **Impact sécurité:** 🟡 MOYEN (amélioration de la sécurité)
- **Urgence:** ⚠️ NON URGENT (mais recommandé)

---

## ⚠️ NOTES IMPORTANTES

1. **Test après correction:** Testez toutes vos fonctions RPC après l'exécution du script pour vous assurer qu'elles fonctionnent toujours correctement.

2. **Rollback:** Si vous avez des problèmes, vous pouvez supprimer le `search_path` avec:
   ```sql
   ALTER FUNCTION function_name RESET search_path;
   ```

3. **Performance:** La définition d'un `search_path` fixe n'a pas d'impact négatif sur les performances.

4. **Best Practice:** Toutes les nouvelles fonctions créées à l'avenir devraient avoir un `search_path` défini dès leur création.

---

## 📝 CHECKLIST

- [ ] Exécuter `fix_function_search_path_security.sql`
- [ ] Vérifier que toutes les fonctions ont un `search_path` défini
- [ ] Tester les fonctions RPC critiques (add_xp, check_and_award_badges, etc.)
- [ ] Activer "Leaked Password Protection" dans le Dashboard
- [ ] Vérifier que la protection est bien activée
- [ ] Documenter les changements

---

**Rapport généré:** 2026-01-06  
**Status:** ⚠️ **NON URGENT** - Corrections recommandées pour améliorer la sécurité

