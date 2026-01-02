import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getSwissScores } from '../swissUtils';
import { calculateMatchWinner } from '../bofUtils';

export default function StreamOverlay() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'bracket'; // 'bracket', 'score', 'standings'
  
  const [tournoi, setTournoi] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchGames, setMatchGames] = useState([]);
  const [swissScores, setSwissScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMatch, setCurrentMatch] = useState(null);

  useEffect(() => {
    fetchData();

    // Temps réel pour les overlays
    const channel = supabase.channel('stream-overlay-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_games' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swiss_scores', filter: `tournament_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  const fetchData = async () => {
    try {
      // Tournoi
      const { data: tData } = await supabase.from('tournaments').select('*').eq('id', id).single();
      setTournoi(tData);

      // Participants
      const { data: pData } = await supabase
        .from('participants')
        .select('*, teams(*)')
        .eq('tournament_id', id)
        .order('seed_order', { ascending: true, nullsLast: true });
      setParticipants(pData || []);

      // Matchs
      const { data: mData } = await supabase.from('matches').select('*').eq('tournament_id', id).order('match_number');

      if (mData && mData.length > 0 && pData) {
        const participantsMap = new Map(pData.map(p => [p.team_id, p]));
        
        const enrichedMatches = mData.map(match => {
          const p1 = match.player1_id ? participantsMap.get(match.player1_id) : null;
          const p2 = match.player2_id ? participantsMap.get(match.player2_id) : null;
          
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

        // Match en cours (premier match pending ou le dernier completed)
        const pendingMatch = enrichedMatches.find(m => m.status === 'pending' && m.player1_id && m.player2_id);
        const lastCompleted = enrichedMatches.filter(m => m.status === 'completed').sort((a, b) => b.match_number - a.match_number)[0];
        setCurrentMatch(pendingMatch || lastCompleted || null);

        // Match Games pour Best-of-X
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
        }
      }

      // Swiss Scores
      if (tData?.format === 'swiss') {
        const scores = await getSwissScores(supabase, id);
        setSwissScores(scores);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur fetchData overlay:', error);
      setLoading(false);
    }
  };

  // Style global pour overlay (fond transparent, texte visible)
  const overlayStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    borderRadius: '10px',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255, 255, 255, 0.2)'
  };

  if (loading) {
    return (
      <div style={{ ...overlayStyle, textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '1.5rem' }}>Chargement...</div>
      </div>
    );
  }

  if (!tournoi) {
    return (
      <div style={{ ...overlayStyle, textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '1.5rem', color: '#e74c3c' }}>Tournoi introuvable</div>
      </div>
    );
  }

  // Overlay Type: BRACKET
  if (type === 'bracket') {
    const rounds = [...new Set(matches.map(m => m.round_number))].sort();
    
    return (
      <div style={{ ...overlayStyle, maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{tournoi.name}</h2>
          <div style={{ fontSize: '1.2rem', color: '#aaa', marginTop: '5px' }}>{tournoi.game}</div>
        </div>
        
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {rounds.map(round => {
            const roundMatches = matches.filter(m => m.round_number === round);
            return (
              <div key={round} style={{ minWidth: '280px' }}>
                <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '1.3rem', fontWeight: 'bold', color: '#00d4ff' }}>
                  Round {round}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {roundMatches.map(match => {
                    const isCompleted = match.status === 'completed';
                    const isPending = match.status === 'pending' && match.player1_id && match.player2_id;
                    
                    return (
                      <div
                        key={match.id}
                        style={{
                          background: isCompleted ? 'rgba(74, 222, 128, 0.2)' : isPending ? 'rgba(52, 152, 219, 0.2)' : 'rgba(255,255,255,0.1)',
                          border: isCompleted ? '2px solid #4ade80' : isPending ? '2px solid #3498db' : '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          padding: '15px',
                          minWidth: '250px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          {match.p1_avatar && <img src={match.p1_avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                          <span style={{ fontWeight: isCompleted && (match.score_p1 || 0) > (match.score_p2 || 0) ? 'bold' : 'normal', fontSize: '1.1rem' }}>
                            {match.p1_name.split(' [')[0]}
                          </span>
                          {isCompleted && (
                            <span style={{ marginLeft: 'auto', fontSize: '1.3rem', fontWeight: 'bold' }}>
                              {match.score_p1 || 0}
                            </span>
                          )}
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '8px 0' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {match.p2_avatar && <img src={match.p2_avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                          <span style={{ fontWeight: isCompleted && (match.score_p2 || 0) > (match.score_p1 || 0) ? 'bold' : 'normal', fontSize: '1.1rem' }}>
                            {match.p2_name.split(' [')[0]}
                          </span>
                          {isCompleted && (
                            <span style={{ marginLeft: 'auto', fontSize: '1.3rem', fontWeight: 'bold' }}>
                              {match.score_p2 || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Overlay Type: SCORE (Match actuel)
  if (type === 'score') {
    if (!currentMatch) {
      return (
        <div style={{ ...overlayStyle, textAlign: 'center', padding: '50px', minWidth: '400px' }}>
          <div style={{ fontSize: '1.5rem' }}>Aucun match en cours</div>
        </div>
      );
    }

    const isBestOf = tournoi.best_of > 1;
    let bestOfScore = null;
    if (isBestOf) {
      const matchGamesData = matchGames.filter(g => g.match_id === currentMatch.id);
      if (matchGamesData.length > 0) {
        const result = calculateMatchWinner(matchGamesData, tournoi.best_of, currentMatch.player1_id, currentMatch.player2_id);
        bestOfScore = {
          team1Wins: result.team1Wins,
          team2Wins: result.team2Wins,
          completedGames: matchGamesData.filter(g => g.status === 'completed').length
        };
      }
    }

    const displayScore1 = isBestOf && bestOfScore ? bestOfScore.team1Wins : (currentMatch.score_p1 || 0);
    const displayScore2 = isBestOf && bestOfScore ? bestOfScore.team2Wins : (currentMatch.score_p2 || 0);
    const isCompleted = currentMatch.status === 'completed';

    return (
      <div style={{ ...overlayStyle, minWidth: '500px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#aaa' }}>
          {tournoi.name} - {tournoi.game}
        </div>
        {isBestOf && bestOfScore && (
          <div style={{ marginBottom: '15px', fontSize: '1rem', color: '#00d4ff', fontWeight: 'bold' }}>
            Best-of-{tournoi.best_of} - Manche {bestOfScore.completedGames}/{tournoi.best_of}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '30px' }}>
          <div style={{ flex: 1 }}>
            {currentMatch.p1_avatar && (
              <img src={currentMatch.p1_avatar} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px', border: '3px solid white' }} />
            )}
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
              {currentMatch.p1_name.split(' [')[0]}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: isCompleted && displayScore1 > displayScore2 ? '#4ade80' : '#fff' }}>
              {displayScore1}
            </div>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#aaa' }}>VS</div>
          <div style={{ flex: 1 }}>
            {currentMatch.p2_avatar && (
              <img src={currentMatch.p2_avatar} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px', border: '3px solid white' }} />
            )}
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
              {currentMatch.p2_name.split(' [')[0]}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: isCompleted && displayScore2 > displayScore1 ? '#4ade80' : '#fff' }}>
              {displayScore2}
            </div>
          </div>
        </div>
        {isCompleted && (
          <div style={{ marginTop: '20px', fontSize: '1.2rem', color: '#4ade80', fontWeight: 'bold' }}>
            ✅ Match terminé
          </div>
        )}
        {!isCompleted && currentMatch.scheduled_at && (
          <div style={{ marginTop: '20px', fontSize: '1rem', color: '#3498db' }}>
            📅 {new Date(currentMatch.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        )}
      </div>
    );
  }

  // Overlay Type: STANDINGS (Classement)
  if (type === 'standings') {
    if (tournoi.format === 'swiss' && swissScores.length > 0) {
      const sortedScores = [...swissScores].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.buchholz_score !== a.buchholz_score) return b.buchholz_score - a.buchholz_score;
        return 0;
      });

      return (
        <div style={{ ...overlayStyle, maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{tournoi.name}</h2>
            <div style={{ fontSize: '1.2rem', color: '#aaa', marginTop: '5px' }}>🇨🇭 Classement Suisse</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedScores.slice(0, 10).map((score, index) => {
              const team = participants.find(p => p.team_id === score.team_id);
              return (
                <div
                  key={score.id}
                  style={{
                    background: index === 0 ? 'rgba(241, 196, 15, 0.2)' : 'rgba(255,255,255,0.1)',
                    border: index === 0 ? '2px solid #f1c40f' : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    padding: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '50px', textAlign: 'center', color: index === 0 ? '#f1c40f' : '#fff' }}>
                    #{index + 1}
                  </div>
                  {team?.teams?.logo_url && (
                    <img src={team.teams.logo_url} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1, fontSize: '1.3rem', fontWeight: 'bold' }}>
                    {team?.teams?.name || 'Inconnu'}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '1.2rem' }}>
                    <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>V: {score.wins}</div>
                    <div style={{ color: '#e74c3c' }}>D: {score.losses}</div>
                    <div style={{ color: '#f39c12' }}>N: {score.draws}</div>
                    <div style={{ color: '#3498db', fontWeight: 'bold' }}>BH: {parseFloat(score.buchholz_score || 0).toFixed(1)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Pour les autres formats, calculer le classement depuis les matchs
    const teamStats = new Map();
    participants.forEach(p => {
      teamStats.set(p.team_id, {
        teamId: p.team_id,
        name: p.teams?.name || 'Inconnu',
        tag: p.teams?.tag || '?',
        logo: p.teams?.logo_url,
        wins: 0,
        losses: 0,
        draws: 0
      });
    });

    matches.filter(m => m.status === 'completed').forEach(m => {
      if (m.player1_id && teamStats.has(m.player1_id)) {
        const stats = teamStats.get(m.player1_id);
        if ((m.score_p1 || 0) > (m.score_p2 || 0)) stats.wins++;
        else if ((m.score_p1 || 0) < (m.score_p2 || 0)) stats.losses++;
        else stats.draws++;
      }
      if (m.player2_id && teamStats.has(m.player2_id)) {
        const stats = teamStats.get(m.player2_id);
        if ((m.score_p2 || 0) > (m.score_p1 || 0)) stats.wins++;
        else if ((m.score_p2 || 0) < (m.score_p1 || 0)) stats.losses++;
        else stats.draws++;
      }
    });

    const sortedTeams = Array.from(teamStats.values()).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });

    return (
      <div style={{ ...overlayStyle, maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{tournoi.name}</h2>
          <div style={{ fontSize: '1.2rem', color: '#aaa', marginTop: '5px' }}>🏆 Classement</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedTeams.slice(0, 10).map((team, index) => (
            <div
              key={team.teamId}
              style={{
                background: index === 0 ? 'rgba(241, 196, 15, 0.2)' : 'rgba(255,255,255,0.1)',
                border: index === 0 ? '2px solid #f1c40f' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '50px', textAlign: 'center', color: index === 0 ? '#f1c40f' : '#fff' }}>
                #{index + 1}
              </div>
              {team.logo && (
                <img src={team.logo} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <div style={{ flex: 1, fontSize: '1.3rem', fontWeight: 'bold' }}>{team.name}</div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '1.2rem' }}>
                <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>V: {team.wins}</div>
                <div style={{ color: '#e74c3c' }}>D: {team.losses}</div>
                <div style={{ color: '#f39c12' }}>N: {team.draws}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...overlayStyle, textAlign: 'center', padding: '50px' }}>
      <div style={{ fontSize: '1.5rem', color: '#e74c3c' }}>Type d'overlay invalide</div>
      <div style={{ marginTop: '20px', color: '#aaa' }}>
        Types disponibles: bracket, score, standings
      </div>
    </div>
  );
}

