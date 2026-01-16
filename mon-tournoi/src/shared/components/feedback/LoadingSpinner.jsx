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
    primary: 'border-violet-500/30 border-t-violet-500',
    secondary: 'border-cyan-500/30 border-t-cyan-500',
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
        <p className="font-body text-sm text-gray-400">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
