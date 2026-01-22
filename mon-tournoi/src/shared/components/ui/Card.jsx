import React from 'react';
import clsx from 'clsx';

/**
 * Composant Card réutilisable pour afficher du contenu dans un conteneur stylisé
 * 
 * @component
 * @example
 * // Card par défaut
 * <Card>
 *   <h3>Titre</h3>
 *   <p>Contenu de la card</p>
 * </Card>
 * 
 * @example
 * // Card glass avec hover effect
 * <Card variant="glass" hover padding="lg">
 *   <TournamentInfo />
 * </Card>
 * 
 * @example
 * // Card cliquable
 * <Card clickable onClick={() => navigate('/details')}>
 *   Cliquez pour voir plus
 * </Card>
 * 
 * @param {Object} props - Props du composant
 * @param {React.ReactNode} props.children - Contenu de la card
 * @param {'default'|'elevated'|'outlined'|'glass'} [props.variant='default'] - Style visuel
 * @param {'none'|'sm'|'md'|'lg'|'xl'} [props.padding='md'] - Padding interne
 * @param {boolean} [props.hover=false] - Active l'effet au survol
 * @param {boolean} [props.clickable=false] - Affiche un curseur pointer
 * @param {Function} [props.onClick] - Callback au clic (implique clickable)
 * @param {string} [props.className] - Classes CSS additionnelles
 * @returns {JSX.Element}
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-lg transition-all duration-200';
  
  const variantStyles = {
    default: 'bg-[#1a1a1a] border border-white/5',
    elevated: 'bg-[#1a1a1a] shadow-xl',
    outlined: 'bg-transparent border-2 border-violet-500/30',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10',
  };
  
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };
  
  const hoverStyles = hover ? 'hover:shadow-xl hover:shadow-violet-500/20 hover:border-violet-500/50 hover:-translate-y-1' : '';
  
  const clickableStyles = clickable || onClick ? 'cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles,
        clickableStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
