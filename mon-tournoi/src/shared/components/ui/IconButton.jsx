import { forwardRef } from 'react';

/**
 * IconButton - Accessible button with icon
 * 
 * Ensures all icon-only buttons have proper ARIA labels for accessibility.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon element
 * @param {string} props.label - Accessible label (required!)
 * @param {string} [props.variant] - Button variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * @param {string} [props.size] - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} [props.disabled] - Disabled state
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 */
export const IconButton = forwardRef(function IconButton(
    {
        icon,
        label,
        variant = 'ghost',
        size = 'md',
        disabled = false,
        onClick,
        className = '',
        type = 'button',
        ...props
    },
    ref
) {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
        ghost: 'text-gray-400 hover:text-white hover:bg-gray-700',
        danger: 'text-red-400 hover:text-white hover:bg-red-600',
    };

    const sizeClasses = {
        sm: 'p-1.5 text-sm',
        md: 'p-2',
        lg: 'p-3 text-lg',
    };

    return (
        <button
            ref={ref}
            type={type}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            title={label}
            {...props}
        >
            {icon}
        </button>
    );
});

/**
 * CloseButton - Common close button pattern
 */
export function CloseButton({ onClose, label = 'Fermer', ...props }) {
    return (
        <IconButton
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            }
            label={label}
            variant="ghost"
            onClick={onClose}
            {...props}
        />
    );
}

/**
 * MenuButton - Hamburger menu button
 */
export function MenuButton({ onClick, isOpen = false, label = 'Menu', ...props }) {
    return (
        <IconButton
            icon={
                isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )
            }
            label={label}
            variant="ghost"
            onClick={onClick}
            aria-expanded={isOpen}
            {...props}
        />
    );
}

/**
 * RefreshButton - Refresh/reload button
 */
export function RefreshButton({ onClick, loading = false, label = 'Actualiser', ...props }) {
    return (
        <IconButton
            icon={
                <svg
                    className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            }
            label={label}
            variant="ghost"
            onClick={onClick}
            disabled={loading}
            {...props}
        />
    );
}

/**
 * EditButton - Edit/pencil button
 */
export function EditButton({ onClick, label = 'Modifier', ...props }) {
    return (
        <IconButton
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                </svg>
            }
            label={label}
            variant="ghost"
            onClick={onClick}
            {...props}
        />
    );
}

/**
 * DeleteButton - Delete/trash button
 */
export function DeleteButton({ onClick, label = 'Supprimer', ...props }) {
    return (
        <IconButton
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
            }
            label={label}
            variant="danger"
            onClick={onClick}
            {...props}
        />
    );
}

export default IconButton;
