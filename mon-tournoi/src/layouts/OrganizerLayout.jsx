import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

/**
 * OrganizerLayout - Layout principal pour l'interface Organizer
 * Inspiré de Toornament avec navigation latérale et sous-menus
 */
export default function OrganizerLayout({ session, tournament: tournamentProp }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  
  const [tournament, setTournament] = useState(tournamentProp || null);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(!tournamentProp);
  const [expandedMenus, setExpandedMenus] = useState({
    parametres: false,
    participants: false,
    placement: false,
    matchs: false,
    partage: false,
  });

  // Charger le tournoi si pas fourni en prop
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

  // Charger les phases du tournoi
  useEffect(() => {
    if (!tournamentId) return;

    const fetchPhases = async () => {
      try {
        const { data, error } = await supabase
          .from('tournament_phases')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('phase_order', { ascending: true });
        
        if (!error && data) {
          setPhases(data);
        }
      } catch (error) {
        console.error('Erreur chargement phases:', error);
      }
    };

    fetchPhases();
  }, [tournamentId]);

  const basePath = `/organizer/tournament/${tournamentId}`;

  const isActive = (path) => {
    if (path === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(path);
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Auto-expand menu basé sur la route actuelle
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/settings')) {
      setExpandedMenus(prev => ({ ...prev, parametres: true }));
    }
    if (path.includes('/participants')) {
      setExpandedMenus(prev => ({ ...prev, participants: true }));
    }
    if (path.includes('/placement')) {
      setExpandedMenus(prev => ({ ...prev, placement: true }));
    }
    if (path.includes('/matches')) {
      setExpandedMenus(prev => ({ ...prev, matchs: true }));
    }
    if (path.includes('/sharing')) {
      setExpandedMenus(prev => ({ ...prev, partage: true }));
    }
  }, [location.pathname]);

  // Définition de la navigation
  const navigation = useMemo(() => [
    {
      key: 'overview',
      label: 'Vue d\'ensemble',
      icon: '📊',
      path: basePath,
      exact: true,
    },
    {
      key: 'parametres',
      label: 'Paramètres',
      icon: '⚙️',
      expandable: true,
      subItems: [
        { key: 'general', label: 'Général', path: `${basePath}/settings/general` },
        { key: 'appearance', label: 'Apparence', path: `${basePath}/settings/appearance` },
        { key: 'discipline', label: 'Discipline', path: `${basePath}/settings/discipline` },
        { key: 'match', label: 'Match', path: `${basePath}/settings/match` },
        { key: 'inscriptions', label: 'Inscriptions', path: `${basePath}/settings/registration` },
        { key: 'participant', label: 'Participant', path: `${basePath}/settings/participant` },
        { key: 'custom-fields', label: 'Champs personnalisés', path: `${basePath}/settings/custom-fields` },
        { key: 'locations', label: 'Emplacements de match', path: `${basePath}/settings/locations` },
        { key: 'permissions', label: 'Permissions', path: `${basePath}/settings/permissions` },
        { key: 'operations', label: 'Opérations globales', path: `${basePath}/settings/operations` },
      ]
    },
    {
      key: 'structure',
      label: 'Structure',
      icon: '🏗️',
      path: `${basePath}/structure`,
    },
    {
      key: 'participants',
      label: 'Participants',
      icon: '👥',
      expandable: true,
      subItems: [
        { key: 'list', label: 'Liste', path: `${basePath}/participants` },
        { key: 'bulk-edit', label: 'Éditer tous', path: `${basePath}/participants/bulk-edit` },
        { key: 'export', label: 'Exporter', path: `${basePath}/participants/export` },
      ]
    },
    {
      key: 'placement',
      label: 'Placement',
      icon: '🎯',
      expandable: true,
      subItems: [
        { key: 'overview', label: 'Vue d\'ensemble', path: `${basePath}/placement` },
        // Les phases seront ajoutées dynamiquement
        ...phases.map((phase, idx) => ({
          key: `phase-${phase.id}`,
          label: `${idx + 1}. ${phase.name}`,
          path: `${basePath}/placement/${phase.id}`,
        }))
      ]
    },
    {
      key: 'matchs',
      label: 'Matchs',
      icon: '⚔️',
      expandable: true,
      subItems: [
        { key: 'overview', label: 'Vue d\'ensemble', path: `${basePath}/matches` },
        // Les phases seront ajoutées dynamiquement
        ...phases.map((phase, idx) => ({
          key: `phase-${phase.id}`,
          label: `${idx + 1}. ${phase.name}`,
          path: `${basePath}/matches/phase/${phase.id}`,
        }))
      ]
    },
    {
      key: 'classement',
      label: 'Classement final',
      icon: '🏆',
      path: `${basePath}/final-standings`,
    },
    {
      key: 'partage',
      label: 'Partage',
      icon: '📤',
      expandable: true,
      subItems: [
        { key: 'public', label: 'Page publique', path: `${basePath}/sharing/public` },
        { key: 'widgets', label: 'Widgets', path: `${basePath}/sharing/widgets` },
        { key: 'tv', label: 'Mon-Tournoi TV', path: `${basePath}/sharing/tv` },
      ]
    },
    {
      key: 'sponsors',
      label: 'Sponsors',
      icon: '💼',
      path: `${basePath}/sponsors`,
    },
    {
      key: 'streams',
      label: 'Streams',
      icon: '📺',
      path: `${basePath}/streams`,
    },
  ], [basePath, phases]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#1e2235] border-r border-white/10 z-50 flex flex-col overflow-hidden">
        {/* Header - Logo Organizer */}
        <div className="p-4 border-b border-white/10">
          <Link to="/organizer/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-xl shadow-glow-sm">
              🎯
            </div>
            <span className="font-display text-lg font-semibold text-white">Organizer</span>
          </Link>
        </div>

        {/* Retour organisation */}
        <div className="px-4 py-3 border-b border-white/10">
          <Link 
            to="/organizer/dashboard" 
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Fluky Boys</span>
          </Link>
        </div>

        {/* Tournament Info */}
        {tournament && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet/20 flex items-center justify-center text-lg flex-shrink-0">
                🏆
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-semibold text-white text-sm truncate">
                  {tournament.name}
                </h2>
                <p className="text-xs text-text-muted truncate">{tournament.game}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navigation.map((item) => {
            const hasSubItems = item.expandable && item.subItems?.length > 0;
            const isExpanded = expandedMenus[item.key];
            const active = item.exact ? location.pathname === item.path : isActive(item.path);
            const hasActiveChild = item.subItems?.some(sub => isActive(sub.path));

            return (
              <div key={item.key}>
                {/* Main Menu Item */}
                {hasSubItems ? (
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={clsx(
                      'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                      hasActiveChild ? 'text-cyan-400' : 'text-gray-300 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className={clsx(
                      'transition-transform duration-200 text-xs',
                      isExpanded && 'rotate-180'
                    )}>
                      ▼
                    </span>
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      active 
                        ? 'text-cyan-400 bg-cyan-400/10 border-l-2 border-cyan-400' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )}

                {/* Sub Items */}
                {hasSubItems && isExpanded && (
                  <div className="bg-black/20">
                    {item.subItems.map((subItem) => {
                      const subActive = isActive(subItem.path);
                      return (
                        <Link
                          key={subItem.key}
                          to={subItem.path}
                          className={clsx(
                            'block pl-12 pr-4 py-2 text-sm transition-colors',
                            subActive 
                              ? 'text-cyan-400 bg-cyan-400/10' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          )}
                        >
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info */}
        {session && (
          <div className="p-4 border-t border-white/10">
            <button 
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-pink flex items-center justify-center text-sm">
                👤
              </div>
              <span className="text-sm text-gray-300 truncate">
                {session.user.user_metadata?.username || session.user.email?.split('@')[0]}
              </span>
              <span className="ml-auto text-xs text-gray-500">▼</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          <Outlet context={{ tournament, phases, session, refreshPhases: () => {} }} />
        </div>
      </main>
    </div>
  );
}
