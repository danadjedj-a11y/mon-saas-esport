import React from 'react';

/**
 * Composant Skeleton pour les états de chargement
 * Remplace les simples "Chargement..." par des placeholders animés
 */
export default function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  count = 1,
  circle = false,
  style = {}
}) {
  const baseStyle = {
    background: 'linear-gradient(90deg, rgba(193, 4, 104, 0.1) 25%, rgba(255, 54, 163, 0.2) 50%, rgba(193, 4, 104, 0.1) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s ease-in-out infinite',
    borderRadius: circle ? '50%' : '8px',
    width: width || (variant === 'text' ? '100%' : variant === 'avatar' ? '40px' : '100%'),
    height: height || (variant === 'text' ? '1rem' : variant === 'avatar' ? '40px' : '200px'),
    ...style
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      style={{
        ...baseStyle,
        marginBottom: i < count - 1 ? '10px' : '0'
      }}
    />
  ));

  return (
    <>
      {skeletons}
      <style>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </>
  );
}

/**
 * Skeleton pour une carte de tournoi
 */
export function TournamentCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(3, 9, 19, 0.95)',
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid #C10468',
      boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
    }}>
      <Skeleton variant="text" height="24px" width="60%" style={{ marginBottom: '15px' }} />
      <Skeleton variant="text" height="16px" width="40%" style={{ marginBottom: '20px' }} />
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <Skeleton variant="text" height="16px" width="80px" />
        <Skeleton variant="text" height="16px" width="100px" />
      </div>
      <Skeleton variant="text" height="14px" count={2} />
    </div>
  );
}

/**
 * Skeleton pour une liste de commentaires
 */
export function CommentSkeleton() {
  return (
    <div style={{
      background: 'rgba(3, 9, 19, 0.8)',
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid #C10468',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
        <Skeleton variant="avatar" circle />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" height="16px" width="120px" style={{ marginBottom: '8px' }} />
          <Skeleton variant="text" height="12px" width="80px" />
        </div>
      </div>
      <Skeleton variant="text" height="14px" count={3} />
    </div>
  );
}

/**
 * Skeleton pour un tableau
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '15px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid #FF36A3' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height="20px" />
        ))}
      </div>
      {/* Lignes */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '15px', marginBottom: '15px' }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
}

