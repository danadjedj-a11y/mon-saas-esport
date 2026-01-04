// Configuration i18n pour l'internationalisation

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des traductions
import fr from './locales/fr.json';
import en from './locales/en.json';

i18n
  // Détection automatique de la langue du navigateur
  .use(LanguageDetector)
  // Passe i18n à react-i18next
  .use(initReactI18next)
  // Initialisation
  .init({
    // Langues disponibles
    resources: {
      fr: {
        translation: fr
      },
      en: {
        translation: en
      }
    },
    // Langue par défaut
    fallbackLng: 'fr',
    // Langue de secours si la traduction n'existe pas
    lng: 'fr',
    // Debug (désactiver en production)
    debug: false,
    // Options de détection
    detection: {
      // Ordre de détection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Clé de stockage
      lookupLocalStorage: 'i18nextLng',
      // Mettre en cache
      caches: ['localStorage']
    },
    // Options d'interpolation
    interpolation: {
      escapeValue: false // React échappe déjà les valeurs
    },
    // Options React
    react: {
      useSuspense: false
    }
  });

export default i18n;

