import React from 'react';
import clsx from 'clsx';

/**
 * Composant Button réutilisable avec variants et tailles configurables
 * 
 * @component
 * @example
 * // Primary button (default)
 * <Button onClick={handleClick}>Valider</Button>
 * 
 * @example
 * // Danger button avec loading
 * <Button variant="danger" loading={isDeleting}>Supprimer</Button>
 * 
 * @example
 * // Outline button full width
 * <Button variant="outline" fullWidth>S'inscrire</Button>
 * 
 * @param {Object} props - Props du composant
 * @param {React.ReactNode} props.children - Contenu du bouton
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'} [props.variant='primary'] - Style visuel
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Taille du bouton
 * @param {boolean} [props.disabled=false] - Désactive le bouton
 * @param {boolean} [props.loading=false] - Affiche un spinner de chargement
 * @param {boolean} [props.fullWidth=false] - Bouton en pleine largeur
 * @param {Function} [props.onClick] - Callback au clic
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Type HTML du bouton
 * @param {string} [props.className] - Classes CSS additionnelles
 * @returns {JSX.Element}
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/50 focus:ring-violet-500',
    secondary: 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500',
    outline: 'border-2 border-violet-500 text-violet-400 hover:bg-violet-600 hover:text-white focus:ring-violet-500',
    ghost: 'text-white hover:bg-white/5 hover:text-cyan-400 focus:ring-cyan-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyles,
        className
      )}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
