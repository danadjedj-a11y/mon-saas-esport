import clsx from 'clsx';

/**
 * Composant LoadingSpinner
 * Sizes: sm, md, lg, xl
 * Variants: primary, secondary
 */
const LoadingSpinner = ({
  size = 'md',
  variant = 'primary',
  className = '',
  fullScreen = false,
  message = '',
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const variantStyles = {
    primary: 'border-fluky-primary/30 border-t-fluky-primary',
    secondary: 'border-fluky-secondary/30 border-t-fluky-secondary',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={clsx(
          'border-solid rounded-full animate-spin',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
      />
      {message && (
        <p className="font-body text-sm text-fluky-text/70">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-fluky-bg/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
