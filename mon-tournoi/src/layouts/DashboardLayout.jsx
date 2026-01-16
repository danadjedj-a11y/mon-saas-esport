import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getUserRole } from '../utils/userRole';
import ActiveMatchWidget from '../components/ActiveMatchWidget';
import NotificationCenter from '../NotificationCenter';

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
    <div className="min-h-screen bg-dark flex">
      {/* Sidebar Fixe - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-dark-50/80 backdrop-blur-xl border-r border-glass-border shadow-elevation-3 z-50 flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-glass-border">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src="/Logo.png" 
                alt="Fluky Boys" 
                className="w-12 h-12 object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
              <div>
                <h1 className="font-display text-xl font-semibold text-text gradient-text">
                  Fluky Boys
                </h1>
                <p className="text-xs text-text-muted font-body">Tournament Platform</p>
              </div>
            </Link>
            {/* Notifications - Desktop */}
            {session && (
              <NotificationCenter session={session} />
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-gradient-to-r from-violet to-violet-dark text-white shadow-glow-sm'
                    : 'text-text-secondary hover:bg-glass-hover hover:text-text'
                }`}
              >
                <span className={`text-lg transition-transform duration-200 ${!active && 'group-hover:scale-110'}`}>
                  {link.icon}
                </span>
                <span className="font-body font-medium text-sm">{link.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar - User Info & Logout */}
        {session && (
          <div className="p-4 border-t border-glass-border">
            <div className="mb-3 p-4 bg-glass-white rounded-xl border border-glass-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet to-pink flex items-center justify-center text-lg">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-text truncate font-medium">
                    {session.user.user_metadata?.username || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              {userRole && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-display font-medium rounded-md ${
                  userRole === 'organizer' 
                    ? 'bg-violet/20 text-violet-light border border-violet/30' 
                    : 'bg-cyan/20 text-cyan-light border border-cyan/30'
                }`}>
                  {userRole === 'organizer' ? '🎯 Organisateur' : '🎮 Joueur'}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 bg-glass-white hover:bg-danger/20 border border-glass-border hover:border-danger/50 rounded-xl text-text-secondary hover:text-danger transition-all duration-200 font-body text-sm font-medium flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              Déconnexion
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 right-4 z-[60] flex items-center justify-between lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-dark-50/90 backdrop-blur-xl border border-glass-border rounded-xl text-text hover:text-violet hover:border-violet/50 transition-all shadow-elevation-2"
          aria-label="Menu"
        >
          <span className="text-xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>
        
        {/* Notifications - Mobile */}
        {session && (
          <NotificationCenter session={session} />
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-dark/80 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-72 bg-dark-50/95 backdrop-blur-xl border-r border-glass-border shadow-elevation-3 z-50 flex flex-col animate-slide-right">
            {/* Mobile Header */}
            <div className="p-6 border-b border-glass-border flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                <img 
                  src="/Logo.png" 
                  alt="Fluky Boys" 
                  className="w-10 h-10 object-contain drop-shadow-lg"
                />
                <h1 className="font-display text-lg font-semibold gradient-text">
                  Fluky Boys
                </h1>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-text-secondary hover:text-text text-2xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredNavLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-violet to-violet-dark text-white shadow-glow-sm'
                        : 'text-text-secondary hover:bg-glass-hover hover:text-text'
                    }`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    <span className="font-body font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            {session && (
              <div className="p-4 border-t border-glass-border">
                <div className="mb-3 p-3 bg-glass-white rounded-xl border border-glass-border">
                  <p className="text-sm font-body text-text truncate font-medium">
                    {session.user.user_metadata?.username || session.user.email}
                  </p>
                  {userRole && (
                    <p className="text-xs text-violet-light mt-1 font-body">
                      {userRole === 'organizer' ? '🎯 Organisateur' : '🎮 Joueur'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 bg-glass-white hover:bg-danger/20 border border-glass-border hover:border-danger/50 rounded-xl text-text-secondary hover:text-danger transition-all duration-200 font-body text-sm"
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
        <div className="w-full p-4 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Active Match Widget */}
      <ActiveMatchWidget session={session} />
    </div>
  );
}

