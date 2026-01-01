# 🌐 Interface Publique pour Spectateurs

## Description

L'**Interface Publique** permet aux visiteurs non connectés de consulter les tournois, les brackets, les classements et les résultats en temps réel, sans nécessiter d'authentification.

## Fonctionnalités

### Accès Public

- **URL publique** : `/tournament/:id/public`
- **Accès sans authentification** : Les spectateurs peuvent voir toutes les informations publiques du tournoi
- **Temps réel** : Mises à jour automatiques des scores, classements et résultats
- **Design épuré** : Interface optimisée pour la consultation

### Onglets Disponibles

1. **📋 Présentation**
   - Informations générales du tournoi
   - Jeu, format, date de début
   - Nombre d'équipes inscrites
   - Progression du tournoi (barre de progression)

2. **👥 Participants**
   - Liste de toutes les équipes inscrites
   - Logos et tags des équipes
   - Seeding (si configuré)
   - Vue en grille responsive

3. **🏆 Arbre / Classement**
   - **Format Elimination** : Affichage de l'arbre complet avec scores
   - **Format Round Robin** : Tableau de classement avec points, victoires, matchs nuls, défaites
   - Mise en évidence du vainqueur
   - Scores en temps réel

4. **📊 Résultats**
   - Liste complète de tous les matchs terminés
   - Scores finaux
   - Vainqueurs identifiés
   - Triés par round et numéro de match

## Utilisation

### Pour l'organisateur

1. **Obtenir le lien public** :
   - Ouvrir un tournoi
   - Cliquer sur le bouton **"🔗 Lien Public"** dans le header
   - Le lien est automatiquement copié dans le presse-papier

2. **Partager le lien** :
   - Partager l'URL avec les spectateurs
   - Le lien fonctionne sans authentification
   - Les spectateurs voient les mises à jour en temps réel

### Pour les spectateurs

1. **Accéder au tournoi** :
   - Ouvrir le lien public partagé
   - Aucune connexion requise
   - Navigation libre entre les onglets

2. **Suivre le tournoi** :
   - Consulter les informations dans chaque onglet
   - Les scores se mettent à jour automatiquement
   - Voir la progression en temps réel

## Design

- **Thème dark** : Design gaming/esport cohérent
- **Responsive** : Compatible mobile, tablette et desktop
- **Temps réel** : Mises à jour instantanées via Supabase Realtime
- **Animations** : Transitions fluides entre les onglets
- **Accessibilité** : Interface claire et intuitive

## Sécurité

- **Lecture seule** : Les spectateurs ne peuvent que consulter, pas modifier
- **Données publiques uniquement** : Seules les informations publiques sont affichées
- **Pas d'accès admin** : Aucune fonctionnalité d'administration disponible
- **RLS respecté** : Les règles de sécurité Supabase sont toujours appliquées

## Technique

### Architecture

- **Composant séparé** : `PublicTournament.jsx` dédié à la vue publique
- **Route publique** : `/tournament/:id/public` accessible sans auth
- **Realtime** : Abonnement aux changements des tables `matches`, `participants`, `tournaments`
- **Réutilisation de logique** : Partage de certaines fonctions avec `Tournament.jsx`

### Données affichées

- Informations du tournoi (nom, jeu, format, statut, date)
- Liste des participants avec logos
- Matchs avec scores
- Classement (pour Round Robin)
- Arbre d'élimination (pour Elimination)
- Résultats détaillés

## Cas d'usage

✅ **Streaming** : Partage du lien sur un stream pour que les viewers suivent le tournoi  
✅ **Réseaux sociaux** : Partage sur Twitter, Discord, etc.  
✅ **Site web** : Intégration dans un site web externe via iframe  
✅ **Mobile** : Consultation facile sur mobile sans application  
✅ **Archives** : Consultation des tournois terminés

## Améliorations futures

- 🔒 Option de rendre un tournoi privé (désactiver la vue publique)
- 🔗 URL courte/custom pour les tournois
- 📱 Mode plein écran optimisé pour mobile
- 📊 Statistiques avancées (graphiques, historiques)
- 🌍 Partage social intégré (Twitter, Facebook)



