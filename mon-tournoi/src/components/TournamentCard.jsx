import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FollowButton from './FollowButton';
import { supabase } from '../supabaseClient';

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

  // Map status to new badge classes
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'ongoing': return 'badge-live';
      default: return 'badge-violet';
    }
  };

  return (
    <div
      onClick={() => navigate(`/tournament/${tournament.id}/public`)}
      className="group relative bg-dark-50 border border-glass-border rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-violet hover:shadow-glow-md hover:-translate-y-1 overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet/5 to-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-semibold text-text mb-2 truncate group-hover:text-violet-light transition-colors">
              {tournament.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary font-body">
              <span className="flex items-center gap-1.5">
                <span className="text-base">🎮</span>
                {tournament.game}
              </span>
              <span className="w-1 h-1 rounded-full bg-glass-border" />
              <span className="flex items-center gap-1.5">
                <span className="text-base">📊</span>
                {getFormatLabel(tournament.format)}
              </span>
            </div>
          </div>
          
          {/* Status Badge */}
          <span className={`badge ${getStatusBadgeClass(tournament.status)} shrink-0`}>
            {statusStyle.icon} {statusStyle.text}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-glass-border to-transparent my-4" />

        {/* Footer */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <span className="text-sm text-text-muted font-body">
            Créé le {new Date(tournament.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          
          <div className="flex items-center gap-3">
            {session && (
              <div onClick={(e) => e.stopPropagation()}>
                <FollowButton session={session} tournamentId={tournament.id} type="tournament" />
              </div>
            )}
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet to-violet-dark text-white text-sm font-display font-medium rounded-lg shadow-glow-sm group-hover:shadow-glow-md transition-all">
              Voir le tournoi
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

TournamentCard.displayName = 'TournamentCard';

export default TournamentCard;

