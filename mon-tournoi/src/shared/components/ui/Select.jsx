import React from 'react';
import clsx from 'clsx';

/**
 * Composant Select réutilisable
 * Variants: default, error
 * Sizes: sm, md, lg
 */
const Select = ({
  value,
  onChange,
  options = [],
  disabled = false,
  error = false,
  errorMessage = '',
  label,
  required = false,
  size = 'md',
  fullWidth = true,
  placeholder,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-lg border bg-white/5 text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer';
  
  const errorStyles = error 
    ? 'border-red-500 focus:ring-red-500' 
    : 'border-white/10 focus:ring-violet-500';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
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
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => {
          if (typeof option === 'string') {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          }
          return (
            <option key={option.value} value={String(option.value)} disabled={option.disabled}>
              {option.label}
            </option>
          );
        })}
      </select>
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      )}
    </div>
  );
};

export default Select;
