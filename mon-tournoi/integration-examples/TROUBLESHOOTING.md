# 🔧 Dépannage - Intégration Google Sites

## Problèmes Courants et Solutions

### ❌ Le widget ne s'affiche pas / Page blanche

**Cause possible :** Erreur JavaScript ou problème de chargement

**Solution :**
1. Ouvrir la console du navigateur (F12)
2. Vérifier les erreurs dans l'onglet "Console"
3. Vérifier l'onglet "Network" pour voir si les requêtes API fonctionnent

---

### ❌ Erreur CORS (Cross-Origin Resource Sharing)

**Symptômes :**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution :**
- Vérifier que votre API retourne les headers CORS corrects
- Vérifier que `Access-Control-Allow-Origin: *` est présent
- Si déployé sur Vercel, vérifier la configuration CORS

---

### ❌ Erreur 404 - API non trouvée

**Symptômes :**
```
Failed to fetch
GET .../api/tournament/.../info 404 (Not Found)
```

**Solutions :**
1. Vérifier que l'URL de l'API est correcte dans la configuration
2. Vérifier que le chemin `/api/tournament/{id}/info` est accessible
3. Tester l'URL directement dans le navigateur :
   ```
   https://votre-domaine.vercel.app/api/tournament/{ID}/info
   ```

---

### ❌ Erreur 500 - Erreur serveur

**Symptômes :**
```
GET .../api/tournament/.../info 500 (Internal Server Error)
```

**Solutions :**
1. Vérifier les logs Vercel pour voir l'erreur détaillée
2. Vérifier que les variables d'environnement sont configurées sur Vercel
3. Vérifier que Supabase est accessible

---

### ❌ Le widget s'affiche mais reste sur "Chargement..."

**Cause :** L'API ne répond pas ou retourne une erreur

**Solutions :**
1. Vérifier que l'ID du tournoi est correct
2. Vérifier que l'API fonctionne en testant l'URL directement
3. Ouvrir la console pour voir les erreurs

---

### ❌ Variables d'environnement non configurées sur Vercel

**Symptômes :** Erreur "Supabase non configuré"

**Solution :**
1. Aller sur Vercel Dashboard
2. Sélectionner votre projet
3. Aller dans "Settings" > "Environment Variables"
4. Ajouter :
   - `VITE_SUPABASE_URL` = votre URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = votre clé anonyme Supabase
5. Redéployer

---

### ❌ Le code embed ne fonctionne pas sur Google Sites

**Solution Alternative :**
Si le code embed direct ne fonctionne pas, utilisez un iframe :

1. Héberger le fichier `google-sites-integration.html` sur un serveur
2. Utiliser l'URL dans un iframe sur Google Sites

**Ou utiliser Google Apps Script :**
1. Créer un script Google Apps Script
2. Utiliser `UrlFetchApp.fetch()` pour récupérer les données
3. Retourner le HTML

---

## 🔍 Vérifications à Faire

### Checklist :

- [ ] L'URL de l'API est correcte (pas localhost)
- [ ] L'ID du tournoi est correct
- [ ] L'API est accessible publiquement
- [ ] CORS est configuré correctement
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Pas d'erreurs dans la console du navigateur
- [ ] L'API retourne du JSON valide quand testée directement

---

## 🧪 Test de l'API

Pour tester si votre API fonctionne :

1. Ouvrir cette URL dans le navigateur :
   ```
   https://votre-domaine.vercel.app/api/tournament/{ID}/info
   ```

2. Vous devriez voir du JSON

3. Si vous voyez une erreur, noter le message d'erreur

---

## 📞 Besoin d'Aide ?

Si le problème persiste, fournir :
1. Message d'erreur complet de la console
2. URL de votre API
3. Screenshot de ce qui s'affiche
4. Logs Vercel (si disponible)

