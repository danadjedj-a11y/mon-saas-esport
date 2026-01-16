import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getBadgeRarityColor, getRarityLabel, getCategoryLabel } from '../utils/badges';
import Skeleton from './Skeleton';
import { EmptyBadges } from './EmptyState';

export default function BadgeDisplay({ userId, _session, compact = false }) {
  const [badges, setBadges] = useState([]);
  const [userLevel, setUserLevel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchBadges();
      fetchUserLevel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      setBadges(data || []);
    } catch (err) {
      console.error('Erreur chargement badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLevel = async () => {
    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserLevel(data || { level: 1, xp: 0, total_xp: 0 });
    } catch (err) {
      console.error('Erreur chargement niveau:', err);
      setUserLevel({ level: 1, xp: 0, total_xp: 0 });
    }
  };

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
        {userLevel && (
          <div className="glass-card border-violet-500/50 px-3 py-2 rounded-lg">
            <span className="font-display text-violet-400 text-sm">
              Niveau {userLevel.level}
            </span>
          </div>
        )}
        {badges.slice(0, 5).map((ub) => (
          <div
            key={ub.id}
            title={`${ub.badges.name} - ${ub.badges.description}`}
            className="text-2xl cursor-pointer transition-transform duration-300 hover:scale-125"
          >
            {ub.badges.icon}
          </div>
        ))}
        {badges.length > 5 && (
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
      {userLevel && (
        <div className="mb-8">
          <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4">
            Niveau {userLevel.level}
          </h3>
          <div className="glass-card border-violet-500/20 p-4 rounded-xl">
            <div className="flex justify-between mb-3 text-gray-400 text-sm">
              <span>XP Total: <span className="text-white">{userLevel.total_xp}</span></span>
              <span>XP Actuel: <span className="text-cyan-400">{userLevel.xp}</span></span>
            </div>
            <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden border border-violet-500/30">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 rounded-full"
                style={{ 
                  width: `${Math.min(100, (userLevel.xp / (Math.pow(userLevel.level, 2) * 100 - Math.pow(userLevel.level - 1, 2) * 100)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Liste des badges */}
      <h3 className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400 mb-6">
        Badges ({badges.length})
      </h3>

      {badges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((ub) => {
            const badge = ub.badges;
            const rarityColor = getBadgeRarityColor(badge.rarity);
            
            return (
              <div
                key={ub.id}
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
                  Obtenu le {new Date(ub.earned_at).toLocaleDateString('fr-FR')}
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

