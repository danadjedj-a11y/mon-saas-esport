import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import BadgeDisplay from './components/BadgeDisplay';
import DashboardLayout from './layouts/DashboardLayout';

export default function Profile({ session }) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      getProfile();
      fetchPlayerStats();
    }
  }, [session]);

  async function getProfile() {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
    if (data) {
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url || '');
    }
  }

  async function fetchPlayerStats() {
    if (!session?.user) return;

    // Récupérer toutes les équipes du joueur
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length === 0) {
      setPlayerStats({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        tournamentsCount: 0,
        teamsCount: uniqueTeamIds.length
      });
      setLoading(false);
      return;
    }

    // Récupérer tous les matchs de toutes les équipes du joueur
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .or(uniqueTeamIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(','))
      .eq('status', 'completed');

    let wins = 0;
    let losses = 0;
    let draws = 0;

    (allMatches || []).forEach(match => {
      const myTeamId = uniqueTeamIds.find(id => id === match.player1_id || id === match.player2_id);
      if (!myTeamId) return;

      const isTeam1 = match.player1_id === myTeamId;
      const myScore = isTeam1 ? match.score_p1 : match.score_p2;
      const opponentScore = isTeam1 ? match.score_p2 : match.score_p1;

      if (myScore > opponentScore) {
        wins++;
      } else if (myScore < opponentScore) {
        losses++;
      } else {
        draws++;
      }
    });

    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Récupérer le nombre de tournois
    const { data: participations } = await supabase
      .from('participants')
      .select('tournament_id')
      .in('team_id', uniqueTeamIds);

    const uniqueTournaments = new Set(participations?.map(p => p.tournament_id) || []);

    setPlayerStats({
      totalMatches,
      wins,
      losses,
      draws,
      winRate: parseFloat(winRate),
      tournamentsCount: uniqueTournaments.size,
      teamsCount: uniqueTeamIds.length
    });
    setLoading(false);
  }

  async function updateProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    });
    if (error) toast.error("Erreur : " + error.message);
    else toast.success("Profil mis à jour !");
  }

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche : Paramètres */}
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">
          <h2 className="font-display text-3xl text-fluky-secondary mb-8" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>⚙️ Paramètres du Profil</h2>
          
          <div className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-fluky-text font-bold font-body">Pseudo :</label>
              <input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
            </div>

            <div>
              <label className="block mb-2 text-fluky-text font-bold font-body">Photo de profil (URL) :</label>
              <input 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                placeholder="https://..." 
                className="w-full px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
              />
            </div>

            {avatarUrl && (
              <div className="text-center p-5 bg-[#030913]/60 rounded-xl border border-fluky-secondary">
                <img 
                  src={avatarUrl} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-fluky-secondary mx-auto" 
                  alt="Aperçu" 
                />
              </div>
            )}

            <button 
              type="button"
              onClick={updateProfile} 
              className="mt-2 px-6 py-4 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
            >
              💾 Sauvegarder les modifications
            </button>
          </div>
        </div>

        {/* Colonne droite : Statistiques */}
        <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-8">
          <h2 className="font-display text-3xl text-fluky-secondary mb-8" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>📊 Mes Statistiques</h2>
          
          {loading ? (
            <div className="text-center py-10 text-fluky-text font-body">
              Chargement des statistiques...
            </div>
          ) : playerStats ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-3xl font-bold text-fluky-secondary mb-2">
                    {playerStats.totalMatches}
                  </div>
                  <div className="text-sm text-fluky-text font-body">Matchs joués</div>
                </div>
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-3xl font-bold text-fluky-accent-orange mb-2">
                    {playerStats.winRate}%
                  </div>
                  <div className="text-sm text-fluky-text font-body">Win Rate</div>
                </div>
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-3xl font-bold text-fluky-primary mb-2">
                    {playerStats.wins}
                  </div>
                  <div className="text-sm text-fluky-text font-body">Victoires</div>
                </div>
                <div className="bg-[#030913]/60 p-5 rounded-xl text-center border border-white/5">
                  <div className="font-display text-3xl font-bold text-fluky-secondary mb-2">
                    {playerStats.losses}
                  </div>
                  <div className="text-sm text-fluky-text font-body">Défaites</div>
                </div>
              </div>

              <div className="bg-[#030913]/60 p-5 rounded-xl border border-white/5">
                <div className="flex justify-between mb-4 pb-4 border-b border-white/5">
                  <span className="text-fluky-text font-body">Équipes :</span>
                  <span className="font-bold text-fluky-secondary font-body">{playerStats.teamsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fluky-text font-body">Tournois :</span>
                  <span className="font-bold text-fluky-secondary font-body">{playerStats.tournamentsCount}</span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/stats')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
                >
                  📊 Voir les statistiques détaillées
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-fluky-text font-body">
              Aucune statistique disponible. Rejoignez une équipe pour commencer !
            </div>
          )}
        </div>
      </div>

      {/* Section Badges et Achievements */}
      <div className="mt-8">
        <BadgeDisplay userId={session?.user?.id} session={session} />
      </div>
      </div>
    </DashboardLayout>
  );
}