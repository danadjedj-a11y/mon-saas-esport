import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FollowButton from './FollowButton';
import { supabase } from '../supabaseClient';
import { GlassCard, NeonBadge, GradientButton } from '../shared/components/ui';
import { ArrowRight, Gamepad2, Calendar, Users } from 'lucide-react';

const TournamentCard = memo(({ tournament, getStatusStyle, getFormatLabel }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const statusStyle = getStatusStyle(tournament.status);

  // Map status to NeonBadge variants
  const getStatusVariant = (status) => {
    switch (status) {
      case 'draft': return 'draft';
      case 'completed': return 'completed';
      case 'ongoing': return 'live';
      case 'active': return 'live';
      default: return 'upcoming';
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div onClick={() => navigate(`/tournament/${tournament.id}/public`)}>
      <GlassCard className="cursor-pointer">
        <div className="flex flex-col gap-4">
          {/* Header with icon and status */}
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-400">
              {tournament.logo_url ? (
                <img src={tournament.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <Gamepad2 className="h-6 w-6" />
              )}
            </div>
            <NeonBadge variant={getStatusVariant(tournament.status)}>
              {statusStyle.icon} {statusStyle.text}
            </NeonBadge>
          </div>

          {/* Tournament info */}
          <div>
            <h3 className="mb-1 text-lg font-bold text-[#F8FAFC] line-clamp-1">
              {tournament.name}
            </h3>
            <span className="inline-block rounded-md bg-[#1a1a24] px-2 py-0.5 text-xs font-medium text-[#94A3B8]">
              {tournament.game || 'Jeu non défini'}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {tournament.start_date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
                <Calendar className="h-3 w-3" />
                {formatDate(tournament.start_date)}
              </span>
            )}
            <span className="rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
              📊 {getFormatLabel(tournament.format)}
            </span>
            {tournament.max_participants && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
                <Users className="h-3 w-3" />
                {tournament.max_participants}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-[rgba(148,163,184,0.1)] pt-4">
            <GradientButton size="sm" className="flex-1">
              <span className="flex items-center justify-center gap-2">
                Voir le tournoi
                <ArrowRight className="h-4 w-4" />
              </span>
            </GradientButton>

            {session && (
              <div onClick={(e) => e.stopPropagation()}>
                <FollowButton session={session} tournamentId={tournament.id} type="tournament" />
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
});

TournamentCard.displayName = 'TournamentCard';

export default TournamentCard;
