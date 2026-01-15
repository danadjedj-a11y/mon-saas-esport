import React, { useState } from 'react';

/**
 * Composant d'image optimisé avec lazy loading et placeholder
 * @param {Object} props - Propriétés du composant
 * @param {string} props.src - URL de l'image
 * @param {string} props.alt - Texte alternatif
 * @param {string} [props.fallback] - URL de l'image de fallback (générée automatiquement si absent)
 * @param {string} [props.name] - Nom pour générer l'avatar fallback automatique
 * @param {string} [props.className] - Classes CSS
 * @param {Object} [props.style] - Styles inline
 * @param {number} [props.size] - Taille de l'image (width=height)
 * @param {boolean} [props.rounded] - Si true, applique border-radius: 50%
 */
const LazyImage = ({ 
  src, 
  alt = '', 
  fallback,
  name = 'User',
  className = '', 
  style = {},
  size,
  rounded = false,
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Générer le fallback automatiquement si pas fourni
  const defaultFallback = fallback || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;

  // Style combiné
  const combinedStyle = {
    ...style,
    ...(size && { width: `${size}px`, height: `${size}px` }),
    ...(rounded && { borderRadius: '50%' }),
    objectFit: 'cover',
    transition: 'opacity 0.2s ease-in-out',
    opacity: loaded ? 1 : 0.5,
    backgroundColor: '#374151', // Placeholder color
  };

  return (
    <img
      src={error || !src ? defaultFallback : src}
      alt={alt}
      className={className}
      style={combinedStyle}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setError(true);
        setLoaded(true);
      }}
      {...props}
    />
  );
};

export default LazyImage;
