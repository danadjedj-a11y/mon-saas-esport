# 🐛 Debug de l'API sur Google Sites

## Erreur "JSON.parse: unexpected character"

Cette erreur signifie que l'API ne retourne pas du JSON valide.

## 🔍 Vérifications

### 1. Tester l'API directement dans le navigateur

Ouvrez cette URL dans votre navigateur :
```
https://mon-saas-esport.vercel.app/api/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/info
```

**Ce que vous devriez voir :**
- ✅ Du JSON formaté (pas de HTML)
- ✅ Headers `Content-Type: application/json`

**Si vous voyez :**
- ❌ Une page HTML (404, erreur, etc.)
- ❌ Du texte brut qui n'est pas du JSON
- ❌ Une erreur 500

→ L'API ne fonctionne pas correctement sur Vercel

### 2. Vérifier les logs Vercel

1. Allez sur Vercel Dashboard
2. Sélectionnez votre projet
3. Allez dans "Deployments"
4. Cliquez sur le dernier déploiement
5. Allez dans l'onglet "Functions"
6. Vérifiez les logs pour voir les erreurs

### 3. Vérifier la structure du fichier API

Le fichier doit être à :
```
api/tournament/[id]/[endpoint].js
```

Vérifiez que :
- Le dossier `api` existe
- Le dossier `tournament` existe
- Le dossier `[id]` existe (avec les crochets)
- Le fichier `[endpoint].js` existe (avec les crochets)

### 4. Vérifier les variables d'environnement

Sur Vercel :
- Settings > Environment Variables
- Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définis
- Redéployez après modification

## 🔧 Solutions

### Solution 1 : Vérifier que la fonction Serverless existe

Si l'URL retourne 404, c'est que Vercel n'a pas détecté la fonction.

**Vérifiez :**
1. Le fichier est bien commit et push sur GitHub
2. Vercel a bien redéployé
3. Le nom du fichier est exactement `[endpoint].js` (avec les crochets)

### Solution 2 : Vérifier les logs Vercel

Les logs Vercel vous diront exactement quelle erreur se produit dans la fonction.

### Solution 3 : Test local de l'API

Si vous voulez tester localement, vous pouvez utiliser `vercel dev` :
```bash
npm install -g vercel
vercel dev
```

## 📝 Test Rapide

Collez cette URL dans votre navigateur :
```
https://mon-saas-esport.vercel.app/api/tournament/65acf74c-ec4d-4527-9291-51de5b67ca13/info
```

Si vous voyez du JSON → L'API fonctionne ✅
Si vous voyez une erreur → Vérifiez les logs Vercel ❌

