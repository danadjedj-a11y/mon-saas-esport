# Guide PWA - Fluky Boys

## 📋 Vue d'ensemble

Fluky Boys est configuré comme une **Progressive Web App (PWA)** pour offrir une expérience native sur mobile et desktop.

## ✨ Fonctionnalités PWA

- ✅ **Installable** : Peut être installée sur l'appareil
- ✅ **Hors-ligne** : Fonctionne partiellement sans connexion
- ✅ **Manifest** : Configuration pour l'installation
- ✅ **Service Worker** : Cache des ressources pour performance

## 📱 Installation

### Sur Mobile

1. Ouvrir le site dans le navigateur
2. Menu du navigateur → "Ajouter à l'écran d'accueil"
3. L'application sera installée comme une app native

### Sur Desktop

1. Ouvrir le site dans Chrome/Edge
2. Cliquer sur l'icône d'installation dans la barre d'adresse
3. Confirmer l'installation

## 🔧 Configuration

### Manifest (`public/manifest.json`)

- **Nom** : Fluky Boys - Plateforme de Tournois E-Sport
- **Couleur de thème** : #C10468 (Rose Fluky Boys)
- **Couleur de fond** : #030913 (Bleu nuit)
- **Icônes** : 192x192 et 512x512 (à créer)

### Service Worker (`public/sw.js`)

- **Stratégie** : Network First, puis Cache
- **Cache** : Pages statiques et ressources
- **Hors-ligne** : Page d'accueil disponible hors-ligne

## 🎨 Icônes Requises

Créer les fichiers suivants dans `public/` :

- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

**Recommandations** :
- Format PNG avec transparence
- Design conforme à la charte graphique Fluky Boys
- Couleurs principales : #C10468, #FF36A3, #030913

## 🚀 Déploiement

Le Service Worker est automatiquement enregistré au chargement de l'application.

Pour tester en local :
```bash
npm run build
npm run preview
```

## 📝 Raccourcis

Le manifest inclut des raccourcis :
- **Créer un tournoi** : `/create-tournament`
- **Tableau de bord** : `/player/dashboard`

## 🔍 Vérification

### Chrome DevTools

1. Ouvrir DevTools (F12)
2. Onglet "Application"
3. Vérifier :
   - **Manifest** : Présent et valide
   - **Service Workers** : Enregistré et actif
   - **Cache Storage** : Ressources mises en cache

### Lighthouse

1. Ouvrir DevTools → Onglet "Lighthouse"
2. Cocher "Progressive Web App"
3. Lancer l'audit
4. Vérifier le score PWA (objectif : 90+)

## 🐛 Dépannage

### Service Worker ne se charge pas

- Vérifier que le fichier `sw.js` est dans `public/`
- Vérifier la console pour les erreurs
- Vider le cache du navigateur

### Manifest non détecté

- Vérifier que `manifest.json` est dans `public/`
- Vérifier le lien dans `index.html`
- Vérifier la validité du JSON

### Icônes manquantes

- Créer les fichiers `icon-192.png` et `icon-512.png`
- Placer dans `public/`
- Vérifier les chemins dans `manifest.json`

## 📚 Ressources

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

