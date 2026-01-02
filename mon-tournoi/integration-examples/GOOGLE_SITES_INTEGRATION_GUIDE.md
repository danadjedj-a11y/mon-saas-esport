# 📘 Guide d'Intégration sur Google Sites

Ce guide vous explique comment intégrer les données de votre tournoi sur un site Google Sites.

---

## 🎯 Méthode 1 : Code Embed Direct (Recommandé)

### Étape 1 : Préparer le code

1. Ouvrez le fichier `google-sites-embed-code.html`
2. Modifiez la section `CONFIG` avec vos informations :

```javascript
const CONFIG = {
    // URL de votre API en production
    API_BASE_URL: 'https://votre-domaine.com/api/tournament',
    
    // ID du tournoi à afficher
    TOURNAMENT_ID: '65acf74c-ec4d-4527-9291-51de5b67ca13',
    
    // URL de votre site de tournoi
    TOURNAMENT_URL: 'https://votre-domaine.com/tournament',
};
```

### Étape 2 : Ajouter sur Google Sites

1. **Ouvrir Google Sites** et créer/éditer une page
2. Cliquer sur **"Insérer"** dans la barre d'outils
3. Sélectionner **"Embed"** (Intégrer) ou **"Code"**
4. **Coller le code** du fichier `google-sites-embed-code.html`
5. Cliquer sur **"Insérer"** ou **"Mettre à jour"**

### Résultat

Le widget s'affichera sur votre page Google Sites avec :
- ✅ Nom du tournoi
- ✅ Jeu
- ✅ Statut (En cours, Terminé, etc.)
- ✅ Statistiques (Participants, Matchs, Terminés)
- ✅ Lien vers le bracket complet

---

## 🎯 Méthode 2 : Iframe (Alternative)

Si le code direct ne fonctionne pas (problèmes de sécurité CORS), utilisez un iframe :

### Étape 1 : Héberger la page HTML

1. Téléchargez le fichier `google-sites-integration.html`
2. Modifiez la section `CONFIG` avec vos informations
3. Hébergez le fichier sur un serveur web (GitHub Pages, Netlify, Vercel, etc.)

**Exemple avec GitHub Pages** :
- Créez un repository GitHub
- Uploadez le fichier HTML
- Activez GitHub Pages dans les paramètres
- Votre fichier sera accessible via : `https://votre-username.github.io/votre-repo/google-sites-integration.html`

### Étape 2 : Ajouter l'iframe sur Google Sites

1. Dans Google Sites, cliquer sur **"Insérer"** > **"Embed"**
2. Entrer l'URL de votre page HTML hébergée
3. Ajuster la largeur et la hauteur (ex: 700px × 400px)
4. Cliquer sur **"Insérer"**

---

## 🔧 Configuration Avancée

### Changer le Style

Vous pouvez modifier les styles CSS dans le code pour personnaliser l'apparence :

```css
/* Exemple : Changer la couleur de fond */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Peut devenir : */
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
```

### Ajouter Plus d'Informations

Vous pouvez modifier la fonction `renderTournament()` pour afficher plus d'informations, comme :
- Le format du tournoi (Single Elimination, Double, Swiss, etc.)
- Les dates de début/fin
- Le nombre de rounds
- etc.

### Mise à Jour Automatique

Les données sont rechargées à chaque visite de la page. Pour un rafraîchissement automatique, ajoutez :

```javascript
// Rafraîchir toutes les 30 secondes
setInterval(init, 30000);
```

---

## 🌐 URL de Production

**Important** : Pour utiliser l'API en production, vous devez :

1. **Déployer votre application** (Vercel, Netlify, etc.)
2. **Remplacer les URLs** dans la configuration :
   - `http://localhost:5173` → `https://votre-domaine.com`
3. **Vérifier CORS** : S'assurer que votre API accepte les requêtes depuis Google Sites

### Configuration CORS dans votre API

Dans `server/api.js`, le CORS est déjà configuré :

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

Cela permet les requêtes depuis n'importe quel domaine, y compris Google Sites.

---

## 🐛 Dépannage

### Le widget ne s'affiche pas

1. Vérifiez que l'ID du tournoi est correct
2. Vérifiez que l'URL de l'API est correcte
3. Ouvrez la console du navigateur (F12) pour voir les erreurs
4. Vérifiez que votre API est accessible depuis l'extérieur

### Erreur CORS

Si vous voyez une erreur CORS dans la console :
- Vérifiez que `Access-Control-Allow-Origin: *` est présent dans les headers
- Vérifiez que votre API est accessible publiquement

### Les données ne se mettent pas à jour

- Les données sont rechargées à chaque visite de la page
- Pour un rafraîchissement automatique, ajoutez `setInterval()` comme indiqué plus haut

---

## 📝 Exemple d'Utilisation

### Widget Simple (Statistiques)

Le code fourni affiche les statistiques de base. Pour un widget plus complet, vous pouvez :

1. Afficher le bracket complet (nécessite plus de code)
2. Afficher le classement actuel
3. Afficher les prochains matchs
4. etc.

---

## 🎨 Personnalisation du Design

Le widget utilise un design moderne avec :
- Dégradé de couleurs (violet/bleu)
- Cartes de statistiques
- Responsive design
- Animations au survol

Vous pouvez facilement personnaliser les couleurs, polices, et styles en modifiant le CSS dans le code.

---

## ✅ Checklist

Avant de publier sur Google Sites :

- [ ] URLs de production configurées (pas localhost)
- [ ] ID du tournoi correct
- [ ] API accessible publiquement
- [ ] CORS configuré correctement
- [ ] Test du widget sur une page de test
- [ ] Vérification sur mobile/tablette

---

## 🚀 Prochaines Étapes

Une fois intégré, vous pouvez :
- Ajouter plusieurs widgets (un par tournoi)
- Créer une page dédiée aux tournois
- Partager le lien Google Sites avec votre communauté
- Intégrer dans d'autres plateformes (WordPress, Wix, etc.)

