# Guide des Tests - Fluky Boys

## 📋 Vue d'ensemble

Ce projet utilise **Jest** et **React Testing Library** pour les tests automatisés.

## 🚀 Commandes

```bash
# Lancer tous les tests
npm test

# Lancer les tests en mode watch
npm run test:watch

# Lancer les tests avec couverture de code
npm run test:coverage
```

## 📁 Structure des Tests

Les tests sont organisés dans des dossiers `__tests__` à côté des fichiers sources :

```
src/
  components/
    __tests__/
      Skeleton.test.jsx
      EmptyState.test.jsx
      LanguageSelector.test.jsx
  utils/
    __tests__/
      toast.test.js
```

## ✅ Tests Implémentés

### Composants

- **Skeleton** : Tests pour les composants de chargement skeleton
- **EmptyState** : Tests pour les états vides
- **LanguageSelector** : Tests pour le sélecteur de langue

### Utilitaires

- **toast** : Tests pour le système de notifications toast

## 🎯 Objectifs de Couverture

- **Branches** : 50%
- **Fonctions** : 50%
- **Lignes** : 50%
- **Statements** : 50%

## 📝 Écrire de Nouveaux Tests

### Exemple de Test de Composant

```jsx
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Exemple de Test Utilitaire

```js
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  test('returns expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

## 🔧 Configuration

- **Jest** : Configuration dans `jest.config.js`
- **Babel** : Configuration dans `babel.config.js`
- **Setup** : Configuration globale dans `src/setupTests.js`

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

