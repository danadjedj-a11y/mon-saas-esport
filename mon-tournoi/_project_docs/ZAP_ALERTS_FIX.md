# 🔧 Guide de Correction des Alertes OWASP ZAP

Ce guide vous aide à corriger les 14 alertes trouvées par OWASP ZAP sur votre site.

## 📊 Résumé des Alertes

Vous avez **14 alertes** détectées :
- **10 alertes** de priorité moyenne/haute (orange/jaune)
- **4 alertes** informatives (bleu)

---

## 🚨 Alertes à Corriger en Priorité

### 1. Strict-Transport-Security Header Not Set

**Problème** : Le header HSTS (HTTP Strict Transport Security) n'est pas configuré.

**Impact** : Les navigateurs ne forcent pas HTTPS, ce qui peut permettre des attaques man-in-the-middle.

**Solution** : Ajouter le header dans `vercel.json` :

```json
{
  "key": "Strict-Transport-Security",
  "value": "max-age=31536000; includeSubDomains; preload"
}
```

### 2. X-Content-Type-Options Header Missing

**Problème** : Le header `X-Content-Type-Options: nosniff` est manquant.

**Impact** : Les navigateurs peuvent interpréter incorrectement le type MIME des fichiers.

**Solution** : Déjà ajouté dans `vercel.json`, mais vérifier qu'il est bien déployé.

### 3. CSP: script-src unsafe-inline / unsafe-eval

**Problème** : La Content Security Policy autorise `unsafe-inline` et `unsafe-eval` dans script-src.

**Impact** : Permet l'exécution de scripts inline, ce qui réduit la protection contre XSS.

**Solution** : Améliorer la CSP en retirant `unsafe-inline` et `unsafe-eval` si possible.

**Note** : Si votre application React nécessite `unsafe-inline` (pour les styles inline), vous pouvez le garder temporairement mais c'est une faiblesse de sécurité.

### 4. CSP: style-src unsafe-inline

**Problème** : La CSP autorise les styles inline.

**Impact** : Permet l'injection de styles malveillants.

**Solution** : Utiliser des nonces ou hashes pour les styles inline si nécessaire.

### 5. CSP: Wildcard Directive

**Problème** : Une directive CSP utilise un wildcard (`*`) trop permissif.

**Impact** : Permet de charger des ressources depuis n'importe quel domaine.

**Solution** : Restreindre les directives CSP aux domaines spécifiques nécessaires.

### 6. CSP: Failure to Define Directive with No Fallback

**Problème** : Une directive CSP n'a pas de fallback défini.

**Impact** : Si la directive principale échoue, il n'y a pas de mécanisme de secours.

**Solution** : Ajouter `'self'` comme fallback dans toutes les directives.

### 7. Mauvaise configuration inter-domaines

**Problème** : Configuration CORS trop permissive ou incorrecte.

**Impact** : Permet à des sites malveillants d'accéder à vos ressources.

**Solution** : Restreindre CORS aux domaines autorisés uniquement.

### 8. Sub Resource Integrity Attribute Missing

**Problème** : Les ressources externes (CDN) n'ont pas d'attribut `integrity`.

**Impact** : Risque que des ressources externes soient modifiées.

**Solution** : Ajouter l'attribut `integrity` aux balises `<script>` et `<link>` externes.

---

## 🔧 Corrections à Apporter

### Étape 1 : Mettre à jour `vercel.json`

Mettre à jour votre fichier `vercel.json` avec cette configuration améliorée :

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
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
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

**Changements principaux** :
- ✅ Ajout de `Strict-Transport-Security`
- ✅ Amélioration de la CSP avec `base-uri` et `form-action`
- ✅ Ajout de `frame-ancestors 'none'` dans la CSP

### Étape 2 : Améliorer la CSP (Optionnel mais Recommandé)

Pour une sécurité maximale, vous pouvez créer une CSP plus stricte. Cependant, cela peut casser certaines fonctionnalités de React.

**CSP Stricte (à tester)** :

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://*.supabase.co; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests;"
}
```

**⚠️ Attention** : Cette CSP stricte peut casser votre application si elle utilise :
- Des scripts inline (React nécessite souvent `unsafe-inline`)
- Des styles inline
- Des évaluations dynamiques (`eval()`)

**Test progressif** :
1. Commencer avec la CSP actuelle (avec `unsafe-inline`)
2. Tester votre application
3. Si tout fonctionne, retirer progressivement `unsafe-inline` et `unsafe-eval`

### Étape 3 : Ajouter Subresource Integrity (SRI)

Si vous utilisez des CDN externes, ajouter l'attribut `integrity` :

**Exemple pour React** :

```html
<script 
  src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

