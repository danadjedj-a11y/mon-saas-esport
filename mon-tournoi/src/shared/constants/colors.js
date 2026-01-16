/**
 * Design System - Couleurs
 * Neon Glass Design System - Glassmorphism avec accents néon
 */

export const colors = {
  // Couleurs principales (Neon Glass)
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // Violet principal
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  
  secondary: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4', // Cyan secondaire
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
  },
  
  accent: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899', // Pink accent
    600: '#DB2777',
    700: '#BE185D',
    800: '#9D174D',
    900: '#831843',
  },
  
  // Couleurs de fond (Dark mode)
  background: {
    primary: '#0A0A0F', // Noir profond
    secondary: '#12121A',
    tertiary: '#1A1A2E',
    card: 'rgba(255, 255, 255, 0.05)', // Glass effect
    glass: 'rgba(255, 255, 255, 0.08)',
    hover: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Couleurs de texte
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF', // gray-400
    tertiary: '#6B7280', // gray-500
    disabled: '#4B5563', // gray-600
    inverse: '#0A0A0F',
  },
  
  // États
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Emerald
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Red
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Amber
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Blue
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Couleurs néon (glow effects)
  neon: {
    violet: '#8B5CF6',
    cyan: '#06B6D4',
    pink: '#EC4899',
    green: '#10B981',
    amber: '#F59E0B',
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
    secondary: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    accent: 'linear-gradient(135deg, #06B6D4 0%, #10B981 100%)',
    dark: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
  },
  
  // Overlays & transparence (glassmorphism)
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    glass: 'rgba(255, 255, 255, 0.08)',
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.75)',
  },
  
  // Bordures glass
  border: {
    glass: 'rgba(255, 255, 255, 0.1)',
    glassHover: 'rgba(139, 92, 246, 0.5)',
    violet: 'rgba(139, 92, 246, 0.3)',
    cyan: 'rgba(6, 182, 212, 0.3)',
  },
};

export default colors;
