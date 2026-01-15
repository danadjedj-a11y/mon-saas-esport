import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getUserRole } from '../utils/userRole';
import ActiveMatchWidget from '../components/ActiveMatchWidget';

export default function DashboardLayout({ children, session = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user) {
        const role = await getUserRole(supabase, session.user.id);
        setUserRole(role);
      }
    };
    fetchUserRole();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: 'Accueil', icon: '🏠', public: true },
    { path: '/player/dashboard', label: 'Tableau de Bord', icon: '📊', requiresAuth: true },
    { path: '/organizer/dashboard', label: 'Organisateur', icon: '🎯', requiresAuth: true, requiresRole: 'organizer' },
    { path: '/create-tournament', label: 'Créer un Tournoi', icon: '➕', requiresAuth: true, requiresRole: 'organizer' },
    { path: '/create-team', label: 'Créer une Équipe', icon: '👥', requiresAuth: true },
    { path: '/my-team', label: 'Mon Équipe', icon: '⚽', requiresAuth: true },
    { path: '/stats', label: 'Statistiques', icon: '📈', requiresAuth: true },
    { path: '/leaderboard', label: 'Classement', icon: '🏆', requiresAuth: true },
    { path: '/profile', label: 'Profil', icon: '👤', requiresAuth: true },
  ];

  const filteredNavLinks = navLinks.filter(link => {
    if (link.public) return true;
    if (link.requiresAuth && !session) return false;
    if (link.requiresRole && userRole !== link.requiresRole) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-fluky-bg flex">
      {/* Sidebar Fixe - Desktop - VERTICALE UNIQUEMENT */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-[#030913]/60 backdrop-blur-md border-r border-white/5 shadow-xl z-50 flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-fluky-primary to-fluky-secondary rounded-lg flex items-center justify-center text-2xl">
              🎮
            </div>
            <h1 className="font-display text-2xl text-fluky-text" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>
              Fluky Boys
            </h1>
          </Link>
        </div>

        {/* Navigation - VERTICALE UNIQUEMENT */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col">
          {filteredNavLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-fluky-primary to-fluky-secondary text-white shadow-lg shadow-fluky-primary/50'
                    : 'text-fluky-text hover:bg-white/5 hover:text-fluky-secondary'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span className="font-body">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar - User Info & Logout */}
        {session && (
          <div className="p-4 border-t border-white/5">
            <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
              <p className="text-sm text-fluky-text/70 font-body">Connecté en tant que</p>
              <p className="text-sm font-body text-fluky-secondary truncate">
                {session.user.email || session.user.user_metadata?.username || 'Utilisateur'}
              </p>
              {userRole && (
                <p className="text-xs text-fluky-primary mt-1 font-body">
                  {userRole === 'organizer' ? '🎯 Organisateur' : '👤 Joueur'}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-fluky-primary rounded-lg text-fluky-text hover:text-fluky-secondary transition-all duration-200 font-body"
            >
              Déconnexion
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Menu Button - Seulement visible sur mobile (< 1024px) */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-[60] p-3 bg-[#030913]/80 backdrop-blur-md border border-white/10 rounded-lg text-fluky-text hover:text-fluky-secondary hover:border-fluky-primary transition-all shadow-lg md:hidden"
        aria-label="Menu"
      >
        <span className="text-2xl">☰</span>
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-64 bg-[#030913]/95 backdrop-blur-md border-r border-white/5 shadow-xl z-50 flex flex-col">
            {/* Mobile Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-10 h-10 bg-gradient-to-br from-fluky-primary to-fluky-secondary rounded-lg flex items-center justify-center text-2xl">
                  🎮
                </div>
                <h1 className="font-display text-xl text-fluky-text" style={{ textShadow: '0 0 10px rgba(193, 4, 104, 0.5)' }}>
                  Fluky Boys
                </h1>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-fluky-text hover:text-fluky-secondary text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredNavLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-fluky-primary to-fluky-secondary text-white shadow-lg shadow-fluky-primary/50'
                        : 'text-fluky-text hover:bg-white/5 hover:text-fluky-secondary'
                    }`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="font-body">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            {session && (
              <div className="p-4 border-t border-white/5">
                <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
                  <p className="text-sm text-fluky-text/70 font-body">Connecté en tant que</p>
                  <p className="text-sm font-body text-fluky-secondary truncate">
                    {session.user.email || session.user.user_metadata?.username || 'Utilisateur'}
                  </p>
                  {userRole && (
                    <p className="text-xs text-fluky-primary mt-1 font-body">
                      {userRole === 'organizer' ? '🎯 Organisateur' : '👤 Joueur'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-fluky-primary rounded-lg text-fluky-text hover:text-fluky-secondary transition-all duration-200 font-body"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Zone de Contenu Scrollable */}
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto">
        <div className="w-full p-4 lg:p-8 pt-20 md:pt-4 lg:pt-4">
          {children}
        </div>
      </main>

      {/* Active Match Widget - Shown across all pages */}
      <ActiveMatchWidget session={session} />
    </div>
  );
}

