import { useState, useEffect } from 'react';

/**
 * Hook pour debouncer une valeur
 * Utile pour les champs de recherche
 * 
 * @param {any} value - Valeur à debouncer
 * @param {number} delay - Délai en ms (default: 500)
 * @returns {any} - Valeur debouncée
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
