import React from 'react';
import clsx from 'clsx';

/**
 * Composant Input réutilisable
 * Variants: default, error
 * Sizes: sm, md, lg
 */
const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  errorMessage = '',
  label,
  required = false,
  size = 'md',
  fullWidth = true,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-lg border bg-background/50 text-fluky-text placeholder:text-fluky-text/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const errorStyles = error 
    ? 'border-red-500 focus:ring-red-500' 
    : 'border-white/10 focus:ring-fluky-primary';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-fluky-text mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={clsx(
          baseStyles,
          errorStyles,
          sizeStyles[size],
          widthStyles,
          className
        )}
        {...props}
      />
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      )}
    </div>
  );
};

export default Input;
