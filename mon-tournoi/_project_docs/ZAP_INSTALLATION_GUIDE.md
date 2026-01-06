# 🛡️ Guide d'Installation OWASP ZAP sur Windows

Ce guide vous aide à installer OWASP ZAP sur Windows, en résolvant le problème de Java Runtime Environment (JRE).

## ⚠️ Problème : "JRE non trouvé"

Si vous voyez cette erreur lors de l'installation de ZAP :
> "L'assistant install4j n'a pu localiser aucun Java(TM) Runtime Environment sur votre système."

Cela signifie que Java n'est pas installé ou n'est pas détecté.

---

## 📥 Étape 1 : Installer Java (JRE 17+)

### Option A : Oracle JDK (Recommandé)

1. **Télécharger** :
   - Aller sur : https://www.oracle.com/java/technologies/downloads/#java17
   - Choisir **Windows x64 Installer** (fichier `.msi`)

2. **Installer** :
   - Double-cliquer sur le fichier téléchargé
   - Suivre l'assistant d'installation
   - **Important** : Cocher "Add to PATH" si proposé
   - Cliquer sur **Install**

3. **Vérifier** :
   ```powershell
   java -version
   ```
   Vous devriez voir :
   ```
   java version "17.0.x" ...
   ```

### Option B : OpenJDK (Alternative gratuite)

1. **Télécharger** :
   - Aller sur : https://adoptium.net/
   - Choisir **Temurin 17 (LTS)**
   - Sélectionner **Windows x64**
   - Télécharger le fichier `.msi`

2. **Installer** :
   - Même processus que l'option A
   - Cocher "Add to PATH" lors de l'installation

### Option C : Installation manuelle (Si les options A et B ne fonctionnent pas)

1. **Télécharger** :
   - Télécharger le JDK 17 depuis Oracle ou Adoptium
   - Choisir la version **ZIP** (pas l'installateur)

2. **Extraire** :
   - Extraire dans `C:\Program Files\Java\`
   - Renommer le dossier en `jdk-17`

3. **Configurer le PATH** :
   - Ouvrir **Paramètres Windows** > **Système** > **Variables d'environnement**
   - Dans **Variables système**, trouver `Path`
   - Cliquer sur **Modifier**
   - Ajouter : `C:\Program Files\Java\jdk-17\bin`
   - Cliquer sur **OK** partout

4. **Vérifier** :
   - Ouvrir un nouveau PowerShell
   - Taper : `java -version`

---

## 📥 Étape 2 : Installer OWASP ZAP

### Méthode 1 : Installateur Windows (Recommandé)

1. **Télécharger** :
   - Aller sur : https://www.zaproxy.org/download/
   - Choisir **Windows Installer** (fichier `.exe`)

2. **Installer** :
   - Double-cliquer sur le fichier téléchargé
   - Si vous voyez l'erreur "JRE non trouvé" :
     - Cliquer sur **Localisation**
     - Naviguer vers votre installation Java
     - Sélectionner le dossier `bin` (ex: `C:\Program Files\Java\jdk-17\bin`)
     - Cliquer sur **OK**
   - Suivre l'assistant d'installation
   - Choisir l'emplacement d'installation (par défaut : `C:\Program Files\OWASP\Zed Attack Proxy`)

3. **Lancer ZAP** :
   - Chercher "ZAP" dans le menu Démarrer
   - Ou double-cliquer sur l'icône sur le bureau

### Méthode 2 : Version Portable (Alternative)

1. **Télécharger** :
   - Aller sur : https://www.zaproxy.org/download/
   - Choisir **Windows (Cross Platform)** (fichier `.zip`)

2. **Extraire** :
   - Extraire le ZIP dans un dossier (ex: `C:\Tools\ZAP`)
   - Pas besoin d'installer, juste extraire

3. **Lancer** :
   - Aller dans le dossier extrait
   - Double-cliquer sur `zap.bat`
   - Si Java n'est pas trouvé, modifier `zap.bat` pour pointer vers votre Java

---

## ✅ Vérification de l'Installation

### Vérifier Java

```powershell
java -version
```

**Résultat attendu** :
```
openjdk version "17.0.x" ...
```

### Vérifier ZAP

1. Lancer OWASP ZAP
2. Vous devriez voir l'interface principale
3. Si vous voyez une erreur Java, vérifiez que Java 17+ est bien installé

---

## 🚀 Première Utilisation

### Configuration Initiale

1. **Lancer ZAP** pour la première fois
2. **Dialogue de session** :
   - Choisir **No, I do not want to persist this session** (pour un test rapide)
   - Ou **Yes, I want to persist this session** (pour sauvegarder votre travail)
3. Cliquer sur **Start**

### Lancer un Scan Rapide

1. Dans l'onglet **Quick Start**
2. Entrer l'URL de votre site : `https://votre-site.vercel.app`
3. Cliquer sur **Automated Scan**
4. Cliquer sur **Attack**
5. Attendre la fin du scan (2-10 minutes selon la taille du site)

### Analyser les Résultats

1. **Onglet Alerts** : Liste des vulnérabilités trouvées
   - Rouge = Haute priorité
   - Orange = Moyenne priorité
   - Jaune = Basse priorité

2. **Onglet Sites** : Arborescence du site scanné

3. **Onglet History** : Toutes les requêtes HTTP effectuées

### Exporter un Rapport

1. **Menu** > **Report** > **Generate HTML Report**
2. Choisir l'emplacement de sauvegarde
3. Le rapport contiendra :
   - Liste des vulnérabilités
   - Description de chaque problème
   - Recommandations de correction

---

## 🔧 Dépannage

### Problème : "Java n'est pas reconnu"

**Solution** :
1. Vérifier que Java est installé : `java -version`
2. Si erreur, réinstaller Java et cocher "Add to PATH"
3. Redémarrer PowerShell après l'installation

### Problème : "ZAP ne démarre pas"

**Solution** :
1. Vérifier que Java 17+ est installé
2. Essayer de lancer ZAP depuis la ligne de commande :
   ```powershell
   cd "C:\Program Files\OWASP\Zed Attack Proxy"
   .\zap.bat
   ```
3. Vérifier les logs d'erreur dans la console

### Problème : "ZAP est lent"

**Solution** :
- Réduire la portée du scan
- Utiliser "Quick Start" au lieu de "Full Scan"
- Augmenter la mémoire allouée à Java (dans `zap.bat`)

### Problème : "Port déjà utilisé"

**Solution** :
- ZAP utilise le port 8080 par défaut
- Si occupé, changer le port dans **Tools** > **Options** > **Local Proxy**

---

## 📚 Ressources

- **Documentation ZAP** : https://www.zaproxy.org/docs/
- **Guide utilisateur** : https://www.zaproxy.org/docs/desktop/
- **Support** : https://groups.google.com/group/zaproxy-users

---

## 💡 Astuces

1. **Premier scan** : Utilisez "Quick Start" pour un test rapide
2. **Scan approfondi** : Utilisez "Active Scan" pour une analyse complète
3. **Sauvegarder** : Persistez votre session pour reprendre plus tard
4. **Rapports** : Exportez toujours un rapport HTML pour documentation

---

## ⚠️ Avertissement

**Important** : Ne testez que votre propre site ou des sites pour lesquels vous avez l'autorisation explicite. Tester la sécurité de sites tiers sans autorisation est illégal.

