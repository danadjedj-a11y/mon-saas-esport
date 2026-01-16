import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

/**
 * Composant Dropdown réutilisable
 */
const Dropdown = ({
  trigger,
  children,
  align = 'left',
  className = '',
  closeOnClick = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const alignStyles = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div
            className={clsx(
              'absolute top-full mt-2 z-50 min-w-[200px]',
              'glass-card border-violet-500/30 shadow-xl',
              'animate-scaleIn',
              alignStyles[align],
              className
            )}
            onClick={() => closeOnClick && setIsOpen(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Composant DropdownItem pour les items du menu
 */
export const DropdownItem = ({
  children,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={(e) => {
        if (!disabled && onClick) {
          onClick(e);
        }
      }}
      disabled={disabled}
      className={clsx(
        'w-full px-4 py-2 text-left font-body text-sm',
        'text-gray-300 hover:bg-white/5 hover:text-cyan-400',
        'transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Composant DropdownDivider pour séparer les items
 */
export const DropdownDivider = () => (
  <div className="border-t border-white/10 my-1" />
);

/**
 * Composant DropdownHeader pour un header dans le menu
 */
export const DropdownHeader = ({ children, className = '' }) => (
  <div
    className={clsx(
      'px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider',
      className
    )}
  >
    {children}
  </div>
);

export default Dropdown;
