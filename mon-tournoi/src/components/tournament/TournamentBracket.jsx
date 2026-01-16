import React from 'react';

/**
 * Carte de match simple pour les brackets Tournament.jsx
 * (utilise le style de la MatchCard inline de Tournament.jsx)
 */
function BracketMatchCard({ match, onClick }) {
  const hasDisqualified = match.p1_disqualified || match.p2_disqualified;
  const isCompleted = match.status === 'completed';
  const isScheduled = match.scheduled_at && !isCompleted;

  return (
    <div
      onClick={() => onClick(match)}
      style={{
        width: '240px',
        background: hasDisqualified ? '#3a1a1a' : (match.bracket_type === 'losers' ? '#1a1a1a' : '#252525'),
        border: hasDisqualified ? '1px solid #e74c3c' : (isCompleted ? '1px solid #4ade80' : (isScheduled ? '1px solid #3498db' : '1px solid #444')),
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        opacity: hasDisqualified ? 0.7 : 1
      }}
    >
      {isScheduled && (
        <div style={{
          position: 'absolute', top: '5px', right: '5px',
          background: '#3498db', color: 'white',
          padding: '3px 8px', borderRadius: '3px',
          fontSize: '0.7rem', fontWeight: 'bold', zIndex: 10
        }}>
          📅 {new Date(match.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      
      <div style={{
        padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: match.score_p1 > match.score_p2 ? '#2f3b2f' : 'transparent',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {match.player1_id && <img loading="lazy" src={match.p1_avatar} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />}
          <span style={{
            fontSize: '0.9rem', whiteSpace: 'nowrap',
            textDecoration: match.p1_disqualified ? 'line-through' : 'none',
            color: match.p1_disqualified ? '#e74c3c' : 'white'
          }}>
            {match.p1_name?.split(' [')[0] || 'En attente'}
          </span>
        </div>
        <span style={{ fontWeight: 'bold' }}>{match.score_p1 || 0}</span>
      </div>
      
      <div style={{
        padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: match.score_p2 > match.score_p1 ? '#2f3b2f' : 'transparent',
        borderRadius: '0 0 8px 8px', borderTop: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {match.player2_id && <img loading="lazy" src={match.p2_avatar} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />}
          <span style={{
            fontSize: '0.9rem', whiteSpace: 'nowrap',
            textDecoration: match.p2_disqualified ? 'line-through' : 'none',
            color: match.p2_disqualified ? '#e74c3c' : 'white'
          }}>
            {match.p2_name?.split(' [')[0] || 'En attente'}
          </span>
        </div>
        <span style={{ fontWeight: 'bold' }}>{match.score_p2 || 0}</span>
      </div>
    </div>
  );
}
export default function TournamentBracket({ 
  matches, 
  format, 
  onMatchClick 
}) {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-lg text-gray-400">
        Les brackets apparaîtront une fois le tournoi lancé.
      </div>
    );
  }

  // Double Elimination
  if (format === 'double_elimination') {
    return (
      <div className="flex gap-10 pb-5">
        {/* Winners Bracket */}
        <div className="flex-1">
          <h3 className="text-center text-green-400 font-display text-lg mb-4">🏆 Winners Bracket</h3>
          <div className="flex gap-10">
            {[...new Set(matches.filter(m => m.bracket_type === 'winners').map(m => m.round_number))]
              .sort((a, b) => a - b)
              .map(round => (
                <div key={`winners-${round}`} className="flex flex-col justify-around gap-5">
                  {matches
                    .filter(m => m.bracket_type === 'winners' && m.round_number === round)
                    .map(m => (
                      <BracketMatchCard 
                        key={m.id} 
                        match={m} 
                        onClick={onMatchClick} 
                      />
                    ))}
                </div>
              ))}
          </div>
        </div>
        
        {/* Losers Bracket */}
        <div className="flex-1">
          <h3 className="text-center text-red-400 font-display text-lg mb-4">💀 Losers Bracket</h3>
          <div className="flex gap-10">
            {[...new Set(matches.filter(m => m.bracket_type === 'losers').map(m => m.round_number))]
              .sort((a, b) => a - b)
              .map(round => (
                <div key={`losers-${round}`} className="flex flex-col justify-around gap-5">
                  {matches
                    .filter(m => m.bracket_type === 'losers' && m.round_number === round)
                    .map(m => (
                      <BracketMatchCard 
                        key={m.id} 
                        match={m} 
                        onClick={onMatchClick} 
                      />
                    ))}
                </div>
              ))}
          </div>
          
          {/* Grand Finals */}
          {matches.filter(m => !m.bracket_type && !m.is_reset).length > 0 && (
            <div className="mt-10 pt-5 border-t-2 border-white/20">
              <h3 className="text-center text-yellow-400 font-display text-lg mb-4">🏅 Grand Finals</h3>
              <div className="flex justify-center">
                {matches.filter(m => !m.bracket_type && !m.is_reset).map(m => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m} 
                    onClick={onMatchClick} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Reset Match */}
          {matches.filter(m => m.is_reset && m.player1_id && m.player2_id).length > 0 && (
            <div className="mt-5 pt-5 border-t-2 border-white/20">
              <h4 className="text-center text-orange-400 font-body text-sm mb-3">🔄 Reset Match</h4>
              <div className="flex justify-center">
                {matches.filter(m => m.is_reset).map(m => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m} 
                    onClick={onMatchClick} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Swiss System
  if (format === 'swiss') {
    return (
      <div className="flex gap-10 pb-5">
        {[...new Set(matches.map(m => m.round_number))]
          .sort((a, b) => a - b)
          .map(round => (
            <div key={round} className="flex flex-col justify-around gap-5">
              <h4 className="text-center text-blue-400 font-bold font-body">🇨🇭 Round {round}</h4>
              {matches
                .filter(m => m.round_number === round && m.bracket_type === 'swiss')
                .map(m => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m} 
                    onClick={onMatchClick} 
                  />
                ))}
            </div>
          ))}
      </div>
    );
  }

  // Single Elimination ou Round Robin
  return (
    <div className="flex gap-10 pb-5">
      {[...new Set(matches.map(m => m.round_number))]
        .sort((a, b) => a - b)
        .map(round => (
          <div key={round} className="flex flex-col justify-around gap-5">
            <h4 className="text-center text-gray-400 font-body">Round {round}</h4>
            {matches.filter(m => m.round_number === round).map(m => (
              <BracketMatchCard 
                key={m.id} 
                match={m} 
                onClick={onMatchClick} 
              />
            ))}
          </div>
        ))}
    </div>
  );
}
