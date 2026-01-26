# 🤝 Guide de Contribution - Mon-Tournoi

Merci de votre intérêt pour contribuer à Mon-Tournoi !

---

## 📋 Table des matières

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Standards de Code](#standards-de-code)
- [Conventions de Commit](#conventions-de-commit)
- [Process de Review](#process-de-review)

---

## 📜 Code de Conduite

- Soyez respectueux et constructif
- Pas de discrimination ni de harcèlement
- Focus sur le code, pas sur les personnes

---

## 🚀 Comment Contribuer

### 1. Signaler un bug

Ouvrez une issue avec :
- Description claire du problème
- Étapes pour reproduire
- Comportement attendu vs observé
- Screenshots si applicable
- Environnement (navigateur, OS)

### 2. Proposer une feature

1. Vérifiez que l'issue n'existe pas déjà
2. Ouvrez une issue avec tag `enhancement`
3. Décrivez le use case et la solution proposée
4. Attendez validation avant de coder

### 3. Soumettre du code

```bash
# 1. Fork le repo
# 2. Clone votre fork
git clone https://github.com/VOTRE-USER/mon-tournoi.git

# 3. Créer une branche
git checkout -b feature/ma-feature

# 4. Faire vos changements
# 5. Tester
npm test

# 6. Commit (voir conventions ci-dessous)
git commit -m "feat: ajout de la feature X"

# 7. Push
git push origin feature/ma-feature

# 8. Ouvrir une Pull Request
```

---

## 📐 Standards de Code

### Structure des fichiers

```
src/components/MonComposant/
├── MonComposant.jsx      # Composant principal
├── MonComposant.test.jsx # Tests
├── index.js              # Export
└── styles.css            # Styles (si nécessaire)
```

### Naming Conventions

| Type | Convention | Exemple |
|------|------------|---------|
| Composants | PascalCase | `TournamentCard.jsx` |
| Hooks | camelCase + use | `useTournament.js` |
| Utils | camelCase | `formatDate.js` |
| Types | PascalCase | `Tournament.ts` |
| Constantes | UPPER_SNAKE_CASE | `MAX_PARTICIPANTS` |

### Best Practices

```jsx
// ✅ Bon
function TournamentCard({ tournament, onSelect }) {
  const handleClick = useCallback(() => {
    onSelect(tournament.id);
  }, [tournament.id, onSelect]);

  return (
    <div onClick={handleClick}>
      {tournament.name}
    </div>
  );
}

// ❌ Éviter
function tournamentCard(props) {
  return <div onClick={() => props.onSelect(props.tournament.id)}>
    {props.tournament.name}
  </div>
}
```

### Tests

- Minimum 1 test par fonction utilitaire
- Tester les cas edge
- Utiliser des noms descriptifs

```javascript
// ✅ Bon
it('returns null when match is not decided yet', () => {
  // ...
});

// ❌ À éviter
it('works correctly', () => {
  // ...
});
```

---

## 💬 Conventions de Commit

Format : `type(scope): description`

### Types

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement logique) |
| `refactor` | Refactoring (pas de nouvelle feature ni fix) |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance, dépendances |

### Exemples

```bash
feat(swiss): add buchholz tiebreaker calculation
fix(bracket): prevent duplicate match generation
docs(readme): update installation instructions
test(utils): add matchGenerator edge cases
refactor(tournament): extract bracket logic to hook
```

### Scope optionnels

- `tournament` - Logique tournoi
- `match` - Matchs et scoring
- `swiss` - Système suisse
- `bracket` - Brackets et visualisation
- `auth` - Authentification
- `ui` - Composants UI génériques
- `api` - Services API

---

## 🔍 Process de Review

1. **Automated checks** : Lint + Tests doivent passer
2. **Code review** : Au moins 1 approbation requise
3. **No conflicts** : Merge avec main sans conflits
4. **Squash merge** : Commits squashés à la fusion

### Checklist PR

- [ ] Tests ajoutés/modifiés si nécessaire
- [ ] Documentation à jour
- [ ] Pas de console.log oubliés
- [ ] Lint sans erreurs
- [ ] Commits suivent les conventions

---

## 🙏 Merci !

Vos contributions améliorent Mon-Tournoi pour toute la communauté eSport !
