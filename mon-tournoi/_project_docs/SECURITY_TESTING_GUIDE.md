# 🔒 Guide de Tests de Sécurité

Ce guide vous aide à tester la sécurité de votre site déployé sur Vercel et identifier les failles potentielles.

## 📋 Table des matières

1. [Tests Automatisés](#tests-automatisés)
2. [Tests Manuels](#tests-manuels)
3. [Vérification des Headers de Sécurité](#vérification-des-headers-de-sécurité)
4. [Tests d'Authentification](#tests-dauthentification)
5. [Tests d'API](#tests-dapi)
6. [Tests de Base de Données](#tests-de-base-de-données)
7. [Outils Recommandés](#outils-recommandés)
8. [Checklist de Sécurité](#checklist-de-sécurité)

---

## 🛠️ Tests Automatisés

### 1. Scanner de Sécurité avec OWASP ZAP

**OWASP ZAP (Zed Attack Proxy)** est un outil gratuit et open-source pour tester la sécurité.

#### Installation sur Windows

> 📖 **Guide détaillé** : Voir [ZAP_INSTALLATION_GUIDE.md](./ZAP_INSTALLATION_GUIDE.md) pour un guide complet avec dépannage.

**Étape 1 : Installer Java (JRE 17 ou supérieur)**

OWASP ZAP nécessite Java Runtime Environment (JRE) version 17 minimum.

1. **Télécharger Java** :
   - Aller sur : https://www.oracle.com/java/technologies/downloads/#java17
   - Ou utiliser OpenJDK : https://adoptium.net/
   - Choisir **Windows x64 Installer** (64-bit)

2. **Installer Java** :
   - Exécuter le fichier d'installation téléchargé
   - Suivre l'assistant d'installation
   - Cocher "Add to PATH" si proposé

3. **Vérifier l'installation** :
   ```powershell
   java -version
   ```
   Vous devriez voir quelque chose comme :
   ```
   openjdk version "17.0.x" ...
   ```

**Étape 2 : Installer OWASP ZAP**

1. **Télécharger OWASP ZAP** :
   - Aller sur : https://www.zaproxy.org/download/
   - Choisir **Windows Installer** (version avec installateur)
   - Ou **Windows (Cross Platform)** si vous préférez la version portable

2. **Installer OWASP ZAP** :
   - Si vous avez téléchargé l'installateur Windows :
     - Exécuter le fichier `.exe`
     - Si vous voyez l'erreur "JRE non trouvé", cliquez sur **Localisation** et pointez vers votre installation Java
     - Suivre l'assistant d'installation
   - Si vous avez téléchargé la version portable :
     - Extraire le fichier ZIP
     - Lancer `zap.bat` dans le dossier extrait

**Alternative : Utiliser Docker (si Docker est installé)**

```bash
# Scan rapide avec Docker
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://votre-site.vercel.app

# Scan complet avec rapport
docker run -t -v $(pwd):/zap/wrk/:rw owasp/zap2docker-stable zap-full-scan.py -t https://votre-site.vercel.app -g gen.conf -r zap-report.html
```

#### Utilisation de OWASP ZAP

**Méthode 1 : Interface Graphique (Recommandée pour débutants)**

1. **Lancer OWASP ZAP**
   - Double-cliquer sur l'icône ZAP sur le bureau
   - Ou lancer depuis le menu Démarrer

2. **Premier lancement** :
   - ZAP vous demandera si vous voulez persister la session
   - Choisir **No, I do not want to persist this session** pour un test rapide
   - Cliquer sur **Start**

3. **Lancer un scan automatique** :
   - Dans l'onglet **Quick Start**
   - Entrer l'URL de votre site : `https://votre-site.vercel.app`
   - Cliquer sur **Automated Scan**
   - Cliquer sur **Attack**
   - Attendre la fin du scan (peut prendre plusieurs minutes)

4. **Analyser les résultats** :
   - Onglet **Alerts** : Liste des vulnérabilités trouvées
   - Onglet **Sites** : Arborescence du site scanné
   - Onglet **History** : Historique des requêtes

**Méthode 2 : Scan Baseline (Rapide, en ligne de commande)**

```powershell
# Depuis le dossier d'installation de ZAP
.\zap-cli.bat baseline -t https://votre-site.vercel.app
```

**Méthode 3 : Scan Complet (Plus approfondi)**

1. Dans ZAP, aller dans **Tools** > **Options** > **Active Scan**
2. Configurer les règles de scan
3. Clic droit sur votre site dans l'onglet **Sites**
4. Choisir **Attack** > **Active Scan**
5. Attendre la fin du scan

#### Points à vérifier dans les résultats :

- ✅ **Injection SQL** : Chercher les alertes "SQL Injection"
- ✅ **XSS (Cross-Site Scripting)** : Chercher "Cross Site Scripting"
- ✅ **CSRF (Cross-Site Request Forgery)** : Chercher "CSRF"
- ✅ **Headers de sécurité manquants** : Chercher "Missing Security Headers"
- ✅ **Secrets exposés** : Chercher "Information Disclosure"
- ✅ **Authentification faible** : Chercher "Weak Authentication"

#### Exporter le rapport

1. **Menu** > **Report** > **Generate HTML Report**
2. Choisir l'emplacement de sauvegarde
3. Le rapport contiendra toutes les vulnérabilités trouvées avec des recommandations

#### Points à vérifier :
- ✅ Injection SQL
- ✅ XSS (Cross-Site Scripting)
- ✅ CSRF (Cross-Site Request Forgery)
- ✅ Headers de sécurité manquants
- ✅ Secrets exposés

### 2. SSL Labs Test

Tester la configuration SSL/TLS de votre site :

```
https://www.ssllabs.com/ssltest/analyze.html?d=votre-site.vercel.app
```

**Objectif** : Obtenir un grade A ou A+

### 3. Security Headers Scanner

Vérifier les headers de sécurité HTTP :

```
https://securityheaders.com/?q=https://votre-site.vercel.app
```

**Objectif** : Obtenir un score A ou A+

### 4. Mozilla Observatory

Analyse complète de sécurité :

```
https://observatory.mozilla.org/analyze/votre-site.vercel.app
```

---

## 🔍 Tests Manuels

### 1. Vérification des Variables d'Environnement

#### ⚠️ Problème Identifié
Vos variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont exposées côté client.

#### Test
1. Ouvrir votre site dans le navigateur
2. Ouvrir les DevTools (F12)
3. Aller dans l'onglet **Sources** ou **Network**
4. Chercher dans le code source compilé les chaînes :
   - `VITE_SUPABASE_URL`
   - `supabase.co`
   - Clés API

#### ✅ Solution
- ✅ C'est normal pour `VITE_SUPABASE_ANON_KEY` (clé publique)
- ⚠️ Vérifier que vous n'utilisez pas la clé `service_role` (clé secrète)
- ✅ S'assurer que les RLS (Row Level Security) sont activées dans Supabase

### 2. Test d'Injection SQL

#### Via l'API
Tester les endpoints avec des payloads SQL :

```bash
# Test d'injection dans l'ID du tournoi
curl "https://votre-site.vercel.app/api/tournament/1' OR '1'='1/info"

# Test avec UNION
curl "https://votre-site.vercel.app/api/tournament/1' UNION SELECT * FROM users--/info"
```

**Résultat attendu** : Erreur 400 ou 404, pas de données sensibles

#### ✅ Protection
Supabase utilise des requêtes paramétrées, donc protégé contre l'injection SQL.

### 3. Test XSS (Cross-Site Scripting)

#### Test dans les champs de saisie
1. Créer un tournoi avec le nom : `<script>alert('XSS')</script>`
2. Vérifier que le script n'est pas exécuté
3. Vérifier que le contenu est échappé dans l'affichage

#### Test dans l'URL
```bash
curl "https://votre-site.vercel.app/api/tournament/<script>alert(1)</script>/info"
```

**Résultat attendu** : Erreur 400/404, pas d'exécution de script

### 4. Test CSRF (Cross-Site Request Forgery)

#### Test manuel
1. Créer un fichier HTML malveillant :
```html
<!DOCTYPE html>
<html>
<body>
  <form action="https://votre-site.vercel.app/api/tournament" method="POST">
    <input type="hidden" name="name" value="Tournoi Malveillant">
    <input type="submit" value="Cliquez ici">
  </form>
  <script>document.forms[0].submit();</script>
</body>
</html>
```

2. Ouvrir ce fichier dans un navigateur où vous êtes connecté
3. Vérifier que la requête est bloquée

#### ✅ Protection
- Votre API n'accepte que GET (pas de POST/PUT/DELETE)
- Supabase gère les tokens CSRF automatiquement

### 5. Test d'Accès Non Autorisé

#### Test d'accès aux données d'autres utilisateurs
1. Se connecter avec un compte utilisateur A
2. Noter l'ID d'un tournoi créé par l'utilisateur B
3. Essayer d'accéder à : `/api/tournament/{id-user-b}/info`
4. Vérifier que seules les données publiques sont accessibles

#### Test d'accès admin
1. Se connecter avec un compte non-admin
2. Essayer d'accéder à `/organizer/dashboard`
3. Vérifier la redirection vers `/auth`

---

## 🛡️ Vérification des Headers de Sécurité

### Test avec curl

```bash
curl -I https://votre-site.vercel.app
```

### Headers à vérifier

#### ✅ Headers Recommandés

1. **Content-Security-Policy (CSP)**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';
   ```

2. **X-Frame-Options**
   ```
   X-Frame-Options: DENY
   ```
   Empêche l'inclusion dans un iframe (protection contre clickjacking)

3. **X-Content-Type-Options**
   ```
   X-Content-Type-Options: nosniff
   ```
   Empêche le MIME-sniffing

4. **Referrer-Policy**
   ```
   Referrer-Policy: strict-origin-when-cross-origin
   ```

5. **Permissions-Policy**
   ```
   Permissions-Policy: geolocation=(), microphone=(), camera=()
   ```

### ⚠️ Configuration Vercel

Ajouter dans `vercel.json` :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🔐 Tests d'Authentification

### 1. Test de Force Brute

Tester la protection contre les attaques par force brute :

```bash
# Script de test (à utiliser avec précaution)
for i in {1..10}; do
  curl -X POST "https://votre-site.vercel.app/auth" \
    -d "email=test@example.com&password=wrong"
done
```

**Vérifier** :
- ✅ Rate limiting activé
- ✅ Compte bloqué après X tentatives
- ✅ CAPTCHA après plusieurs échecs

### 2. Test de Session

1. Se connecter
2. Copier le token de session
3. Se déconnecter
4. Essayer de réutiliser le token
5. Vérifier que le token est invalidé

### 3. Test de JWT

Si vous utilisez des JWT :
1. Décoder le token sur https://jwt.io
2. Vérifier que les données sensibles ne sont pas dans le token
3. Vérifier l'expiration du token

---

## 🌐 Tests d'API

### 1. Test CORS

Votre API autorise toutes les origines (`*`). C'est acceptable pour une API publique, mais à surveiller.

#### Test
```bash
# Depuis un autre domaine
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://votre-site.vercel.app/api/tournament/123/info
```

#### ✅ Recommandation
Pour une API publique, `*` est acceptable. Pour une API privée, restreindre aux domaines autorisés.

### 2. Test Rate Limiting

Votre backend a un rate limiting, mais l'API publique n'en a pas.

#### Test
```bash
# Envoyer 100 requêtes rapidement
for i in {1..100}; do
  curl "https://votre-site.vercel.app/api/tournament/123/info" &
done
wait
```

**Vérifier** :
- ✅ Le serveur répond toujours
- ⚠️ Considérer ajouter un rate limiting sur l'API publique

### 3. Test de Validation des Entrées

#### Test avec IDs invalides
```bash
# UUID invalide
curl "https://votre-site.vercel.app/api/tournament/invalid-id/info"

# ID avec caractères spéciaux
curl "https://votre-site.vercel.app/api/tournament/../../etc/passwd/info"

# ID très long
curl "https://votre-site.vercel.app/api/tournament/$(python -c 'print("a"*1000)')/info"
```

**Résultat attendu** : Erreur 400 ou 404

### 4. Test des Endpoints Non Documentés

Tester des endpoints qui n'existent pas :

```bash
curl "https://votre-site.vercel.app/api/tournament/123/admin"
curl "https://votre-site.vercel.app/api/tournament/123/delete"
curl "https://votre-site.vercel.app/api/admin/users"
```

**Résultat attendu** : Erreur 404, pas d'informations sensibles dans l'erreur

---

## 🗄️ Tests de Base de Données

### 1. Vérification RLS (Row Level Security)

#### Test dans Supabase
1. Aller dans Supabase Dashboard
2. **Authentication** > **Policies**
3. Vérifier que toutes les tables ont des politiques RLS activées

#### Test manuel
1. Se connecter avec un compte utilisateur A
2. Essayer de lire/modifier les données d'un autre utilisateur B
3. Vérifier que l'accès est refusé

#### Requête SQL de vérification
```sql
-- Vérifier que RLS est activé sur toutes les tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Vérifier les politiques existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 2. Test d'Injection via RLS

Même avec RLS, tester que les politiques sont bien écrites :

```sql
-- Dans Supabase SQL Editor, tester avec un utilisateur non-admin
SET ROLE authenticated;
SELECT * FROM tournaments WHERE id = '1' OR '1'='1';
```

**Résultat attendu** : Seulement les tournois accessibles à l'utilisateur

---

## 🧪 Outils Recommandés

### Outils en Ligne

1. **OWASP ZAP** : https://www.zaproxy.org/
2. **Burp Suite Community** : https://portswigger.net/burp/communitydownload
3. **SSL Labs** : https://www.ssllabs.com/ssltest/
4. **Security Headers** : https://securityheaders.com/
5. **Mozilla Observatory** : https://observatory.mozilla.org/
6. **Snyk** : https://snyk.io/ (scan des dépendances)

### Outils CLI

1. **nmap** : Scan de ports et services
   ```bash
   nmap -sV -sC votre-site.vercel.app
   ```

2. **nikto** : Scanner de vulnérabilités web
   ```bash
   nikto -h https://votre-site.vercel.app
   ```

3. **sqlmap** : Test d'injection SQL (à utiliser avec précaution)
   ```bash
   sqlmap -u "https://votre-site.vercel.app/api/tournament/1/info" --batch
   ```

### Extensions Navigateur

1. **OWASP ZAP Browser Extension**
2. **Wappalyzer** : Identifier les technologies utilisées
3. **Cookie Editor** : Manipuler les cookies
4. **ModHeader** : Modifier les headers HTTP

---

## ✅ Checklist de Sécurité

### Configuration

- [ ] Headers de sécurité configurés dans `vercel.json`
- [ ] Variables d'environnement sécurisées (pas de secrets côté client)
- [ ] CORS configuré correctement
- [ ] Rate limiting activé sur les endpoints critiques
- [ ] SSL/TLS configuré (A+ sur SSL Labs)

### Authentification & Autorisation

- [ ] RLS activé sur toutes les tables Supabase
- [ ] Politiques RLS testées et fonctionnelles
- [ ] Routes protégées vérifiées
- [ ] Tokens JWT sécurisés (expiration, signature)
- [ ] Protection contre le force brute

### API

- [ ] Validation des entrées sur tous les endpoints
- [ ] Gestion d'erreurs sans fuite d'informations
- [ ] Rate limiting sur l'API publique
- [ ] Documentation API à jour
- [ ] Endpoints non documentés retournent 404

### Code

- [ ] Pas de secrets dans le code source
- [ ] Dépendances à jour (pas de vulnérabilités connues)
- [ ] XSS protégé (échappement des données)
- [ ] Injection SQL protégée (requêtes paramétrées)
- [ ] CSRF protégé

### Monitoring

- [ ] Logs d'erreurs configurés (Sentry)
- [ ] Alertes de sécurité configurées
- [ ] Monitoring des tentatives d'accès suspectes

---

## 🚨 Actions Immédiates Recommandées

### 1. Ajouter les Headers de Sécurité

Mettre à jour `vercel.json` avec les headers recommandés (voir section ci-dessus).

### 2. Vérifier les RLS

Exécuter dans Supabase SQL Editor :
```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 3. Scanner les Dépendances

```bash
npm audit
npm audit fix
```

### 4. Configurer Rate Limiting sur l'API

Considérer ajouter un rate limiting sur les endpoints API publics.

### 5. Test Automatisé Régulier

Configurer des scans de sécurité réguliers (hebdomadaire ou mensuel).

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

---

## ⚠️ Avertissement

**Important** : Ne testez que sur votre propre site. Tester la sécurité de sites tiers sans autorisation est illégal.

Utilisez ces outils de manière responsable et éthique.

