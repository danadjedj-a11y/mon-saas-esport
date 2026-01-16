import React from 'react';

/**
 * Composant d'étoiles pour les notes
 * @param {number} rating - Note actuelle (0-5)
 * @param {number} hoveredRating - Étoile survolée (pour preview)
 * @param {function} onRate - Callback quand on clique sur une étoile
 * @param {function} onHover - Callback au survol
 * @param {function} onLeave - Callback quand on quitte le survol
 * @param {boolean} readOnly - Si true, désactive les interactions
 * @param {string} size - Taille des étoiles ('sm', 'md', 'lg')
 */
export default function StarRating({
  rating = 0,
  hoveredRating = 0,
  onRate,
  onHover,
  onLeave,
  readOnly = false,
  size = 'md'
}) {
  const sizeClasses = {
    sm: 'text-base gap-0.5',
    md: 'text-2xl gap-1',
    lg: 'text-3xl gap-2'
  };

  return (
    <div className={`flex ${sizeClasses[size] || sizeClasses.md}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hoveredRating >= star || rating >= star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readOnly && onRate && onRate(star)}
            onMouseEnter={() => !readOnly && onHover && onHover(star)}
            onMouseLeave={() => !readOnly && onLeave && onLeave()}
            disabled={readOnly}
            className={`bg-transparent border-none p-0 transition-transform duration-200 ${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <span className={isActive ? 'text-accent drop-shadow-[0_0_8px_#F8EC54]' : 'text-primary'}>
              ⭐
            </span>
          </button>
        );
      })}
    </div>
  );
}
