import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button, Input, Modal } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import clsx from 'clsx';

/**
 * MatchResultEditor - Modal pour éditer les résultats d'un match
 * Supporte les différents formats: BO1, BO3, BO5, manches fixes, etc.
 */
export default function MatchResultEditor({
  match,
  isOpen,
  onClose,
  onSave,
  matchFormat = 'best_of',
  bestOf = 3,
  fixedGames = 1,
}) {
  const [team1Score, setTeam1Score] = useState(match?.team1_score || 0);
  const [team2Score, setTeam2Score] = useState(match?.team2_score || 0);
  const [games, setGames] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(match?.notes || '');

  // Convex mutation for updating match
  const updateMatchMutation = useMutation(api.matchesMutations.updateScore);

  // Initialiser les manches
  useEffect(() => {
    if (isOpen && match) {
      setTeam1Score(match.team1_score || 0);
      setTeam2Score(match.team2_score || 0);
      setNotes(match.notes || '');
      
      // Initialiser les jeux individuels si nécessaire
      if (matchFormat === 'best_of' || matchFormat === 'fixed') {
        const numGames = matchFormat === 'best_of' ? bestOf : fixedGames;
        const existingGames = match.games || [];
        
        const initialGames = Array.from({ length: numGames }, (_, i) => ({
          number: i + 1,
          team1_score: existingGames[i]?.team1_score || 0,
          team2_score: existingGames[i]?.team2_score || 0,
          map: existingGames[i]?.map || '',
          winner: existingGames[i]?.winner || null,
        }));
        setGames(initialGames);
      }
    }
  }, [isOpen, match, matchFormat, bestOf, fixedGames]);

  // Calculer le score total basé sur les manches
  const calculateTotalScore = () => {
    let t1 = 0, t2 = 0;
    games.forEach(game => {
      if (game.team1_score > game.team2_score) t1++;
      else if (game.team2_score > game.team1_score) t2++;
    });
    return { team1: t1, team2: t2 };
  };

  // Vérifier si le match est terminé (pour Best-of)
  const isMatchComplete = () => {
    if (matchFormat === 'best_of') {
      const { team1, team2 } = calculateTotalScore();
      const winsNeeded = Math.ceil(bestOf / 2);
      return team1 >= winsNeeded || team2 >= winsNeeded;
    }
    return true;
  };

  // Déterminer le vainqueur
  const getWinner = () => {
    if (matchFormat === 'best_of' || matchFormat === 'fixed') {
      const { team1, team2 } = calculateTotalScore();
      if (team1 > team2) return 'team1';
      if (team2 > team1) return 'team2';
      return null;
    }
    if (team1Score > team2Score) return 'team1';
    if (team2Score > team1Score) return 'team2';
    return null;
  };

  // Mettre à jour le score d'une manche
  const updateGameScore = (gameIndex, team, score) => {
    setGames(prev => prev.map((game, idx) => {
      if (idx === gameIndex) {
        const newGame = { ...game };
        if (team === 'team1') {
          newGame.team1_score = Math.max(0, parseInt(score) || 0);
        } else {
          newGame.team2_score = Math.max(0, parseInt(score) || 0);
        }
        // Déterminer le winner de cette manche
        if (newGame.team1_score > newGame.team2_score) {
          newGame.winner = 'team1';
        } else if (newGame.team2_score > newGame.team1_score) {
          newGame.winner = 'team2';
        } else {
          newGame.winner = null;
        }
        return newGame;
      }
      return game;
    }));
  };

  // Mettre à jour la map d'une manche
  const updateGameMap = (gameIndex, map) => {
    setGames(prev => prev.map((game, idx) => 
      idx === gameIndex ? { ...game, map } : game
    ));
  };

  // Sauvegarder les résultats
  const handleSave = async () => {
    setSaving(true);
    try {
      const winner = getWinner();
      let finalTeam1Score = team1Score;
      let finalTeam2Score = team2Score;

      // Calculer les scores basés sur les manches
      if (matchFormat === 'best_of' || matchFormat === 'fixed') {
        const totals = calculateTotalScore();
        finalTeam1Score = totals.team1;
        finalTeam2Score = totals.team2;
      }

      const winnerId = winner === 'team1' ? match.team1_id : (winner === 'team2' ? match.team2_id : undefined);

      // Use Convex mutation
      await updateMatchMutation({
        matchId: match._id || match.id,
        scoreTeam1: finalTeam1Score,
        scoreTeam2: finalTeam2Score,
        winnerId: winnerId,
      });

      // Store additional data (games, notes) if needed
      // Note: For full migration, add games and notes fields to the mutation

      toast.success('Résultat sauvegardé');
      const updateData = {
        team1_score: finalTeam1Score,
        team2_score: finalTeam2Score,
        winner_id: winnerId,
        status: winner ? 'completed' : 'in_progress',
        games: games.length > 0 ? games : null,
        notes: notes,
      };
      onSave?.(updateData);
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Reset le match
  const handleReset = async () => {
    if (!confirm('Réinitialiser les résultats de ce match ?')) return;

    setSaving(true);
    try {
      // Use Convex mutation to reset
      await updateMatchMutation({
        matchId: match._id || match.id,
        scoreTeam1: 0,
        scoreTeam2: 0,
        winnerId: undefined,
      });

      toast.success('Match réinitialisé');
      onSave?.({ reset: true });
      onClose();
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setSaving(false);
    }
  };

  if (!match) return null;

  const totals = calculateTotalScore();
  const matchWinner = getWinner();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Résultat du match"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header avec les équipes */}
        <div className="flex items-center justify-between gap-4 p-4 bg-[#1e2235] rounded-xl">
          {/* Équipe 1 */}
          <div className={clsx(
            'flex-1 text-center p-4 rounded-lg transition-all',
            matchWinner === 'team1' ? 'bg-green-500/20 ring-2 ring-green-500/50' : 'bg-white/5'
          )}>
            <div className="w-12 h-12 mx-auto mb-2 bg-violet/20 rounded-full flex items-center justify-center">
              {match.team1?.logo_url ? (
                <img src={match.team1.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-violet font-bold">{match.team1?.name?.[0] || '?'}</span>
              )}
            </div>
            <p className="font-medium text-white">{match.team1?.name || 'Équipe 1'}</p>
            {matchFormat === 'best_of' || matchFormat === 'fixed' ? (
              <p className="text-2xl font-bold text-cyan-400 mt-2">{totals.team1}</p>
            ) : null}
          </div>

          {/* VS */}
          <div className="text-gray-500 font-display text-xl">VS</div>

          {/* Équipe 2 */}
          <div className={clsx(
            'flex-1 text-center p-4 rounded-lg transition-all',
            matchWinner === 'team2' ? 'bg-green-500/20 ring-2 ring-green-500/50' : 'bg-white/5'
          )}>
            <div className="w-12 h-12 mx-auto mb-2 bg-violet/20 rounded-full flex items-center justify-center">
              {match.team2?.logo_url ? (
                <img src={match.team2.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-violet font-bold">{match.team2?.name?.[0] || '?'}</span>
              )}
            </div>
            <p className="font-medium text-white">{match.team2?.name || 'Équipe 2'}</p>
            {matchFormat === 'best_of' || matchFormat === 'fixed' ? (
              <p className="text-2xl font-bold text-cyan-400 mt-2">{totals.team2}</p>
            ) : null}
          </div>
        </div>

        {/* Score simple (sans manches) */}
        {matchFormat === 'none' || matchFormat === 'single' ? (
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <label className="block text-sm text-gray-400 mb-2">{match.team1?.name || 'Équipe 1'}</label>
              <Input
                type="number"
                value={team1Score}
                onChange={(e) => setTeam1Score(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                className="w-24 text-center text-2xl bg-[#1e2235] border-white/10"
              />
            </div>
            <span className="text-gray-500 text-2xl">-</span>
            <div className="text-center">
              <label className="block text-sm text-gray-400 mb-2">{match.team2?.name || 'Équipe 2'}</label>
              <Input
                type="number"
                value={team2Score}
                onChange={(e) => setTeam2Score(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                className="w-24 text-center text-2xl bg-[#1e2235] border-white/10"
              />
            </div>
          </div>
        ) : null}

        {/* Manches (Best-of ou fixe) */}
        {(matchFormat === 'best_of' || matchFormat === 'fixed') && games.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">
              Manches ({matchFormat === 'best_of' ? `Best of ${bestOf}` : `${fixedGames} manches`})
            </h3>
            
            {games.map((game, idx) => {
              // Pour Best-of, ne montrer que les manches nécessaires
              if (matchFormat === 'best_of') {
                const winsNeeded = Math.ceil(bestOf / 2);
                const team1Wins = games.slice(0, idx).filter(g => g.winner === 'team1').length;
                const team2Wins = games.slice(0, idx).filter(g => g.winner === 'team2').length;
                if (team1Wins >= winsNeeded || team2Wins >= winsNeeded) {
                  return null;
                }
              }

              return (
                <div 
                  key={idx}
                  className={clsx(
                    'flex items-center gap-4 p-3 rounded-lg',
                    game.winner ? 'bg-[#2a2d3e]' : 'bg-[#1e2235]'
                  )}
                >
                  <span className="text-sm text-gray-500 w-20">Manche {game.number}</span>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      value={game.team1_score}
                      onChange={(e) => updateGameScore(idx, 'team1', e.target.value)}
                      min={0}
                      className={clsx(
                        'w-16 text-center bg-[#1e2235] border-white/10',
                        game.winner === 'team1' && 'ring-2 ring-green-500/50'
                      )}
                    />
                    <span className="text-gray-500">-</span>
                    <Input
                      type="number"
                      value={game.team2_score}
                      onChange={(e) => updateGameScore(idx, 'team2', e.target.value)}
                      min={0}
                      className={clsx(
                        'w-16 text-center bg-[#1e2235] border-white/10',
                        game.winner === 'team2' && 'ring-2 ring-green-500/50'
                      )}
                    />
                  </div>

                  <Input
                    value={game.map}
                    onChange={(e) => updateGameMap(idx, e.target.value)}
                    placeholder="Map (optionnel)"
                    className="w-32 text-sm bg-[#1e2235] border-white/10"
                  />

                  {game.winner && (
                    <span className="text-green-400 text-sm">
                      ✓ {game.winner === 'team1' ? match.team1?.name : match.team2?.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Aller-Retour */}
        {matchFormat === 'home_away' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#1e2235] rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Match Aller</h4>
              <div className="flex items-center justify-center gap-4">
                <Input
                  type="number"
                  value={games[0]?.team1_score || 0}
                  onChange={(e) => updateGameScore(0, 'team1', e.target.value)}
                  min={0}
                  className="w-20 text-center bg-[#2a2d3e] border-white/10"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  value={games[0]?.team2_score || 0}
                  onChange={(e) => updateGameScore(0, 'team2', e.target.value)}
                  min={0}
                  className="w-20 text-center bg-[#2a2d3e] border-white/10"
                />
              </div>
            </div>
            
            <div className="p-4 bg-[#1e2235] rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Match Retour</h4>
              <div className="flex items-center justify-center gap-4">
                <Input
                  type="number"
                  value={games[1]?.team1_score || 0}
                  onChange={(e) => updateGameScore(1, 'team1', e.target.value)}
                  min={0}
                  className="w-20 text-center bg-[#2a2d3e] border-white/10"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  value={games[1]?.team2_score || 0}
                  onChange={(e) => updateGameScore(1, 'team2', e.target.value)}
                  min={0}
                  className="w-20 text-center bg-[#2a2d3e] border-white/10"
                />
              </div>
            </div>

            <div className="text-center text-sm text-gray-400">
              Score cumulé: {(games[0]?.team1_score || 0) + (games[1]?.team1_score || 0)} - {(games[0]?.team2_score || 0) + (games[1]?.team2_score || 0)}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajouter des notes sur ce match..."
            className="w-full px-4 py-2 bg-[#1e2235] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-violet focus:outline-none resize-none h-20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <Button
            onClick={handleReset}
            variant="secondary"
            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            disabled={saving}
          >
            ↺ Réinitialiser
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="bg-[#2a2d3e] border-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              {saving ? '⏳ Sauvegarde...' : '✓ Valider'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
