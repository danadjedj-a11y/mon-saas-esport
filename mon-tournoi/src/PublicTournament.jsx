import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { getSwissScores } from './swissUtils';
import { calculateMatchWinner } from './bofUtils';
import TeamJoinButton from './TeamJoinButton';
import FollowButton from './components/FollowButton';
import CommentSection from './components/CommentSection';
import RatingDisplay from './components/RatingDisplay';
import Skeleton from './components/Skeleton';
import DashboardLayout from './layouts/DashboardLayout';

export default function PublicTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchGames, setMatchGames] = useState([]); // Pour Best-of-X
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'participants', 'bracket', 'results', 'comments'
  const [swissScores, setSwissScores] = useState([]);

  useEffect(() => {
    // Vérifier la session utilisateur
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchData();

    // Abonnement temps réel pour les mises à jour publiques
    const channel = supabase.channel('public-tournament-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, 
      () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, 
      () => fetchData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, 
      () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swiss_scores', filter: `tournament_id=eq.${id}` }, 
      () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_games' }, 
      () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [id]);

  const fetchData = async () => {
    // 1. Charger le tournoi
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
    setTournoi(tData);

    // 2. Charger les participants
    const { data: pData } = await supabase
      .from('participants')
      .select('*, teams(*)')
      .eq('tournament_id', id)
      .order('seed_order', { ascending: true, nullsLast: true });
    
    setParticipants(pData || []);

    // 3. Charger les matchs
    const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

    if (mData && mData.length > 0 && pData) {
      const enrichedMatches = mData.map(match => {
        const p1 = pData.find(p => p.team_id === match.player1_id);
        const p2 = pData.find(p => p.team_id === match.player2_id);
        
        const getTeamName = (p) => p ? `${p.teams.name} [${p.teams.tag}]` : 'En attente';
        const getTeamLogo = (p) => p?.teams?.logo_url || `https://ui-avatars.com/api/?name=${p?.teams?.tag || '?'}&background=random&size=64`;

        return {
          ...match,
          p1_name: match.player1_id ? getTeamName(p1) : 'En attente',
          p1_avatar: getTeamLogo(p1),
          p2_name: match.player2_id ? getTeamName(p2) : 'En attente',
          p2_avatar: getTeamLogo(p2),
        };
      });
      setMatches(enrichedMatches);

      // 4. Charger les manches pour les matchs Best-of-X
      if (tData?.best_of > 1) {
        try {
          const matchIds = enrichedMatches.map(m => m.id);
          const { data: gamesData } = await supabase
            .from('match_games')
            .select('*')
            .in('match_id', matchIds)
            .order('match_id', { ascending: true })
            .order('game_number', { ascending: true });
          
          setMatchGames(gamesData || []);
        } catch (error) {
          console.warn('Erreur récupération manches:', error);
          setMatchGames([]);
        }
      } else {
        setMatchGames([]);
      }
    }
    
    // Charger les scores suisses si format suisse
    if (tData?.format === 'swiss') {
      const scores = await getSwissScores(supabase, id);
      setSwissScores(scores);
    } else {
      setSwissScores([]);
    }
    
    setLoading(false);
  };

  // Fonction helper pour obtenir le score Best-of-X d'un match en temps réel
  const getMatchBestOfScore = (match) => {
    if (!tournoi?.best_of || tournoi.best_of <= 1) {
      return { team1Wins: match.score_p1 || 0, team2Wins: match.score_p2 || 0, completedGames: 0, totalGames: 1 };
    }
    
    const matchGamesData = matchGames.filter(g => g.match_id === match.id);
    if (matchGamesData.length === 0) {
      return { team1Wins: 0, team2Wins: 0, completedGames: 0, totalGames: tournoi.best_of };
    }
    
    const result = calculateMatchWinner(matchGamesData, tournoi.best_of, match.player1_id, match.player2_id);
    const completedGames = matchGamesData.filter(g => g.status === 'completed').length;
    return { team1Wins: result.team1Wins, team2Wins: result.team2Wins, completedGames, totalGames: tournoi.best_of };
  };

  // Composant réutilisable pour afficher un match dans l'arbre
  const MatchCard = ({ match }) => {
    const isCompleted = match.status === 'completed';
    const isScheduled = match.scheduled_at && !isCompleted;
    const isBestOf = tournoi?.best_of > 1;
    
    // Calculer les scores en temps réel pour Best-of-X
    const bestOfScore = isBestOf ? getMatchBestOfScore(match) : null;
    const displayScore1 = isBestOf && bestOfScore ? bestOfScore.team1Wins : (match.score_p1 || 0);
    const displayScore2 = isBestOf && bestOfScore ? bestOfScore.team2Wins : (match.score_p2 || 0);
    const isTeam1Winning = displayScore1 > displayScore2;
    const isTeam2Winning = displayScore2 > displayScore1;
    
    // Récupérer les manches pour Best-of-X
    const matchGamesData = isBestOf ? matchGames.filter(g => g.match_id === match.id) : [];
    const completedGames = matchGamesData.filter(g => g.status === 'completed');
    
    return (
      <div style={{
        width: isBestOf ? '300px' : '260px',
        background: 'rgba(3, 9, 19, 0.95)',
        border: isCompleted ? '2px solid #C10468' : (isScheduled ? '2px solid #FF36A3' : '2px solid #C10468'),
        borderRadius: '12px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(193, 4, 104, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Badge Best-of-X */}
        {isBestOf && (
          <div style={{
            position: 'absolute',
            top: '5px',
            left: '5px',
            background: 'linear-gradient(135deg, #C10468, #FF36A3)',
            color: '#F8F6F2',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(193, 4, 104, 0.5)',
            fontFamily: "'Protest Riot', sans-serif"
          }}>
            🎮 Bo{tournoi.best_of}
          </div>
        )}
        
        {/* Badge Date planifiée */}
        {isScheduled && (
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            background: '#FF36A3',
            color: '#F8F6F2',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            zIndex: 10,
            fontFamily: "'Protest Riot', sans-serif"
          }}>
            📅 {new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        
        {/* JOUEUR 1 */}
        <div style={{
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isTeam1Winning ? 'rgba(193, 4, 104, 0.2)' : 'transparent',
          borderRadius: '12px 12px 0 0',
          paddingTop: isBestOf ? '25px' : '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {match.player1_id && (
              <img 
                src={match.p1_avatar} 
                style={{
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '2px solid #FF36A3', 
                  flexShrink: 0
                }} 
                alt="" 
              />
            )}
            <span style={{
              color: match.player1_id ? '#F8F6F2' : '#FF36A3',
              fontWeight: isTeam1Winning ? 'bold' : 'normal',
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              {match.p1_name.split(' [')[0]}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>
              {displayScore1 || '-'}
            </span>
            {isBestOf && bestOfScore && (
              <span style={{ fontSize: '0.65rem', color: '#F8F6F2', marginTop: '2px', fontFamily: "'Protest Riot', sans-serif" }}>
                {bestOfScore.completedGames}/{bestOfScore.totalGames}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ height: '2px', background: '#FF36A3' }}></div>
        
        {/* JOUEUR 2 */}
        <div style={{
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isTeam2Winning ? 'rgba(193, 4, 104, 0.2)' : 'transparent',
          borderRadius: '0 0 12px 12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {match.player2_id && (
              <img 
                src={match.p2_avatar} 
                style={{
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '2px solid #FF36A3', 
                  flexShrink: 0
                }} 
                alt="" 
              />
            )}
            <span style={{
              color: match.player2_id ? '#F8F6F2' : '#FF36A3',
              fontWeight: isTeam2Winning ? 'bold' : 'normal',
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              {match.p2_name.split(' [')[0]}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#FF36A3', fontFamily: "'Shadows Into Light', cursive" }}>
              {displayScore2 || '-'}
            </span>
            {isBestOf && bestOfScore && (
              <span style={{ fontSize: '0.65rem', color: '#F8F6F2', marginTop: '2px', fontFamily: "'Protest Riot', sans-serif" }}>
                {bestOfScore.completedGames}/{bestOfScore.totalGames}
              </span>
            )}
          </div>
        </div>
        
        {/* Section Manches Best-of-X */}
        {isBestOf && completedGames.length > 0 && (
          <div style={{
            padding: '10px',
            background: 'rgba(3, 9, 19, 0.8)',
            borderTop: '2px solid #FF36A3',
            fontSize: '0.75rem'
          }}>
            <div style={{ 
              color: '#FF36A3', 
              marginBottom: '6px', 
              fontSize: '0.7rem',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              📊 Manches terminées:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {completedGames
                .sort((a, b) => a.game_number - b.game_number)
                .map((game) => (
                  <div 
                    key={game.id} 
                    style={{
                      background: 'rgba(3, 9, 19, 0.9)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #C10468',
                      fontSize: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}
                  >
                    <span style={{ color: '#FF36A3' }}>#{game.game_number}</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: game.team1_score > game.team2_score ? '#FF36A3' : '#F8F6F2' 
                    }}>
                      {game.team1_score}
                    </span>
                    <span style={{ color: '#C10468' }}>-</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: game.team2_score > game.team1_score ? '#FF36A3' : '#F8F6F2' 
                    }}>
                      {game.team2_score}
                    </span>
                    {game.map_name && (
                      <span style={{ color: '#FF36A3', fontSize: '0.6rem', marginLeft: '2px' }}>
                        🗺️ {game.map_name}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calcul du classement pour Round Robin
  const getStandings = () => {
    if (!participants || !matches) return [];

    const stats = participants.map(p => ({
      ...p,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalDiff: 0
    }));

    matches.forEach(m => {
      if (m.status !== 'completed') return;

      const p1Index = stats.findIndex(p => p.team_id === m.player1_id);
      const p2Index = stats.findIndex(p => p.team_id === m.player2_id);

      if (p1Index === -1 || p2Index === -1) return;

      stats[p1Index].played++;
      stats[p2Index].played++;

      const diff = (m.score_p1 || 0) - (m.score_p2 || 0);
      stats[p1Index].goalDiff += diff;
      stats[p2Index].goalDiff -= diff;

      if ((m.score_p1 || 0) > (m.score_p2 || 0)) {
        stats[p1Index].wins++;
        stats[p1Index].points += 3;
        stats[p2Index].losses++;
      } else if ((m.score_p2 || 0) > (m.score_p1 || 0)) {
        stats[p2Index].wins++;
        stats[p2Index].points += 3;
        stats[p1Index].losses++;
      } else {
        stats[p1Index].draws++;
        stats[p1Index].points += 1;
        stats[p2Index].draws++;
        stats[p2Index].points += 1;
      }
    });

    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDiff - a.goalDiff;
    });
  };

  if (loading || !tournoi) {
    return (
      <DashboardLayout session={session}>
        <div className="w-full max-w-7xl mx-auto">
          <Skeleton variant="text" height="50px" width="60%" style={{ marginBottom: '30px' }} />
          <Skeleton variant="text" height="30px" width="40%" style={{ marginBottom: '20px' }} />
          <div className="flex gap-4 mb-10">
            <Skeleton variant="text" height="40px" width="120px" />
            <Skeleton variant="text" height="40px" width="120px" />
            <Skeleton variant="text" height="40px" width="120px" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-5">
                <Skeleton variant="text" height="24px" width="70%" style={{ marginBottom: '15px' }} />
                <Skeleton variant="text" height="16px" width="50%" style={{ marginBottom: '10px' }} />
                <Skeleton variant="text" height="14px" count={2} />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!tournoi) return (
    <DashboardLayout session={session}>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#030913',
        color: '#F8F6F2',
        fontFamily: "'Protest Riot', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
          <p style={{ fontSize: '1.2rem', color: '#FF36A3' }}>Tournoi introuvable</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '12px 30px',
              background: '#C10468',
              border: '2px solid #FF36A3',
              color: '#F8F6F2',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FF36A3';
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#C10468';
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  const winnerMatch = matches.find(m => m.round_number === Math.max(...matches.map(m => m.round_number), 0) && m.status === 'completed');
  const winnerName = winnerMatch ? (winnerMatch.score_p1 > winnerMatch.score_p2 ? winnerMatch.p1_name : winnerMatch.p2_name) : null;

  const tabs = [
    { id: 'overview', label: '📋 Présentation', icon: '📋' },
    { id: 'participants', label: '👥 Participants', icon: '👥' },
    { id: 'bracket', label: '🏆 Arbre / Classement', icon: '🏆' },
    { id: 'schedule', label: '📅 Planning', icon: '📅' },
    { id: 'results', label: '📊 Résultats', icon: '📊' },
    { id: 'comments', label: '💬 Commentaires', icon: '💬' }
  ];

  const getFormatLabel = (format) => {
    switch (format) {
      case 'elimination': return 'Élimination Directe';
      case 'double_elimination': return 'Double Elimination';
      case 'round_robin': return 'Championnat';
      case 'swiss': return 'Système Suisse';
      default: return format;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#E7632C', text: 'Inscriptions ouvertes', icon: '📝' };
      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
    }
  };

  const statusStyle = getStatusStyle(tournoi.status);

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-10 pb-8 border-b-4 border-fluky-secondary bg-gradient-to-br from-fluky-primary/10 to-fluky-secondary/5 p-8 rounded-xl border border-fluky-secondary shadow-lg shadow-fluky-primary/30">
          <h1 className="font-display text-5xl text-fluky-secondary mb-5" style={{ textShadow: '0 0 20px rgba(193, 4, 104, 0.5)' }}>
            {tournoi.name}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ 
              background: 'rgba(3, 9, 19, 0.9)', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontSize: '0.95rem',
              border: '2px solid #FF36A3',
              fontFamily: "'Protest Riot', sans-serif",
              color: '#F8F6F2'
            }}>
              🎮 {tournoi.game}
            </span>
            <span style={{ 
              background: 'rgba(3, 9, 19, 0.9)', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontSize: '0.95rem',
              border: '2px solid #FF36A3',
              fontFamily: "'Protest Riot', sans-serif",
              color: '#F8F6F2'
            }}>
              📊 {getFormatLabel(tournoi.format)}
            </span>
            <span style={{ 
              background: statusStyle.bg,
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontSize: '0.95rem',
              fontWeight: 'bold',
              border: '2px solid #FF36A3',
              fontFamily: "'Protest Riot', sans-serif",
              color: '#F8F6F2'
            }}>
              {statusStyle.icon} {statusStyle.text}
            </span>
            {session && (
              <FollowButton session={session} tournamentId={id} type="tournament" />
            )}
            <RatingDisplay tournamentId={id} />
          </div>
        </div>

        {/* BANNIÈRE VAINQUEUR */}
        {winnerName && (
          <div className="bg-gradient-to-br from-fluky-secondary to-fluky-primary text-fluky-text p-8 rounded-xl text-center mb-8 shadow-lg shadow-fluky-secondary/50 border-4 border-fluky-secondary">
            <h2 className="font-display text-3xl m-0 uppercase tracking-widest">
              👑 VAINQUEUR : {winnerName.split(' [')[0]} 👑
            </h2>
          </div>
        )}

        {/* ONGLETS */}
        <div className="flex gap-3 mb-8 border-b-4 border-fluky-secondary overflow-x-auto pb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 cursor-pointer text-base font-display transition-all duration-300 whitespace-nowrap rounded-t-lg uppercase tracking-wide ${
                activeTab === tab.id
                  ? 'bg-fluky-primary text-white border-2 border-fluky-secondary border-b-4 border-b-fluky-secondary font-bold'
                  : 'bg-transparent text-fluky-text border-2 border-transparent hover:bg-fluky-primary/30 hover:border-fluky-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      {/* CONTENU DES ONGLETS */}
      <div style={{ minHeight: '400px' }}>
        
        {/* ONGLET PRÉSENTATION */}
        {activeTab === 'overview' && (
          <div style={{ 
            background: 'rgba(3, 9, 19, 0.95)', 
            padding: '30px', 
            borderRadius: '15px', 
            border: '2px solid #FF36A3',
            boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: '#FF36A3',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '2rem',
              marginBottom: '25px'
            }}>
              Informations du tournoi
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div style={{ 
                background: 'rgba(3, 9, 19, 0.8)', 
                padding: '20px', 
                borderRadius: '10px',
                border: '2px solid #C10468'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif" }}>Jeu</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>{tournoi.game}</div>
              </div>
              
              <div style={{ 
                background: 'rgba(3, 9, 19, 0.8)', 
                padding: '20px', 
                borderRadius: '10px',
                border: '2px solid #C10468'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif" }}>Format</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>
                  {getFormatLabel(tournoi.format)}
                </div>
                {tournoi.best_of > 1 && (
                  <div style={{ fontSize: '0.9rem', color: '#FF36A3', marginTop: '8px', fontFamily: "'Protest Riot', sans-serif" }}>
                    🎮 Best-of-{tournoi.best_of}
                  </div>
                )}
              </div>
              
              <div style={{ 
                background: 'rgba(3, 9, 19, 0.8)', 
                padding: '20px', 
                borderRadius: '10px',
                border: '2px solid #C10468'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif" }}>Équipes inscrites</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#F8F6F2', fontFamily: "'Shadows Into Light', cursive" }}>
                  {participants.length}
                  {tournoi.max_participants && ` / ${tournoi.max_participants}`}
                </div>
              </div>
              
              {tournoi.registration_deadline && (
                <div style={{ 
                  background: 'rgba(3, 9, 19, 0.8)', 
                  padding: '20px', 
                  borderRadius: '10px',
                  border: '2px solid #C10468'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif" }}>Date limite d'inscription</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    color: new Date(tournoi.registration_deadline) < new Date() ? '#E7632C' : '#F8F6F2',
                    fontFamily: "'Protest Riot', sans-serif"
                  }}>
                    {new Date(tournoi.registration_deadline).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'short', 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {new Date(tournoi.registration_deadline) < new Date() && ' (Expirée)'}
                  </div>
                </div>
              )}
              
              {tournoi.start_date && (
                <div style={{ 
                  background: 'rgba(3, 9, 19, 0.8)', 
                  padding: '20px', 
                  borderRadius: '10px',
                  border: '2px solid #C10468'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#FF36A3', marginBottom: '8px', fontFamily: "'Protest Riot', sans-serif" }}>Date de début</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif" }}>
                    {new Date(tournoi.start_date).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* BOUTON D'INSCRIPTION */}
            {tournoi.status === 'draft' && (
              <div style={{ 
                marginTop: '30px', 
                background: 'linear-gradient(135deg, #C10468 0%, #FF36A3 100%)', 
                padding: '25px', 
                borderRadius: '10px', 
                border: '2px solid #FF36A3',
                boxShadow: '0 4px 12px rgba(193, 4, 104, 0.4)'
              }}>
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#F8F6F2', 
                  fontSize: '1.5rem',
                  fontFamily: "'Shadows Into Light', cursive"
                }}>
                  🎯 Inscription au Tournoi
                </h3>
                {session ? (
                  <TeamJoinButton 
                    tournamentId={id} 
                    supabase={supabase} 
                    session={session} 
                    onJoinSuccess={fetchData} 
                    tournament={tournoi} 
                  />
                ) : (
                  <div>
                    <p style={{ 
                      margin: '0 0 15px 0', 
                      color: '#F8F6F2', 
                      fontSize: '0.95rem',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}>
                      Connectez-vous pour vous inscrire à ce tournoi avec votre équipe
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/auth')}
                      style={{
                        padding: '12px 30px',
                        background: '#030913',
                        color: '#F8F6F2',
                        border: '2px solid #FF36A3',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontFamily: "'Shadows Into Light', cursive",
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FF36A3';
                        e.currentTarget.style.borderColor = '#C10468';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#030913';
                        e.currentTarget.style.borderColor = '#FF36A3';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      🔐 Se Connecter
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RÈGLEMENT */}
            {tournoi.rules && (
              <div style={{ 
                marginTop: '30px', 
                background: 'rgba(3, 9, 19, 0.8)', 
                padding: '25px', 
                borderRadius: '10px', 
                border: '2px solid #C10468'
              }}>
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#FF36A3', 
                  fontSize: '1.5rem',
                  fontFamily: "'Shadows Into Light', cursive"
                }}>
                  📋 Règlement du Tournoi
                </h3>
                <div style={{ 
                  color: '#F8F6F2', 
                  lineHeight: '1.8', 
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'Protest Riot', sans-serif",
                  fontSize: '0.95rem'
                }}>
                  {tournoi.rules}
                </div>
              </div>
            )}

            {matches.length > 0 && (
              <div style={{ 
                marginTop: '30px', 
                background: 'rgba(3, 9, 19, 0.8)', 
                padding: '20px', 
                borderRadius: '10px',
                border: '2px solid #C10468'
              }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#FF36A3', 
                  marginBottom: '10px',
                  fontFamily: "'Protest Riot', sans-serif"
                }}>
                  Progression
                </div>
                <div style={{ 
                  fontSize: '1.1rem',
                  color: '#F8F6F2',
                  fontFamily: "'Protest Riot', sans-serif",
                  marginBottom: '10px'
                }}>
                  {matches.filter(m => m.status === 'completed').length} / {matches.length} matchs joués
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '12px', 
                  background: 'rgba(3, 9, 19, 0.5)', 
                  borderRadius: '6px', 
                  marginTop: '10px',
                  overflow: 'hidden',
                  border: '1px solid #FF36A3'
                }}>
                  <div style={{ 
                    width: `${(matches.filter(m => m.status === 'completed').length / matches.length) * 100}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #C10468, #FF36A3)',
                    transition: 'width 0.3s'
                  }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div style={{ 
            background: 'rgba(3, 9, 19, 0.95)', 
            padding: '30px', 
            borderRadius: '15px', 
            border: '2px solid #FF36A3',
            boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: '#FF36A3', 
              marginBottom: '20px',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '2rem'
            }}>
              Participants ({participants.length})
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {participants.map(p => (
                <div 
                  key={p.id}
                  style={{ 
                    background: 'rgba(3, 9, 19, 0.8)', 
                    padding: '15px', 
                    borderRadius: '10px', 
                    textAlign: 'center',
                    border: '2px solid #C10468',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = '#FF36A3';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(193, 4, 104, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#C10468';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img 
                    src={p.teams?.logo_url || `https://ui-avatars.com/api/?name=${p.teams?.tag || '?'}&background=random&size=128`}
                    alt=""
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '10px', 
                      objectFit: 'cover', 
                      marginBottom: '10px',
                      border: '2px solid #FF36A3'
                    }}
                  />
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '1rem',
                    color: '#F8F6F2',
                    fontFamily: "'Shadows Into Light', cursive"
                  }}>
                    {p.teams?.name || 'Équipe inconnue'}
                  </div>
                  <div style={{ 
                    color: '#FF36A3', 
                    fontSize: '0.85rem', 
                    marginTop: '5px',
                    fontFamily: "'Protest Riot', sans-serif"
                  }}>
                    [{p.teams?.tag || '?'}]
                  </div>
                  {p.seed_order && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '0.75rem', 
                      color: p.seed_order <= 3 ? '#FF36A3' : '#F8F6F2',
                      fontWeight: p.seed_order <= 3 ? 'bold' : 'normal',
                      fontFamily: "'Protest Riot', sans-serif"
                    }}>
                      Seed #{p.seed_order}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {participants.length === 0 && (
              <p style={{ 
                textAlign: 'center', 
                color: '#F8F6F2', 
                marginTop: '50px',
                fontFamily: "'Protest Riot', sans-serif"
              }}>
                Aucun participant pour le moment.
              </p>
            )}
          </div>
        )}

        {/* ONGLET ARBRE / CLASSEMENT */}
        {activeTab === 'bracket' && (
          <div>
            {tournoi.format === 'round_robin' ? (
              // CLASSEMENT (Round Robin)
              <div style={{ 
                background: 'rgba(3, 9, 19, 0.95)', 
                padding: '30px', 
                borderRadius: '15px', 
                border: '2px solid #FF36A3',
                boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
              }}>
                <h2 style={{ 
                  marginTop: 0, 
                  color: '#FF36A3', 
                  marginBottom: '25px',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '2rem'
                }}>
                  🏆 Classement
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: '#F8F6F2' }}>
                    <thead>
                      <tr style={{ 
                        background: 'rgba(193, 4, 104, 0.3)', 
                        textAlign: 'left',
                        borderBottom: '2px solid #FF36A3'
                      }}>
                        <th style={{ 
                          padding: '12px', 
                          borderRadius:'5px 0 0 5px',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          Rang
                        </th>
                        <th style={{ 
                          padding: '12px',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          Équipe
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign:'center',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          Pts
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign:'center',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          J
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign:'center',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          V
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign:'center',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          N
                        </th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign:'center', 
                          borderRadius:'0 5px 5px 0',
                          fontFamily: "'Shadows Into Light', cursive",
                          color: '#FF36A3'
                        }}>
                          D
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStandings().map((team, index) => (
                        <tr key={team.id} style={{ borderBottom: '1px solid rgba(255, 54, 163, 0.3)' }}>
                          <td style={{ 
                            padding: '12px', 
                            fontWeight: index === 0 ? 'bold' : 'normal', 
                            color: index === 0 ? '#FF36A3' : '#F8F6F2', 
                            fontSize: '1.1rem',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            #{index + 1}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            display:'flex', 
                            alignItems:'center', 
                            gap:'10px'
                          }}>
                            <img 
                              src={team.teams?.logo_url || `https://ui-avatars.com/api/?name=${team.teams?.tag}`} 
                              style={{
                                width:'32px', 
                                height:'32px', 
                                borderRadius:'50%',
                                border: '2px solid #FF36A3'
                              }} 
                              alt=""
                            />
                            <span style={{ 
                              fontWeight: index === 0 ? 'bold' : 'normal',
                              color: '#F8F6F2',
                              fontFamily: "'Protest Riot', sans-serif"
                            }}>
                              {team.teams?.name}
                            </span>
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign:'center', 
                            fontWeight:'bold', 
                            fontSize:'1.2rem', 
                            color:'#FF36A3',
                            fontFamily: "'Shadows Into Light', cursive"
                          }}>
                            {team.points}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign:'center', 
                            color:'#F8F6F2',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            {team.played}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign:'center',
                            color: '#F8F6F2',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            {team.wins}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign:'center',
                            color: '#F8F6F2',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            {team.draws}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign:'center',
                            color: '#F8F6F2',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            {team.losses}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : tournoi.format === 'double_elimination' ? (
              // DOUBLE ELIMINATION
              <div style={{ 
                background: 'rgba(3, 9, 19, 0.95)', 
                padding: '30px', 
                borderRadius: '15px', 
                border: '2px solid #FF36A3',
                boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)',
                overflowX: 'auto' 
              }}>
                <h2 style={{ 
                  marginTop: 0, 
                  color: '#FF36A3', 
                  marginBottom: '25px',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '2rem'
                }}>
                  🏆 Arbre du Tournoi
                </h2>
                {matches.length > 0 ? (
                  <div style={{display:'flex', gap:'40px', paddingBottom:'20px', minWidth: 'fit-content'}}>
                    {/* Winners Bracket */}
                    <div style={{flex: 1}}>
                      <h3 style={{
                        textAlign:'center', 
                        color:'#FF36A3', 
                        marginBottom: '20px',
                        fontFamily: "'Shadows Into Light', cursive",
                        fontSize: '1.5rem'
                      }}>
                        🏆 Winners Bracket
                      </h3>
                      <div style={{display:'flex', gap:'40px'}}>
                        {[...new Set(matches.filter(m => m.bracket_type === 'winners').map(m=>m.round_number))].sort().map(round => (
                          <div key={`winners-${round}`} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                            <h4 style={{
                              textAlign:'center', 
                              color:'#F8F6F2', 
                              marginBottom: '15px',
                              fontFamily: "'Protest Riot', sans-serif"
                            }}>
                              Round {round}
                            </h4>
                            {matches.filter(m => m.bracket_type === 'winners' && m.round_number === round).map(m => (
                              <MatchCard key={m.id} match={m} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Losers Bracket */}
                    <div style={{flex: 1}}>
                      <h3 style={{
                        textAlign:'center', 
                        color:'#C10468', 
                        marginBottom: '20px',
                        fontFamily: "'Shadows Into Light', cursive",
                        fontSize: '1.5rem'
                      }}>
                        💀 Losers Bracket
                      </h3>
                      <div style={{display:'flex', gap:'40px'}}>
                        {[...new Set(matches.filter(m => m.bracket_type === 'losers').map(m=>m.round_number))].sort().map(round => (
                          <div key={`losers-${round}`} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                            <h4 style={{
                              textAlign:'center', 
                              color:'#F8F6F2', 
                              marginBottom: '15px',
                              fontFamily: "'Protest Riot', sans-serif"
                            }}>
                              Round {round}
                            </h4>
                            {matches.filter(m => m.bracket_type === 'losers' && m.round_number === round).map(m => (
                              <MatchCard key={m.id} match={m} />
                            ))}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grand Finals */}
                      {matches.filter(m => !m.bracket_type && !m.is_reset).length > 0 && (
                        <div style={{marginTop:'40px', paddingTop:'20px', borderTop:'3px solid #FF36A3'}}>
                          <h3 style={{
                            textAlign:'center', 
                            color:'#FF36A3', 
                            marginBottom: '20px',
                            fontFamily: "'Shadows Into Light', cursive",
                            fontSize: '1.8rem'
                          }}>
                            🏅 Grand Finals
                          </h3>
                          <div style={{display:'flex', justifyContent:'center'}}>
                            {matches.filter(m => !m.bracket_type && !m.is_reset).map(m => {
                              const isCompleted = m.status === 'completed';
                              const isScheduled = m.scheduled_at && !isCompleted;
                              
                              return (
                                <div key={m.id} style={{
                                  width:'260px', 
                                  background:'#252525', 
                                  border: isCompleted ? '2px solid #4ade80' : (isScheduled ? '2px solid #3498db' : '1px solid #444'), 
                                  borderRadius:'10px', 
                                  position:'relative',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                }}>
                                  {/* Badge Date planifiée */}
                                  {isScheduled && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '5px',
                                      right: '5px',
                                      background: '#3498db',
                                      color: 'white',
                                      padding: '3px 8px',
                                      borderRadius: '3px',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                      zIndex: 10
                                    }}>
                                      📅 {new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                  {/* JOUEUR 1 */}
                                  <div style={{
                                    padding:'15px', 
                                    display:'flex', 
                                    justifyContent:'space-between', 
                                    alignItems:'center', 
                                    background: (m.score_p1 || 0) > (m.score_p2 || 0) ? '#2f3b2f' : 'transparent', 
                                    borderRadius:'10px 10px 0 0'
                                  }}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                      {m.player1_id && <img src={m.p1_avatar} style={{width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                      <span style={{
                                        color: m.player1_id ? 'white' : '#666', 
                                        fontWeight: (m.score_p1 || 0) > (m.score_p2 || 0) ? 'bold' : 'normal', 
                                        fontSize:'0.9rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {m.p1_name.split(' [')[0]}
                                      </span>
                                    </div>
                                    <span style={{fontWeight:'bold', fontSize:'1.2rem', marginLeft: '10px'}}>{m.score_p1 || '-'}</span>
                                  </div>
                                  
                                  <div style={{height:'1px', background:'#333'}}></div>
                                  
                                  {/* JOUEUR 2 */}
                                  <div style={{
                                    padding:'15px', 
                                    display:'flex', 
                                    justifyContent:'space-between', 
                                    alignItems:'center', 
                                    background: (m.score_p2 || 0) > (m.score_p1 || 0) ? '#2f3b2f' : 'transparent', 
                                    borderRadius:'0 0 10px 10px'
                                  }}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                      {m.player2_id && <img src={m.p2_avatar} style={{width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                      <span style={{
                                        color: m.player2_id ? 'white' : '#666', 
                                        fontWeight: (m.score_p2 || 0) > (m.score_p1 || 0) ? 'bold' : 'normal', 
                                        fontSize:'0.9rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {m.p2_name.split(' [')[0]}
                                      </span>
                                    </div>
                                    <span style={{fontWeight:'bold', fontSize:'1.2rem', marginLeft: '10px'}}>{m.score_p2 || '-'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Reset Match */}
                      {matches.filter(m => m.is_reset && m.player1_id && m.player2_id).length > 0 && (
                        <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'3px solid #FF36A3'}}>
                          <h4 style={{
                            textAlign:'center', 
                            color:'#E7632C', 
                            marginBottom:'10px',
                            fontFamily: "'Shadows Into Light', cursive",
                            fontSize: '1.3rem'
                          }}>
                            🔄 Reset Match
                          </h4>
                          <div style={{display:'flex', justifyContent:'center'}}>
                            {matches.filter(m => m.is_reset).map(m => (
                              <MatchCard key={m.id} match={m} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    textAlign:'center', 
                    padding:'50px', 
                    border:'2px dashed #FF36A3', 
                    borderRadius:'8px', 
                    color:'#F8F6F2',
                    background: 'rgba(3, 9, 19, 0.5)',
                    fontFamily: "'Protest Riot', sans-serif"
                  }}>
                    L'arbre apparaîtra une fois le tournoi lancé.
                  </div>
                )}
              </div>
            ) : tournoi.format === 'swiss' ? (
              // SYSTÈME SUISSE
              <div>
                {/* Classement Suisse */}
                {swissScores.length > 0 && (
                  <div style={{ 
                    background: 'rgba(3, 9, 19, 0.95)', 
                    padding: '30px', 
                    borderRadius: '15px', 
                    border: '2px solid #FF36A3',
                    boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)',
                    marginBottom: '40px' 
                  }}>
                    <h2 style={{ 
                      marginTop: 0, 
                      color: '#FF36A3', 
                      marginBottom: '25px',
                      fontFamily: "'Shadows Into Light', cursive",
                      fontSize: '2rem'
                    }}>
                      🇨🇭 Classement Suisse
                    </h2>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <thead>
                          <tr style={{ 
                            background: 'rgba(193, 4, 104, 0.3)', 
                            textAlign: 'left',
                            borderBottom: '2px solid #FF36A3'
                          }}>
                            <th style={{ 
                              padding: '12px', 
                              borderRadius:'5px 0 0 5px',
                              fontFamily: "'Shadows Into Light', cursive",
                              color: '#FF36A3'
                            }}>
                              Rang
                            </th>
                            <th style={{ 
                              padding: '12px',
                              fontFamily: "'Shadows Into Light', cursive",
                              color: '#FF36A3'
                            }}>
                              Équipe
                            </th>
                            <th style={{ 
                              padding: '12px', 
                              textAlign:'center',
                              fontFamily: "'Shadows Into Light', cursive",
                              color: '#FF36A3'
                            }}>
                              Victoires
                            </th>
                            <th style={{ 
                              padding: '12px', 
                              textAlign:'center',
                              fontFamily: "'Shadows Into Light', cursive",
                              color: '#FF36A3'
                            }}>
                              Défaites
                            </th>
                            <th style={{ 
                              padding: '12px', 
                              textAlign:'center',
                              fontFamily: "'Shadows Into Light', cursive",
                              color: '#FF36A3'
                            }}>
                              Nuls
                            </th>
                            <th style={{ 
                              padding: '12px', 
                              textAlign:'center', 
                              borderRadius:'0 5px 5px 0',
                              fontFamily: "'Shadows Into Light', cursive",
                              color: '#FF36A3'
                            }}>
                              Buchholz
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {swissScores.sort((a, b) => {
                            if (b.wins !== a.wins) return b.wins - a.wins;
                            if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
                            return a.team_id.localeCompare(b.team_id);
                          }).map((score, index) => {
                            const team = participants.find(p => p.team_id === score.team_id);
                            return (
                              <tr key={score.id} style={{ borderBottom: '1px solid rgba(255, 54, 163, 0.3)' }}>
                                <td style={{ 
                                  padding: '12px', 
                                  fontWeight: index === 0 ? 'bold' : 'normal', 
                                  color: index === 0 ? '#FF36A3' : '#F8F6F2', 
                                  fontSize: '1.1rem',
                                  fontFamily: "'Protest Riot', sans-serif"
                                }}>
                                  #{index + 1}
                                </td>
                                <td style={{ padding: '12px', display:'flex', alignItems:'center', gap:'10px' }}>
                                  <img 
                                    src={team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}`} 
                                    style={{
                                      width:'32px', 
                                      height:'32px', 
                                      borderRadius:'50%',
                                      border: '2px solid #FF36A3'
                                    }} 
                                    alt=""
                                  />
                                  <span style={{ 
                                    fontWeight: index === 0 ? 'bold' : 'normal',
                                    color: '#F8F6F2',
                                    fontFamily: "'Protest Riot', sans-serif"
                                  }}>
                                    {team?.teams?.name || 'Inconnu'}
                                  </span>
                                </td>
                                <td style={{ 
                                  padding: '12px', 
                                  textAlign:'center', 
                                  fontWeight:'bold', 
                                  fontSize:'1.1rem', 
                                  color:'#FF36A3',
                                  fontFamily: "'Shadows Into Light', cursive"
                                }}>
                                  {score.wins}
                                </td>
                                <td style={{ 
                                  padding: '12px', 
                                  textAlign:'center', 
                                  color:'#F8F6F2',
                                  fontFamily: "'Protest Riot', sans-serif"
                                }}>
                                  {score.losses}
                                </td>
                                <td style={{ 
                                  padding: '12px', 
                                  textAlign:'center', 
                                  color:'#F8F6F2',
                                  fontFamily: "'Protest Riot', sans-serif"
                                }}>
                                  {score.draws}
                                </td>
                                <td style={{ 
                                  padding: '12px', 
                                  textAlign:'center', 
                                  color:'#FF36A3', 
                                  fontWeight:'bold',
                                  fontFamily: "'Shadows Into Light', cursive"
                                }}>
                                  {parseFloat(score.buchholz_score || 0).toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Rounds Suisses */}
                {matches.length > 0 && (
                  <div style={{ 
                    background: 'rgba(3, 9, 19, 0.95)', 
                    padding: '30px', 
                    borderRadius: '15px', 
                    border: '2px solid #FF36A3',
                    boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)',
                    overflowX: 'auto' 
                  }}>
                    <h2 style={{ 
                      marginTop: 0, 
                      color: '#FF36A3', 
                      marginBottom: '25px',
                      fontFamily: "'Shadows Into Light', cursive",
                      fontSize: '2rem'
                    }}>
                      🇨🇭 Rounds
                    </h2>
                    <div style={{display:'flex', gap:'40px', paddingBottom:'20px', minWidth: 'fit-content'}}>
                      {[...new Set(matches.filter(m => m.bracket_type === 'swiss').map(m=>m.round_number))].sort().map(round => (
                        <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                          <h4 style={{
                            textAlign:'center', 
                            color:'#FF36A3', 
                            fontWeight:'bold', 
                            marginBottom: '15px',
                            fontFamily: "'Shadows Into Light', cursive",
                            fontSize: '1.3rem'
                          }}>
                            🇨🇭 Round {round}
                          </h4>
                          {matches.filter(m=>m.round_number === round && m.bracket_type === 'swiss').map(m => {
                            const isCompleted = m.status === 'completed';
                            const isScheduled = m.scheduled_at && !isCompleted;
                            
                            return (
                              <div key={m.id} style={{
                                width:'260px', 
                                background:'#252525', 
                                border: isCompleted ? '2px solid #4ade80' : (isScheduled ? '2px solid #3498db' : '1px solid #444'), 
                                borderRadius:'10px', 
                                position:'relative',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                              }}>
                                {/* Badge Date planifiée */}
                                {isScheduled && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    background: '#3498db',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '3px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    zIndex: 10
                                  }}>
                                    📅 {new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                                {/* JOUEUR 1 */}
                                <div style={{
                                  padding:'15px', 
                                  display:'flex', 
                                  justifyContent:'space-between', 
                                  alignItems:'center', 
                                  background: (m.score_p1 || 0) > (m.score_p2 || 0) ? '#2f3b2f' : 'transparent', 
                                  borderRadius:'10px 10px 0 0'
                                }}>
                                  <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                    {m.player1_id && <img src={m.p1_avatar} style={{width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                    <span style={{
                                      color: m.player1_id ? 'white' : '#666', 
                                      fontWeight: (m.score_p1 || 0) > (m.score_p2 || 0) ? 'bold' : 'normal', 
                                      fontSize:'0.9rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {m.p1_name.split(' [')[0]}
                                    </span>
                                  </div>
                                  <span style={{fontWeight:'bold', fontSize:'1.2rem', marginLeft: '10px'}}>{m.score_p1 || '-'}</span>
                                </div>
                                
                                <div style={{height:'1px', background:'#333'}}></div>
                                
                                {/* JOUEUR 2 */}
                                <div style={{
                                  padding:'15px', 
                                  display:'flex', 
                                  justifyContent:'space-between', 
                                  alignItems:'center', 
                                  background: (m.score_p2 || 0) > (m.score_p1 || 0) ? '#2f3b2f' : 'transparent', 
                                  borderRadius:'0 0 10px 10px'
                                }}>
                                  <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1, minWidth: 0}}>
                                    {m.player2_id && <img src={m.p2_avatar} style={{width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'1px solid #555', flexShrink: 0}} alt="" />}
                                    <span style={{
                                      color: m.player2_id ? 'white' : '#666', 
                                      fontWeight: (m.score_p2 || 0) > (m.score_p1 || 0) ? 'bold' : 'normal', 
                                      fontSize:'0.9rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {m.p2_name.split(' [')[0]}
                                    </span>
                                  </div>
                                  <span style={{fontWeight:'bold', fontSize:'1.2rem', marginLeft: '10px'}}>{m.score_p2 || '-'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // ARBRE SIMPLE (Single Elimination)
              <div style={{ 
                background: 'rgba(3, 9, 19, 0.95)', 
                padding: '30px', 
                borderRadius: '15px', 
                border: '2px solid #FF36A3',
                boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)',
                overflowX: 'auto' 
              }}>
                <h2 style={{ 
                  marginTop: 0, 
                  color: '#FF36A3', 
                  marginBottom: '25px',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '2rem'
                }}>
                  🏆 Arbre du Tournoi
                </h2>
                {matches.length > 0 ? (
                  <div style={{display:'flex', gap:'40px', paddingBottom:'20px', minWidth: 'fit-content'}}>
                    {[...new Set(matches.map(m=>m.round_number))].sort().map(round => (
                      <div key={round} style={{display:'flex', flexDirection:'column', justifyContent:'space-around', gap:'20px'}}>
                        <h4 style={{textAlign:'center', color:'#666', marginBottom: '15px'}}>Round {round}</h4>
                        {matches.filter(m=>m.round_number === round).map(m => (
                          <MatchCard key={m.id} match={m} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign:'center', 
                    padding:'50px', 
                    border:'2px dashed #FF36A3', 
                    borderRadius:'8px', 
                    color:'#F8F6F2',
                    background: 'rgba(3, 9, 19, 0.5)',
                    fontFamily: "'Protest Riot', sans-serif"
                  }}>
                    L'arbre apparaîtra une fois le tournoi lancé.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ONGLET PLANNING */}
        {activeTab === 'schedule' && (
          <div style={{ 
            background: 'rgba(3, 9, 19, 0.95)', 
            padding: '30px', 
            borderRadius: '15px', 
            border: '2px solid #FF36A3',
            boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: '#FF36A3', 
              marginBottom: '25px',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '2rem'
            }}>
              📅 Planning des Matchs
            </h2>
            
            {matches.filter(m => m.scheduled_at && m.status !== 'completed').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {matches
                  .filter(m => m.scheduled_at && m.status !== 'completed')
                  .sort((a, b) => {
                    if (!a.scheduled_at || !b.scheduled_at) return 0;
                    return new Date(a.scheduled_at) - new Date(b.scheduled_at);
                  })
                  .map(m => {
                    const scheduledDate = new Date(m.scheduled_at);
                    const isToday = scheduledDate.toDateString() === new Date().toDateString();
                    const isPast = scheduledDate < new Date();
                    
                    return (
                      <div 
                        key={m.id}
                        style={{ 
                          background: isPast ? 'rgba(231, 99, 44, 0.2)' : (isToday ? 'rgba(193, 4, 104, 0.3)' : 'rgba(3, 9, 19, 0.8)'), 
                          padding: '20px', 
                          borderRadius: '10px', 
                          border: isPast ? '2px solid #E7632C' : (isToday ? '2px solid #FF36A3' : '2px solid #C10468'),
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '15px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: '#FF36A3', 
                            marginBottom: '8px',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            Round {m.round_number} - Match #{m.match_number}
                            {m.bracket_type && (
                              <span style={{ 
                                marginLeft: '10px', 
                                color: m.bracket_type === 'winners' ? '#FF36A3' : '#C10468',
                                fontFamily: "'Protest Riot', sans-serif"
                              }}>
                                {m.bracket_type === 'winners' ? '🏆 Winners' : '💀 Losers'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <img 
                                src={m.p1_avatar} 
                                style={{
                                  width:'40px', 
                                  height:'40px', 
                                  borderRadius:'50%', 
                                  objectFit:'cover',
                                  border: '2px solid #FF36A3'
                                }} 
                                alt="" 
                              />
                              <span style={{
                                color: '#F8F6F2',
                                fontFamily: "'Protest Riot', sans-serif"
                              }}>
                                {m.p1_name.split(' [')[0]}
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '1.2rem', 
                              fontWeight: 'bold',
                              color: '#FF36A3',
                              fontFamily: "'Shadows Into Light', cursive"
                            }}>
                              VS
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                              <span style={{
                                color: '#F8F6F2',
                                fontFamily: "'Protest Riot', sans-serif"
                              }}>
                                {m.p2_name.split(' [')[0]}
                              </span>
                              <img 
                                src={m.p2_avatar} 
                                style={{
                                  width:'40px', 
                                  height:'40px', 
                                  borderRadius:'50%', 
                                  objectFit:'cover',
                                  border: '2px solid #FF36A3'
                                }} 
                                alt="" 
                              />
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '150px' }}>
                          <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold',
                            color: isPast ? '#E7632C' : (isToday ? '#FF36A3' : '#C10468'),
                            marginBottom: '5px',
                            fontFamily: "'Shadows Into Light', cursive"
                          }}>
                            {isPast ? '⏰ Passé' : isToday ? '🟢 Aujourd\'hui' : '📅 À venir'}
                          </div>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: '#F8F6F2',
                            fontFamily: "'Protest Riot', sans-serif"
                          }}>
                            {scheduledDate.toLocaleDateString('fr-FR', { 
                              weekday: 'long',
                              day: 'numeric', 
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                          <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold', 
                            color: '#FF36A3', 
                            marginTop: '5px',
                            fontFamily: "'Shadows Into Light', cursive"
                          }}>
                            {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p style={{ 
                textAlign: 'center', 
                color: '#F8F6F2', 
                marginTop: '50px',
                fontFamily: "'Protest Riot', sans-serif"
              }}>
                Aucun match planifié pour le moment.
              </p>
            )}
          </div>
        )}

        {/* ONGLET RÉSULTATS */}
        {activeTab === 'comments' && (
          <div>
            <CommentSection tournamentId={id} session={session} />
          </div>
        )}

        {activeTab === 'results' && (
          <div style={{ 
            background: 'rgba(3, 9, 19, 0.95)', 
            padding: '30px', 
            borderRadius: '15px', 
            border: '2px solid #FF36A3',
            boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: '#FF36A3', 
              marginBottom: '25px',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '2rem'
            }}>
              📊 Résultats des matchs
            </h2>
            
            {matches.filter(m => m.status === 'completed').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {matches
                  .filter(m => m.status === 'completed')
                  .sort((a, b) => {
                    if (a.round_number !== b.round_number) return a.round_number - b.round_number;
                    return a.match_number - b.match_number;
                  })
                  .map(m => (
                    <MatchCard key={m.id} match={m} />
                  ))}
              </div>
            ) : (
              <p style={{ 
                textAlign: 'center', 
                color: '#F8F6F2', 
                marginTop: '50px',
                fontFamily: "'Protest Riot', sans-serif"
              }}>
                Aucun résultat pour le moment.
              </p>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '3px solid #FF36A3', 
        textAlign: 'center', 
        color: '#F8F6F2', 
        fontSize: '0.9rem',
        fontFamily: "'Protest Riot', sans-serif"
      }}>
        <p>Vue publique - Les résultats sont mis à jour en temps réel</p>
        <p style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: '2px solid #C10468',
              color: '#FF36A3',
              padding: '8px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#C10468';
              e.currentTarget.style.borderColor = '#FF36A3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#C10468';
            }}
          >
            ← Retour à l'accueil
          </button>
        </p>
      </div>
      </div>
    </DashboardLayout>
  );
}



