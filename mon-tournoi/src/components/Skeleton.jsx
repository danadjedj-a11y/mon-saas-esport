import React from 'react';

/**
 * Composant Skeleton pour les états de chargement
 * Design System: Neon Glass
 */
export default function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  count = 1,
  circle = false,
  className = ''
}) {
  const getSize = () => {
    switch (variant) {
      case 'avatar':
        return { width: width || '40px', height: height || '40px' };
      case 'card':
        return { width: width || '100%', height: height || '200px' };
      case 'text':
      default:
        return { width: width || '100%', height: height || '1rem' };
    }
  };

  const size = getSize();

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton ${className}`}
      style={{
        width: size.width,
        height: size.height,
        borderRadius: circle ? '50%' : variant === 'avatar' ? '12px' : '8px',
        marginBottom: i < count - 1 ? '10px' : '0'
      }}
    />
  ));

  return <>{skeletons}</>;
}

/**
 * Skeleton pour une carte de tournoi
 */
export function TournamentCardSkeleton() {
  return (
    <div className="bg-dark-50 border border-glass-border rounded-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex-1">
          <Skeleton variant="text" height="24px" width="70%" className="mb-3" />
          <div className="flex gap-3">
            <Skeleton variant="text" height="16px" width="80px" />
            <Skeleton variant="text" height="16px" width="100px" />
          </div>
        </div>
        <Skeleton variant="text" height="28px" width="100px" className="rounded-md" />
      </div>
      
      {/* Divider */}
      <div className="h-px bg-glass-border my-4" />
      
      {/* Footer */}
      <div className="flex justify-between items-center">
        <Skeleton variant="text" height="14px" width="120px" />
        <Skeleton variant="text" height="36px" width="130px" className="rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton pour une liste de commentaires
 */
export function CommentSkeleton() {
  return (
    <div className="bg-dark-50 border border-glass-border rounded-xl p-5 mb-4">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton variant="avatar" width="44px" height="44px" className="rounded-xl" />
        <div className="flex-1">
          <Skeleton variant="text" height="16px" width="120px" className="mb-2" />
          <Skeleton variant="text" height="12px" width="80px" />
        </div>
      </div>
      <Skeleton variant="text" height="14px" count={2} />
    </div>
  );
}

/**
 * Skeleton pour un tableau
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-dark-50 border border-glass-border rounded-xl overflow-hidden">
      {/* En-tête */}
      <div 
        className="grid gap-4 p-4 bg-dark-100 border-b border-glass-border"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height="18px" />
        ))}
      </div>
      {/* Lignes */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="grid gap-4 p-4 border-b border-glass-border last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton pour une carte de statistique
 */
export function StatCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton variant="text" height="40px" width="40px" className="mb-4 rounded-xl" />
      <Skeleton variant="text" height="32px" width="60%" className="mb-2" />
      <Skeleton variant="text" height="14px" width="80%" />
    </div>
  );
}

/**
 * Skeleton pour un profil utilisateur
 */
export function ProfileSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton variant="avatar" width="80px" height="80px" className="rounded-2xl" />
        <div className="flex-1">
          <Skeleton variant="text" height="24px" width="60%" className="mb-2" />
          <Skeleton variant="text" height="16px" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" height="14px" count={3} />
    </div>
  );
}

