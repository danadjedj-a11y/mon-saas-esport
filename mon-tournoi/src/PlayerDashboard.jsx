import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';
import { TournamentCardSkeleton } from './components/Skeleton';
import { EmptyTournaments } from './components/EmptyState';
import DashboardLayout from './layouts/DashboardLayout';

export default function PlayerDashboard({ session }) {
  const [myTournaments, setMyTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [followedTournaments, setFollowedTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayerData();
  }, [session]);

  const fetchPlayerData = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // Paralléliser les requêtes pour les équipes
      const [captainTeamsResult, memberTeamsResult, allTournamentsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id')
          .eq('captain_id', session.user.id),
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id),
        supabase
          .from('tournaments')
          .select('*')
          .in('status', ['draft', 'ongoing'])
          .order('created_at', { ascending: false })
      ]);

      const captainTeams = captainTeamsResult.data || [];
      const memberTeams = memberTeamsResult.data || [];
      const allTournaments = allTournamentsResult.data || [];

      setAvailableTournaments(allTournaments);

      const allTeamIds = [
        ...captainTeams.map(t => t.id),
        ...memberTeams.map(tm => tm.team_id)
      ];
      const uniqueTeamIds = [...new Set(allTeamIds)];

      if (uniqueTeamIds.length === 0) {
        setMyTournaments([]);
        setUpcomingMatches([]);
        setLoading(false);
        return;
      }

      // Récupérer les participants et les matchs en parallèle
      const [participantsResult, matchesResult] = await Promise.all([
        supabase
          .from('participants')
          .select('tournament_id')
          .in('team_id', uniqueTeamIds),
        supabase
          .from('matches')
          .select('*, tournaments(*)')
          .in('player1_id', uniqueTeamIds)
          .or(`player2_id.in.(${uniqueTeamIds.join(',')})`)
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: true })
          .limit(10)
      ]);

      const participants = participantsResult.data || [];
      const matches = matchesResult.data || [];

      if (participants.length > 0) {
        const tournamentIds = [...new Set(participants.map(p => p.tournament_id))];
        
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', tournamentIds)
          .order('created_at', { ascending: false });
        
        setMyTournaments(tournaments || []);
      } else {
        setMyTournaments([]);
      }

      setUpcomingMatches(matches);

      // Récupérer les tournois suivis
      const { data: follows } = await supabase
        .from('tournament_follows')
        .select('tournament_id')
        .eq('user_id', session.user.id);

      if (follows && follows.length > 0) {
        const followedIds = follows.map(f => f.tournament_id);
        const { data: followed } = await supabase
          .from('tournaments')
          .select('*')
          .in('id', followedIds)
          .order('created_at', { ascending: false });
        
        setFollowedTournaments(followed || []);
      } else {
        setFollowedTournaments([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setMyTournaments([]);
      setAvailableTournaments([]);
      setUpcomingMatches([]);
      setFollowedTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur déconnexion:', error);
      } else {
        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <TournamentCardSkeleton key={i} />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* MATCHS À VENIR - EN HAUT */}
        {upcomingMatches.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-2xl text-fluky-secondary mb-5" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>⚡ Mes Prochains Matchs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-fluky-primary hover:-translate-y-1 hover:shadow-2xl hover:shadow-fluky-primary/40"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-display text-lg font-bold text-fluky-secondary">
                      {match.tournaments?.name || 'Tournoi'}
                    </div>
                    {match.scheduled_at && (
                      <div className="text-xs text-white bg-fluky-primary px-3 py-1 rounded-lg font-body">
                        📅 {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-fluky-text font-body">
                    Round {match.round_number} • Match #{match.match_number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOURNOIS SUIVIS - SECTION DÉDIÉE */}
        {followedTournaments.length > 0 && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-3xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>
                ⭐ Tournois Suivis
              </h2>
              <span className="text-sm text-fluky-text font-body">
                {followedTournaments.length} tournoi{followedTournaments.length > 1 ? 's' : ''} suivi{followedTournaments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {followedTournaments.map((t) => {
                const getStatusStyle = (status) => {
                  switch (status) {
                    case 'draft': return { bg: '#E7632C', text: 'Inscriptions', icon: '📝' };
                    case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
                    default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
                  }
                };
                const statusStyle = getStatusStyle(t.status);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/tournament/${t.id}/public`)}
                    style={{ 
                      background: 'rgba(3, 9, 19, 0.9)', 
                      padding: '20px', 
                      borderRadius: '12px', 
                      border: '2px solid #FF36A3', 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#C10468';
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(193, 4, 104, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#FF36A3';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      right: '10px',
                      fontSize: '1.2rem'
                    }}>
                      ⭐
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div style={{ flex: 1, paddingRight: '30px' }}>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>
                          {t.name}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#F8F6F2', display: 'flex', gap: '15px', marginTop: '8px', fontFamily: "'Protest Riot', sans-serif" }}>
                          <span>🎮 {t.game}</span>
                          <span>📊 {t.format}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      marginTop: '15px', 
                      paddingTop: '15px', 
                      borderTop: '2px solid #FF36A3',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        background: statusStyle.bg, 
                        padding: '5px 12px', 
                        borderRadius: '5px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        color: '#F8F6F2',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}>
                        {statusStyle.icon} {statusStyle.text}
                      </span>
                      <div style={{
                        padding: '6px 12px',
                        background: '#C10468',
                        borderRadius: '5px',
                        fontSize: '0.85rem',
                        color: '#F8F6F2',
                        fontWeight: 'bold',
                        fontFamily: "'Protest Riot', sans-serif"
                      }}>
                        Voir →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLONNE GAUCHE : MES TOURNOIS */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🎯 Mes Tournois</h2>
              <span className="text-sm text-fluky-text font-body">{myTournaments.length} tournoi(s)</span>
            </div>

            {myTournaments.length > 0 ? (
              <div className="flex flex-col gap-4">
                {myTournaments.map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: '#E7632C', text: 'Inscriptions', icon: '📝' };
                      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
                      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/player/tournament/${t.id}`)}
                      className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-fluky-primary hover:translate-x-1 hover:shadow-2xl hover:shadow-fluky-primary/40"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-display text-lg text-fluky-text mb-1">{t.name}</h3>
                          <div className="text-sm text-fluky-text flex gap-4 mt-2 font-body">
                            <span>🎮 {t.game}</span>
                            <span>📊 {t.format}</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap text-white font-body" style={{ background: statusStyle.bg }}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-10 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-fluky-text font-body">Vous n'êtes inscrit à aucun tournoi</p>
                <p className="text-fluky-text text-sm mt-2 font-body">Rejoignez un tournoi disponible ci-contre</p>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : TOURNOIS DISPONIBLES */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-2xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🌟 Tournois Disponibles</h2>
              <span className="text-sm text-fluky-text font-body">{availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length} disponible(s)</span>
            </div>

            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto">
              {availableTournaments
                .filter(t => !myTournaments.some(mt => mt.id === t.id))
                .map((t) => {
                  const getStatusStyle = (status) => {
                    switch (status) {
                      case 'draft': return { bg: '#E7632C', text: 'Inscriptions ouvertes', icon: '📝' };
                      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
                    }
                  };
                  const statusStyle = getStatusStyle(t.status);
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/tournament/${t.id}/public`)}
                      className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-fluky-primary hover:translate-x-1 hover:shadow-2xl hover:shadow-fluky-primary/40"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-display text-lg text-fluky-text mb-1">{t.name}</h3>
                          <div className="text-sm text-fluky-text flex gap-4 mt-2 font-body">
                            <span>🎮 {t.game}</span>
                            <span>📊 {t.format}</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap text-white font-body" style={{ background: statusStyle.bg }}>
                          {statusStyle.icon} {statusStyle.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {availableTournaments.filter(t => !myTournaments.some(mt => mt.id === t.id)).length === 0 && (
                <EmptyTournaments />
              )}
            </div>
          </div>
        </div>

        {/* STATISTIQUES RAPIDES */}
        <div className="mt-10 bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6">
          <h3 className="font-display text-xl text-fluky-secondary mb-5" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>📊 Aperçu Statistiques</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-fluky-secondary">{myTournaments.length}</div>
              <div className="text-sm text-fluky-text mt-2 font-body">Tournois</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-fluky-primary">{upcomingMatches.length}</div>
              <div className="text-sm text-fluky-text mt-2 font-body">Matchs à venir</div>
            </div>
            <div className="text-center cursor-pointer" onClick={() => navigate('/stats')}>
              <div className="text-sm text-fluky-secondary underline font-body hover:text-fluky-primary transition-colors">Voir toutes les stats →</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
