import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getBadgeRarityColor, getRarityLabel, getCategoryLabel } from '../utils/badges';
import Skeleton from './Skeleton';
import { EmptyBadges } from './EmptyState';

export default function BadgeDisplay({ userId, _session, compact = false }) {
  // Convex queries - returns undefined while loading
  const badges = useQuery(api.gamification.getUserBadges, userId ? { userId } : 'skip');
  const userLevel = useQuery(api.gamification.getUserLevel, userId ? { userId } : 'skip');

  const loading = badges === undefined || userLevel === undefined;

  // Default level if no data
  const levelData = userLevel ?? { level: 1, xp: 0, totalXp: 0 };

  if (loading) {
    return (
      <div>
        <Skeleton variant="text" className="h-8 w-48 mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card border-violet-500/30 p-4">
              <Skeleton variant="avatar" className="w-16 h-16 mx-auto mb-3" />
              <Skeleton variant="text" className="h-4 w-4/5 mx-auto mb-2" />
              <Skeleton variant="text" className="h-3 w-full mb-1" />
              <Skeleton variant="text" className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {levelData && (
          <div className="glass-card border-violet-500/50 px-3 py-2 rounded-lg">
            <span className="font-display text-violet-400 text-sm">
              Niveau {levelData.level}
            </span>
          </div>
        )}
        {(badges || []).slice(0, 5).map((badge) => (
          <div
            key={badge.badgeId}
            title={`${badge.name} - ${badge.description}`}
            className="text-2xl cursor-pointer transition-transform duration-300 hover:scale-125"
          >
            {badge.icon}
          </div>
        ))}
        {(badges || []).length > 5 && (
          <span className="text-violet-400 text-sm">
            +{badges.length - 5}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card border-violet-500/30 p-8 rounded-2xl shadow-glow-sm">
      {/* Niveau et XP */}
      {levelData && (
        <div className="mb-8">
          <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
            Niveau {levelData.level}
          </h3>
          <div className="glass-card border-violet-500/20 p-4 rounded-xl">
            <div className="flex justify-between mb-3 text-gray-400 text-sm">
              <span>XP Total: <span className="text-white">{levelData.totalXp}</span></span>
              <span>XP Actuel: <span className="text-cyan-400">{levelData.xp}</span></span>
            </div>
            <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden border border-violet-500/30">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 rounded-full"
                style={{ 
                  width: `${Math.min(100, (levelData.xp / (Math.pow(levelData.level, 2) * 100 - Math.pow(levelData.level - 1, 2) * 100)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Liste des badges */}
      <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400 mb-6">
        Badges ({(badges || []).length})
      </h3>

      {(badges || []).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const rarityColor = getBadgeRarityColor(badge.rarity);
            
            return (
              <div
                key={badge.badgeId}
                className="glass-card p-5 rounded-xl text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-violet group"
                style={{ borderColor: `${rarityColor}40` }}
              >
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {badge.icon}
                </div>
                <h4 className="font-display text-white text-lg mb-1">
                  {badge.name}
                </h4>
                <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                  {badge.description}
                </p>
                <div className="flex justify-center gap-3 text-xs">
                  <span style={{ color: rarityColor }} className="font-medium">
                    {getRarityLabel(badge.rarity)}
                  </span>
                  <span className="text-pink-400">
                    {getCategoryLabel(badge.category)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyBadges />
      )}
    </div>
  );
}

