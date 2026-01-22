import React from 'react';

/**
 * Composant Skeleton pour les états de chargement
 * Design System: Neon Glass
 * 
 * Ce fichier unifie tous les skeletons de l'application.
 * Les composants de ui/Skeletons.jsx ont été fusionnés ici.
 */

// ============================================
// SKELETON DE BASE
// ============================================

export default function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  count = 1,
  circle = false,
  className = '',
  animate = true
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
      className={`skeleton ${animate ? 'animate-pulse' : ''} ${className}`}
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
 * SkeletonBox - Version simplifiée avec gradient
 * (Fusionné depuis ui/Skeletons.jsx)
 */
export function SkeletonBox({ className = '', animate = true }) {
  return (
    <div 
      className={`bg-gradient-to-r from-gray-900/40 via-violet-500/20 to-gray-900/40 rounded-lg ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

// ============================================
// SKELETONS SPÉCIFIQUES
// ============================================
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

// ============================================
// SKELETONS POUR PAGES TOURNOIS
// (Fusionnés depuis ui/Skeletons.jsx)
// ============================================

/**
 * Skeleton pour une carte de match
 */
export function MatchCardSkeleton() {
  return (
    <div className="w-[260px] bg-gray-900/95 border-2 border-violet-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-7 h-7 rounded-full" />
        <SkeletonBox className="h-4 flex-1" />
        <SkeletonBox className="w-8 h-6" />
      </div>
      <div className="h-0.5 bg-violet-500/30" />
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-7 h-7 rounded-full" />
        <SkeletonBox className="h-4 flex-1" />
        <SkeletonBox className="w-8 h-6" />
      </div>
    </div>
  );
}

/**
 * Skeleton pour une carte de participant
 */
export function ParticipantCardSkeleton() {
  return (
    <div className="bg-gray-900/80 p-4 rounded-xl border-2 border-violet-500/30 text-center">
      <SkeletonBox className="w-14 h-14 rounded-full mx-auto mb-3" />
      <SkeletonBox className="h-5 w-24 mx-auto mb-2" />
      <SkeletonBox className="h-3 w-12 mx-auto" />
    </div>
  );
}

/**
 * Skeleton pour le header d'un tournoi
 */
export function TournamentHeaderSkeleton() {
  return (
    <div className="text-center mb-10 pb-8 border-b-4 border-cyan-500/30 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-8 rounded-xl border border-cyan-500/30">
      <SkeletonBox className="h-12 w-3/5 mx-auto mb-5" />
      <div className="flex justify-center gap-5 mt-5 flex-wrap">
        <SkeletonBox className="h-10 w-28" />
        <SkeletonBox className="h-10 w-36" />
        <SkeletonBox className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton pour les onglets
 */
export function TabsSkeleton() {
  return (
    <div className="flex gap-3 mb-8 border-b-4 border-cyan-500/30 pb-3">
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonBox key={i} className="h-12 w-32" />
      ))}
    </div>
  );
}

/**
 * Skeleton pour une page de tournoi complète
 */
export function TournamentPageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <TournamentHeaderSkeleton />
      <TabsSkeleton />
      <div className="bg-gray-900/95 p-8 rounded-xl border-2 border-violet-500/30">
        <SkeletonBox className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-900/80 p-5 rounded-xl border-2 border-violet-500/30">
              <SkeletonBox className="h-4 w-20 mb-3" />
              <SkeletonBox className="h-6 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour une liste de matchs
 */
export function MatchListSkeleton({ count = 4 }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton pour une liste de participants
 */
export function ParticipantsListSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ParticipantCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton pour une carte de profil/équipe
 */
export function ProfileCardSkeleton() {
  return (
    <div className="bg-gray-900/80 p-6 rounded-xl border-2 border-violet-500/30">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonBox className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <SkeletonBox className="h-6 w-32 mb-2" />
          <SkeletonBox className="h-4 w-24" />
        </div>
      </div>
      <SkeletonBox className="h-4 w-full mb-2" />
      <SkeletonBox className="h-4 w-3/4" />
    </div>
  );
}

/**
 * Skeleton pour le dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 bg-gray-900/80 p-5 rounded-xl border-2 border-violet-500/30">
            <SkeletonBox className="h-8 w-16 mb-2" />
            <SkeletonBox className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <TableSkeleton rows={5} columns={3} />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <SkeletonBox key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
