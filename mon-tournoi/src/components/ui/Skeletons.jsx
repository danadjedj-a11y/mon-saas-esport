/**
 * Composants de chargement uniformisés pour toute l'application
 */

// Skeleton de base amélioré
export function SkeletonBox({ className = '', animate = true }) {
  return (
    <div 
      className={`bg-gradient-to-r from-fluky-bg/40 via-fluky-primary/20 to-fluky-bg/40 rounded-lg ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

// Skeleton pour une carte de match
export function MatchCardSkeleton() {
  return (
    <div className="w-[260px] bg-fluky-bg/95 border-2 border-fluky-primary/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-7 h-7 rounded-full" />
        <SkeletonBox className="h-4 flex-1" />
        <SkeletonBox className="w-8 h-6" />
      </div>
      <div className="h-0.5 bg-fluky-primary/30" />
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-7 h-7 rounded-full" />
        <SkeletonBox className="h-4 flex-1" />
        <SkeletonBox className="w-8 h-6" />
      </div>
    </div>
  );
}

// Skeleton pour une carte de participant
export function ParticipantCardSkeleton() {
  return (
    <div className="bg-fluky-bg/80 p-4 rounded-xl border-2 border-fluky-primary/30 text-center">
      <SkeletonBox className="w-14 h-14 rounded-full mx-auto mb-3" />
      <SkeletonBox className="h-5 w-24 mx-auto mb-2" />
      <SkeletonBox className="h-3 w-12 mx-auto" />
    </div>
  );
}

// Skeleton pour le header d'un tournoi
export function TournamentHeaderSkeleton() {
  return (
    <div className="text-center mb-10 pb-8 border-b-4 border-fluky-secondary/30 bg-gradient-to-br from-fluky-primary/5 to-fluky-secondary/5 p-8 rounded-xl border border-fluky-secondary/30">
      <SkeletonBox className="h-12 w-3/5 mx-auto mb-5" />
      <div className="flex justify-center gap-5 mt-5 flex-wrap">
        <SkeletonBox className="h-10 w-28" />
        <SkeletonBox className="h-10 w-36" />
        <SkeletonBox className="h-10 w-32" />
      </div>
    </div>
  );
}

// Skeleton pour les onglets
export function TabsSkeleton() {
  return (
    <div className="flex gap-3 mb-8 border-b-4 border-fluky-secondary/30 pb-3">
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonBox key={i} className="h-12 w-32" />
      ))}
    </div>
  );
}

// Skeleton pour une page de tournoi complète
export function TournamentPageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <TournamentHeaderSkeleton />
      <TabsSkeleton />
      <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-primary/30">
        <SkeletonBox className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-fluky-bg/80 p-5 rounded-xl border-2 border-fluky-primary/30">
              <SkeletonBox className="h-4 w-20 mb-3" />
              <SkeletonBox className="h-6 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton pour une liste de matchs
export function MatchListSkeleton({ count = 4 }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour une liste de participants
export function ParticipantsListSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ParticipantCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour un tableau/classement
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-fluky-bg/80 rounded-xl border-2 border-fluky-primary/30 overflow-hidden">
      <div className="bg-fluky-primary/20 p-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-3 flex gap-4 border-t border-fluky-primary/20">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonBox key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton pour une carte de profil/équipe
export function ProfileCardSkeleton() {
  return (
    <div className="bg-fluky-bg/80 p-6 rounded-xl border-2 border-fluky-primary/30">
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

// Skeleton pour le dashboard
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 bg-fluky-bg/80 p-5 rounded-xl border-2 border-fluky-primary/30">
            <SkeletonBox className="h-8 w-16 mb-2" />
            <SkeletonBox className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <TableSkeleton rows={5} cols={3} />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <SkeletonBox key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
