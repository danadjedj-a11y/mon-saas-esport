import clsx from 'clsx';

/**
 * Composant Badge réutilisable
 * Variants: primary, secondary, success, error, warning, info
 * Sizes: sm, md, lg
 */
const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200';
  
  const variantStyles = {
    primary: 'bg-fluky-primary text-white',
    secondary: 'bg-fluky-secondary text-white',
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-gray-900',
    info: 'bg-blue-500 text-white',
    outline: 'border-2 border-fluky-primary text-fluky-primary bg-transparent',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
