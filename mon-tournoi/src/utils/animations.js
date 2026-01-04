// Utilitaires pour les animations et transitions

/**
 * Animation de fade-in
 */
export const fadeIn = {
  animation: 'fadeIn 0.3s ease-in',
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 }
  }
};

/**
 * Animation de slide-up
 */
export const slideUp = {
  animation: 'slideUp 0.4s ease-out',
  '@keyframes slideUp': {
    from: { 
      opacity: 0,
      transform: 'translateY(20px)'
    },
    to: { 
      opacity: 1,
      transform: 'translateY(0)'
    }
  }
};

/**
 * Animation de scale-in
 */
export const scaleIn = {
  animation: 'scaleIn 0.3s ease-out',
  '@keyframes scaleIn': {
    from: { 
      opacity: 0,
      transform: 'scale(0.9)'
    },
    to: { 
      opacity: 1,
      transform: 'scale(1)'
    }
  }
};

/**
 * Animation de pulse pour les notifications
 */
export const pulse = {
  animation: 'pulse 2s ease-in-out infinite',
  '@keyframes pulse': {
    '0%, 100%': { 
      transform: 'scale(1)',
      opacity: 1
    },
    '50%': { 
      transform: 'scale(1.05)',
      opacity: 0.9
    }
  }
};

/**
 * Animation de shake pour les erreurs
 */
export const shake = {
  animation: 'shake 0.5s ease-in-out',
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
  }
};

/**
 * Styles de transition réutilisables
 */
export const transitions = {
  default: 'all 0.3s ease',
  fast: 'all 0.15s ease',
  slow: 'all 0.5s ease',
  hover: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
};

/**
 * Effet hover pour les cartes
 */
export const cardHover = {
  transition: transitions.hover,
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 24px rgba(255, 54, 163, 0.4)'
  }
};

/**
 * Effet de focus pour les inputs
 */
export const inputFocus = {
  transition: transitions.default,
  '&:focus': {
    borderColor: '#FF36A3',
    boxShadow: '0 0 0 3px rgba(255, 54, 163, 0.2)',
    outline: 'none'
  }
};