**Générer un hash SRI** :
- Utiliser : https://www.srihash.org/
- Ou en ligne de commande : `openssl dgst -sha384 -binary fichier.js | openssl base64 -A`

### Étape 4 : Corriger la Configuration CORS

Pour l'API publique, vous pouvez restreindre CORS si vous connaissez les domaines autorisés :

```json
{
  "source": "/api/(.*)",
  "headers": [
    {
      "key": "Access-Control-Allow-Origin",
      "value": "https://votre-domaine-autorise.com"
    }
  ]
}
```

**Note** : Pour une API publique, `*` est acceptable, mais restreindre est plus sécurisé.

---

## 📋 Alertes Informatives (Priorité Basse)

### 1. Timestamp Disclosure - Unix

**Problème** : Des timestamps Unix sont exposés dans les réponses.

**Impact** : Faible - peut révéler des informations sur le système.

**Solution** : Pas critique, mais vous pouvez masquer les timestamps dans les réponses API si nécessaire.

### 2. Information Disclosure - Suspicious Comments

**Problème** : Des commentaires dans le code source peuvent révéler des informations.

**Impact** : Faible - les commentaires sont visibles dans le code source compilé.

**Solution** : Vérifier que les commentaires de développement ne contiennent pas de secrets.

### 3. Re-examine Cache-control Directives

**Problème** : Les directives de cache peuvent être améliorées.

**Impact** : Faible - concerne l'optimisation et la sécurité du cache.

**Solution** : Ajouter des headers de cache appropriés :

```json
{
  "key": "Cache-Control",
  "value": "public, max-age=3600, must-revalidate"
}
```

### 4. Modern Web Application / Retrieved from Cache

**Impact** : Informations uniquement - votre application est détectée comme moderne.

**Solution** : Aucune action requise.

---

## ✅ Checklist de Correction

- [ ] Ajouter `Strict-Transport-Security` dans `vercel.json`
- [ ] Vérifier que `X-Content-Type-Options` est présent
- [ ] Améliorer la CSP (ajouter `base-uri`, `form-action`)
- [ ] Tester l'application après les changements
- [ ] (Optionnel) Retirer `unsafe-inline` de la CSP si possible
- [ ] (Optionnel) Ajouter SRI aux ressources externes
- [ ] (Optionnel) Restreindre CORS aux domaines autorisés
- [ ] Redéployer sur Vercel
- [ ] Relancer un scan ZAP pour vérifier les corrections

---

## 🚀 Déploiement

Après avoir modifié `vercel.json` :

1. **Commit les changements** :
   ```bash
   git add vercel.json
   git commit -m "fix: améliorer les headers de sécurité"
   git push
   ```

2. **Vercel déploiera automatiquement**

3. **Vérifier** :
   ```powershell
   .\test-security.ps1 https://votre-site.vercel.app
   ```

4. **Relancer ZAP** :
   - Nouveau scan automatique
   - Vérifier que les alertes ont diminué

---

## 📊 Résultats Attendus

Après les corrections, vous devriez voir :

- ✅ **Strict-Transport-Security Header Not Set** → Résolu
- ✅ **X-Content-Type-Options Header Missing** → Résolu
- ⚠️ **CSP: unsafe-inline/unsafe-eval** → Peut rester si nécessaire pour React
- ⚠️ **CSP: Wildcard Directive** → Amélioré avec des domaines spécifiques
- ⚠️ **Mauvaise configuration inter-domaines** → Amélioré si CORS restreint
- ℹ️ **Alertes informatives** → Peuvent rester (priorité basse)

---

## 🔍 Vérification Post-Correction

### Test Rapide

```powershell
# Vérifier les headers
curl -I https://votre-site.vercel.app

# Vérifier HSTS
curl -I https://votre-site.vercel.app | findstr "Strict-Transport-Security"
```

### Test Complet

1. Relancer OWASP ZAP
2. Comparer le nombre d'alertes avant/après
3. Vérifier que les alertes critiques sont résolues

---

## 📚 Ressources

- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Preload](https://hstspreload.org/)

---

## ⚠️ Notes Importantes

1. **CSP et React** : React nécessite souvent `unsafe-inline` pour les styles. C'est acceptable pour une application React, mais idéalement, utilisez des nonces.

2. **CORS Public** : Pour une API publique, `Access-Control-Allow-Origin: *` est acceptable. Restreindre est plus sécurisé mais limite l'utilisation.

3. **Tests Progressifs** : Testez chaque changement progressivement pour éviter de casser votre application.

4. **Priorités** : Corrigez d'abord les alertes critiques (HSTS, X-Content-Type-Options), puis les moyennes (CSP), puis les informatives.

