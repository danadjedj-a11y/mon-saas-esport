import { useState, useEffect, useRef } from 'react';

/**
 * OptimizedImage component with lazy loading, error handling, and fallbacks
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} [props.fallback] - Fallback image or emoji
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Inline styles
 * @param {boolean} [props.eager] - Load immediately (above fold)
 * @param {string} [props.sizes] - Responsive sizes hint
 */
export function OptimizedImage({
    src,
    alt,
    fallback = '📷',
    className = '',
    style = {},
    eager = false,
    sizes,
    ...props
}) {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        // Reset state when src changes
        setError(false);
        setLoaded(false);
    }, [src]);

    if (!src || error) {
        // Show fallback
        if (typeof fallback === 'string' && fallback.length <= 2) {
            // Emoji fallback
            return (
                <span
                    className={`inline-flex items-center justify-center ${className}`}
                    style={style}
                    role="img"
                    aria-label={alt || 'Image placeholder'}
                >
                    {fallback}
                </span>
            );
        }

        // Image fallback (could be a default avatar, etc.)
        return (
            <img
                src={fallback}
                alt={alt}
                className={className}
                style={style}
                loading="lazy"
                {...props}
            />
        );
    }

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt || ''}
            className={`${className} ${!loaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
            style={style}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            sizes={sizes}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            {...props}
        />
    );
}

/**
 * Avatar image with circular styling and fallback
 */
export function Avatar({
    src,
    name,
    size = 'md',
    className = '',
    ...props
}) {
    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
    };

    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    if (!src) {
        return (
            <div
                className={`rounded-full bg-gray-600 flex items-center justify-center text-gray-300 ${sizeClasses[size]} ${className}`}
                role="img"
                aria-label={name || 'Avatar'}
            >
                {initials}
            </div>
        );
    }

    return (
        <OptimizedImage
            src={src}
            alt={name || 'Avatar'}
            fallback={initials}
            className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
            {...props}
        />
    );
}

/**
 * Team/Tournament logo with proper fallbacks
 */
export function Logo({
    src,
    name,
    size = 'md',
    className = '',
    ...props
}) {
    const sizeClasses = {
        xs: 'w-5 h-5',
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    return (
        <OptimizedImage
            src={src}
            alt={name ? `${name} logo` : 'Logo'}
            fallback="🎮"
            className={`rounded-lg object-cover ${sizeClasses[size]} ${className}`}
            {...props}
        />
    );
}

export default OptimizedImage;
