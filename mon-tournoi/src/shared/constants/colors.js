/**
 * Design System - Couleurs
 * Système de couleurs cohérent pour toute l'application
 */

export const colors = {
  // Couleurs principales
  primary: {
    50: '#FFE8F5',
    100: '#FFD1EB',
    200: '#FFA3D7',
    300: '#FF75C3',
    400: '#FF47AF',
    500: '#FF36A3', // Fluky Secondary
    600: '#CC2B82',
    700: '#992062',
    800: '#661641',
    900: '#330B21',
  },
  
  secondary: {
    50: '#FFE5E8',
    100: '#FFCCD1',
    200: '#FF99A3',
    300: '#FF6675',
    400: '#FF3347',
    500: '#C10468', // Fluky Primary
    600: '#9A0353',
    700: '#74023E',
    800: '#4D022A',
    900: '#270115',
  },
  
  // Couleurs de fond
  background: {
    primary: '#030913', // Fluky BG
    secondary: '#0A1628',
    tertiary: '#152238',
    card: '#1a1a1a',
    hover: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Couleurs de texte
  text: {
    primary: '#F8F6F2', // Fluky Text
    secondary: '#B8B6B2',
    tertiary: '#888886',
    disabled: '#5A5A58',
    inverse: '#030913',
  },
  
  // États
  success: {
    50: '#E6F7E6',
    100: '#CCEFCC',
    200: '#99DF99',
    300: '#66CF66',
    400: '#33BF33',
    500: '#2ECC71',
    600: '#25A35A',
    700: '#1C7A44',
    800: '#13522D',
    900: '#0A2917',
  },
  
  error: {
    50: '#FCE8E8',
    100: '#F9D1D1',
    200: '#F3A3A3',
    300: '#ED7575',
    400: '#E74747',
    500: '#E74C3C',
    600: '#B93D30',
    700: '#8B2E24',
    800: '#5C1E18',
    900: '#2E0F0C',
  },
  
  warning: {
    50: '#FEF5E7',
    100: '#FCEBCF',
    200: '#F9D79F',
    300: '#F7C36F',
    400: '#F4AF3F',
    500: '#F1C40F',
    600: '#C19C0C',
    700: '#917509',
    800: '#604E06',
    900: '#302703',
  },
  
  info: {
    50: '#E8F4FD',
    100: '#D1E9FB',
    200: '#A3D3F7',
    300: '#75BDF3',
    400: '#47A7EF',
    500: '#3498DB',
    600: '#2A7AAF',
    700: '#1F5B83',
    800: '#153D58',
    900: '#0A1E2C',
  },
  
  // Couleurs spécifiques gaming
  neon: {
    pink: '#FF36A3',
    blue: '#00D4FF',
    purple: '#8E44AD',
    green: '#00FF88',
    orange: '#E7632C',
  },
  
  // Overlays & transparence
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.75)',
  },
};

export default colors;
