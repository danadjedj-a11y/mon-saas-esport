import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import clsx from 'clsx';

/**
 * OrganizerLayout - Layout original pour la gestion de tournoi
 * Design unique avec header fixe + navigation par onglets + sidebar contextuelle
 */
export default function OrganizerLayout({ session, tournament: tournamentProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  
  const [tournament, setTournament] = useState(tournamentProp || null);
  const [phases, setPhases] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(!tournamentProp);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Charger le tournoi
  useEffect(() => {
    if (tournamentProp) {
      setTournament(tournamentProp);
      setLoading(false);
      return;
    }
    
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const fetchTournament = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
        
        if (error) throw error;
        setTournament(data);
      } catch (error) {
        console.error('Erreur chargement tournoi:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId, tournamentProp]);

  // Charger les données complémentaires
  useEffect(() => {
    if (!tournamentId) return;

    const fetchData = async () => {
      const [phasesRes, participantsRes, matchesRes] = await Promise.all([
        supabase.from('tournament_phases').select('*').eq('tournament_id', tournamentId).order('phase_order'),
        supabase.from('participants').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId),
      ]);
      
      setPhases(phasesRes.data || []);
      setParticipantCount(participantsRes.count || 0);
      setMatchCount(matchesRes.count || 0);
    };

    fetchData();
  }, [tournamentId]);

  const basePath = `/organizer/tournament/${tournamentId}`;

  // Navigation principale par onglets
  const mainTabs = useMemo(() => [
    { id: 'overview', label: 'Aperçu', path: basePath, icon: '📊' },
    { id: 'settings', label: 'Configuration', path: `${basePath}/settings/general`, icon: '⚙️', matchPath: '/settings' },
    { id: 'structure', label: 'Structure', path: `${basePath}/structure`, icon: '🏗️' },
    { id: 'participants', label: 'Participants', path: `${basePath}/participants`, icon: '👥', badge: participantCount },
    { id: 'matches', label: 'Matchs', path: `${basePath}/matches`, icon: '⚔️', badge: matchCount },
    { id: 'sharing', label: 'Partage', path: `${basePath}/sharing/public`, icon: '🔗', matchPath: '/sharing' },
  ], [basePath, participantCount, matchCount]);

  const isTabActive = (tab) => {
    if (tab.matchPath) {
      return location.pathname.includes(tab.matchPath);
    }
    if (tab.path === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(tab.path);
  };

  // Sous-navigation contextuelle selon l'onglet actif
  const getSubNav = () => {
    const path = location.pathname;
    
    if (path.includes('/settings')) {
      return [
        { label: 'Général', path: `${basePath}/settings/general` },
        { label: 'Apparence', path: `${basePath}/settings/appearance` },
        { label: 'Jeu', path: `${basePath}/settings/discipline` },
        { label: 'Matchs', path: `${basePath}/settings/match` },
        { label: 'Inscriptions', path: `${basePath}/settings/registration` },
      ];
    }
    
    if (path.includes('/participants')) {
      return [
        { label: 'Liste', path: `${basePath}/participants` },
        { label: 'Édition groupée', path: `${basePath}/participants/bulk-edit` },
        { label: 'Export', path: `${basePath}/participants/export` },
      ];
    }
    
    if (path.includes('/matches')) {
      return [
        { label: 'Tous les matchs', path: `${basePath}/matches` },
        ...phases.map((p, i) => ({ label: `Phase ${i + 1}`, path: `${basePath}/matches/phase/${p.id}` })),
      ];
    }

    if (path.includes('/sharing')) {
      return [
        { label: 'Page publique', path: `${basePath}/sharing/public` },
        { label: 'Widgets', path: `${basePath}/sharing/widgets` },
        { label: 'Mode TV', path: `${basePath}/sharing/tv` },
      ];
    }
    
    return null;
  };

  const subNav = getSubNav();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'ongoing': return { label: 'En cours', color: 'bg-green-500', textColor: 'text-green-400' };
      case 'completed': return { label: 'Terminé', color: 'bg-blue-500', textColor: 'text-blue-400' };
      default: return { label: 'Brouillon', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statusInfo = tournament ? getStatusInfo(tournament.status) : null;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header Fixe */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#161b22] border-b border-white/10">
        {/* Barre supérieure */}
        <div className="h-14 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Retour */}
            <Link 
              to="/organizer/dashboard" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <span className="text-lg">←</span>
              <span className="hidden sm:inline text-sm">Mes tournois</span>
            </Link>
            
            <div className="h-6 w-px bg-white/10" />
            
            {/* Nom du tournoi */}
            {tournament && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">
                  🏆
                </div>
                <div>
                  <h1 className="font-display font-semibold text-white text-sm leading-tight truncate max-w-[200px] md:max-w-[300px]">
                    {tournament.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{tournament.game}</span>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', statusInfo?.color)} />
                    <span className={clsx('text-xs', statusInfo?.textColor)}>{statusInfo?.label}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open(`/tournament/${tournamentId}`, '_blank')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <span>👁️</span>
              <span>Voir public</span>
            </button>
            
            <Link
              to={`${basePath}/settings/general`}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <span>⚙️</span>
            </Link>

            {/* Menu mobile */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="px-6 flex gap-1 overflow-x-auto scrollbar-hide">
          {mainTabs.map(tab => {
            const active = isTabActive(tab);
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  active
                    ? 'border-cyan-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sous-navigation contextuelle */}
        {subNav && (
          <div className="px-6 py-2 bg-[#0d1117] border-t border-white/5 flex gap-1 overflow-x-auto">
            {subNav.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                    active
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Menu mobile overlay */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-14 right-0 w-64 h-[calc(100%-3.5rem)] bg-[#161b22] border-l border-white/10 z-50 overflow-y-auto">
            <nav className="p-4 space-y-2">
              {mainTabs.map(tab => (
                <Link
                  key={tab.id}
                  to={tab.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm',
                    isTabActive(tab)
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Contenu principal */}
      <main className={clsx(
        'pt-[7rem]', // header + tabs
        subNav && 'pt-[9rem]' // + sub nav
      )}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet context={{ tournament, phases, session, refreshPhases: () => {} }} />
        </div>
      </main>

      {/* Quick Actions Bar (fixe en bas sur desktop) */}
      <div className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1e2235] rounded-full border border-white/10 shadow-xl">
          <QuickAction 
            icon="▶️" 
            label="Démarrer" 
            onClick={() => {}} 
            disabled={tournament?.status === 'ongoing'}
          />
          <div className="w-px h-6 bg-white/10" />
          <QuickAction 
            icon="👥" 
            label="Ajouter participant" 
            onClick={() => navigate(`${basePath}/participants`)} 
          />
          <QuickAction 
            icon="📊" 
            label="Générer matchs" 
            onClick={() => navigate(`${basePath}/structure`)} 
          />
          <div className="w-px h-6 bg-white/10" />
          <QuickAction 
            icon="🔗" 
            label="Partager" 
            onClick={() => navigate(`${basePath}/sharing/public`)} 
          />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        disabled
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      )}
    >
      <span>{icon}</span>
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
