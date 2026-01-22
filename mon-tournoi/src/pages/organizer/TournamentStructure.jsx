import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button, Card, Modal } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import { generateBracketMatches, calculateMatchCount } from '../../utils/matchGenerator';
import PhaseCreator from '../../components/phases/PhaseCreator';

// Icônes pour les types de phases
const PHASE_ICONS = {
  elimination: '/icons/bracket-single.svg',
  double_elimination: '/icons/bracket-double.svg',
  round_robin: '/icons/round-robin.svg',
  swiss: '/icons/swiss.svg',
  gauntlet: '/icons/gauntlet.svg',
  groups: '/icons/groups.svg',
  custom: '/icons/custom.svg',
  league: '/icons/league.svg',
};

const PHASE_LABELS = {
  elimination: 'Élimination directe',
  double_elimination: 'Double élimination',
  round_robin: 'Groupes "round-robin"',
  swiss: 'Système suisse',
  gauntlet: 'Gauntlet',
  groups: 'Groupes d\'arbres',
  custom: 'Arbre personnalisé',
  league: 'Système de ligue',
};

/**
 * PhaseCard - Carte d'une phase existante
 */
function PhaseCard({ phase, index, onConfigure, onDelete, onEditBracket, onGenerateMatches }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const matchCount = calculateMatchCount(phase.format, phase.config?.size || 8, phase.config);

  return (
    <div className="bg-[#2a2d3e] rounded-xl p-6 border border-white/10 hover:border-violet/30 transition-all group relative">
      {/* Illustration */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-16 bg-white/5 rounded-lg flex items-center justify-center">
          {/* SVG illustration du type de bracket */}
          <svg viewBox="0 0 100 60" className="w-20 h-12 text-violet/50">
            {phase.format === 'double_elimination' ? (
              // Double elimination bracket
              <>
                <line x1="10" y1="10" x2="30" y2="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="10" y1="25" x2="30" y2="25" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="10" x2="30" y2="25" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="17" x2="50" y2="17" stroke="currentColor" strokeWidth="2"/>
                <line x1="50" y1="17" x2="50" y2="30" stroke="currentColor" strokeWidth="2"/>
                <line x1="50" y1="30" x2="70" y2="30" stroke="currentColor" strokeWidth="2"/>
                {/* Losers bracket */}
                <line x1="10" y1="45" x2="30" y2="45" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="30" y1="45" x2="50" y2="45" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                <line x1="50" y1="45" x2="50" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              </>
            ) : phase.format === 'round_robin' ? (
              // Round robin
              <>
                <circle cx="25" cy="15" r="6" stroke="currentColor" fill="none" strokeWidth="2"/>
                <circle cx="75" cy="15" r="6" stroke="currentColor" fill="none" strokeWidth="2"/>
                <circle cx="25" cy="45" r="6" stroke="currentColor" fill="none" strokeWidth="2"/>
                <circle cx="75" cy="45" r="6" stroke="currentColor" fill="none" strokeWidth="2"/>
                <line x1="31" y1="15" x2="69" y2="15" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="31" y1="45" x2="69" y2="45" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="25" y1="21" x2="25" y2="39" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="75" y1="21" x2="75" y2="39" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="30" y1="20" x2="70" y2="40" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="30" y1="40" x2="70" y2="20" stroke="currentColor" strokeWidth="1.5"/>
              </>
            ) : (
              // Single elimination default
              <>
                <line x1="10" y1="10" x2="30" y2="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="10" y1="25" x2="30" y2="25" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="10" x2="30" y2="25" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="17" x2="50" y2="17" stroke="currentColor" strokeWidth="2"/>
                <line x1="10" y1="40" x2="30" y2="40" stroke="currentColor" strokeWidth="2"/>
                <line x1="10" y1="55" x2="30" y2="55" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="40" x2="30" y2="55" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="47" x2="50" y2="47" stroke="currentColor" strokeWidth="2"/>
                <line x1="50" y1="17" x2="50" y2="47" stroke="currentColor" strokeWidth="2"/>
                <line x1="50" y1="32" x2="70" y2="32" stroke="currentColor" strokeWidth="2"/>
                <circle cx="80" cy="32" r="6" fill="currentColor" className="text-cyan/50"/>
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Phase Info */}
      <div className="text-center mb-4">
        <h3 className="font-display font-semibold text-white text-lg">
          {index + 1}. {phase.name}
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          {PHASE_LABELS[phase.format] || phase.format}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {matchCount} matchs • {phase.config?.size || 8} équipes
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onConfigure(phase)}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
        >
          Configurer
        </button>
        
        {/* Menu contextuel */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            ⋮
          </button>
          
          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 bg-[#1e2235] border border-white/10 rounded-lg shadow-xl z-20 py-1 min-w-[180px]">
                <button
                  onClick={() => {
                    onEditBracket(phase);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  🏗️ Modifier l'arbre
                </button>
                <button
                  onClick={() => {
                    onConfigure(phase);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  ⚙️ Paramètres
                </button>
                <button
                  onClick={() => {
                    onGenerateMatches(phase);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  🔄 Générer les matchs
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => {
                    onDelete(phase);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      {phase.status && (
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 text-xs rounded-full ${
            phase.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            phase.status === 'ongoing' ? 'bg-cyan-500/20 text-cyan-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {phase.status === 'completed' ? '✓ Terminé' :
             phase.status === 'ongoing' ? '▶ En cours' : 'Brouillon'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * CreatePhaseCard - Carte pour créer une nouvelle phase
 */
function CreatePhaseCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-[#2a2d3e]/50 rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-green-500/50 hover:bg-[#2a2d3e] transition-all group min-h-[200px] flex flex-col items-center justify-center"
    >
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
        <span className="text-4xl text-green-500">+</span>
      </div>
      <span className="text-gray-400 group-hover:text-white transition-colors font-medium">
        Créer une nouvelle phase
      </span>
    </button>
  );
}

/**
 * TournamentStructure - Page principale de gestion de la structure
 */
export default function TournamentStructure() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const _tournament = context?.tournament;
  
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);

  // Charger les phases
  useEffect(() => {
    fetchPhases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchPhases = async () => {
    if (!tournamentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_phases')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('phase_order', { ascending: true });

      if (error) {
        // Si la table n'existe pas encore, on affiche juste une liste vide
        console.log('Phases table might not exist yet:', error);
        setPhases([]);
      } else {
        setPhases(data || []);
      }
    } catch (error) {
      console.error('Erreur chargement phases:', error);
      setPhases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = (phase) => {
    navigate(`/organizer/tournament/${tournamentId}/structure/${phase.id}/settings`);
  };

  const handleEditBracket = (phase) => {
    navigate(`/organizer/tournament/${tournamentId}/structure/${phase.id}/bracket`);
  };

  const handleDelete = async (phase) => {
    if (!confirm(`Supprimer la phase "${phase.name}" ? Cette action est irréversible.`)) return;

    try {
      const { error } = await supabase
        .from('tournament_phases')
        .delete()
        .eq('id', phase.id);

      if (error) throw error;

      toast.success('Phase supprimée');
      fetchPhases();
    } catch (error) {
      toast.error('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleGenerateMatches = async (phase) => {
    const matchCount = calculateMatchCount(phase.format, phase.config?.size || 8, phase.config);
    
    if (!confirm(`Cela va générer ${matchCount} matchs pour la phase "${phase.name}". Les matchs existants seront supprimés. Continuer ?`)) {
      return;
    }

    try {
      const matches = await generateBracketMatches(phase, tournamentId);
      toast.success(`✓ ${matches.length} matchs générés avec succès !`);
    } catch (error) {
      console.error('Erreur génération matchs:', error);
      toast.error('Erreur lors de la génération des matchs');
    }
  };

  const handlePhaseCreated = (newPhase) => {
    setShowCreator(false);
    toast.success(`Phase "${newPhase.name}" créée avec succès`);
    fetchPhases();
    // Rediriger vers l'éditeur de bracket
    navigate(`/organizer/tournament/${tournamentId}/structure/${newPhase.id}/bracket`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement de la structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Structure
        </h1>
        <p className="text-gray-400">
          Configurez les phases de votre tournoi. Vous pouvez créer plusieurs phases
          (Qualifications, Playoffs, etc.) avec différents formats.
        </p>
      </div>

      {/* Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Phases existantes */}
        {phases.map((phase, index) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            index={index}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
            onEditBracket={handleEditBracket}
            onGenerateMatches={handleGenerateMatches}
          />
        ))}

        {/* Bouton créer nouvelle phase */}
        <CreatePhaseCard onClick={() => setShowCreator(true)} />
      </div>

      {/* Info si pas de phases */}
      {phases.length === 0 && (
        <div className="mt-8 p-6 bg-violet/10 border border-violet/30 rounded-xl">
          <div className="flex items-start gap-4">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-display font-semibold text-white mb-2">
                Commencez par créer une phase
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Une phase définit le format de compétition (élimination directe, double élimination, 
                round-robin, etc.). Vous pouvez créer plusieurs phases pour un tournoi complexe, 
                par exemple des qualifications suivies de playoffs.
              </p>
              <Button 
                onClick={() => setShowCreator(true)}
                className="bg-violet hover:bg-violet-dark"
              >
                + Créer ma première phase
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création de phase */}
      <Modal
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        title=""
        size="xl"
        className="max-w-4xl"
      >
        <PhaseCreator
          tournamentId={tournamentId}
          phaseOrder={(phases.length || 0) + 1}
          onPhaseCreated={handlePhaseCreated}
          onCancel={() => setShowCreator(false)}
        />
      </Modal>
    </div>
  );
}
