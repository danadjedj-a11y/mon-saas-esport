import clsx from 'clsx';

/**
 * Composant Avatar réutilisable
 * Sizes: xs, sm, md, lg, xl
 */
const Avatar = ({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const statusIndicatorSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  };

  // Générer initiales du nom
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={clsx('relative inline-block', className)} {...props}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={clsx(
            'rounded-full object-cover border-2 border-fluky-primary',
            sizeStyles[size]
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full bg-gradient-to-br from-fluky-primary to-fluky-secondary flex items-center justify-center text-white font-semibold border-2 border-fluky-primary',
            sizeStyles[size]
          )}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}

      {/* Status Indicator */}
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-fluky-bg',
            statusIndicatorSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
