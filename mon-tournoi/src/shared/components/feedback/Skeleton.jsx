import React from 'react';
import clsx from 'clsx';

/**
 * Composant Skeleton pour les états de chargement
 * Variants: text, circular, rectangular
 */
const Skeleton = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  ...props
}) => {
  const baseStyles = 'animate-pulse bg-white/10 rounded';

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return (
    <div
      className={clsx(baseStyles, variantStyles[variant], className)}
      style={style}
      {...props}
    />
  );
};

/**
 * Composant pour un skeleton de card
 */
export const CardSkeleton = () => (
  <div className="bg-[#030913]/60 border border-white/5 rounded-xl p-6 space-y-4">
    <Skeleton variant="rectangular" width="60%" height={24} />
    <Skeleton variant="text" width="100%" />
    <Skeleton variant="text" width="80%" />
    <div className="flex gap-2 mt-4">
      <Skeleton variant="rectangular" width={100} height={36} />
      <Skeleton variant="rectangular" width={100} height={36} />
    </div>
  </div>
);

/**
 * Composant pour un skeleton de ligne de texte
 */
export const TextSkeleton = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
        height={16}
      />
    ))}
  </div>
);

/**
 * Composant pour un skeleton d'avatar
 */
export const AvatarSkeleton = ({ size = 'md' }) => {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  return (
    <Skeleton
      variant="circular"
      width={sizes[size] || sizes.md}
      height={sizes[size] || sizes.md}
    />
  );
};

export default Skeleton;
