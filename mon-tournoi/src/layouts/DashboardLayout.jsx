import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getUserRole } from '../utils/userRole';
import { GradientButton } from '../shared/components/ui';
import { Menu, X, Bell, User, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function DashboardLayout({ children, session = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user) {
        const role = await getUserRole(supabase, session.user.id);
        setUserRole(role);
      }
    };
    fetchUserRole();
  }, [session]);

  // Fetch notification count
  useEffect(() => {
    if (!session?.user) return;

    const fetchNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setNotificationCount(count || 0);
    };
    fetchNotifications();
  }, [session]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Navigation - EXACTLY THE SAME AS BEFORE
  const mainNavLinks = [
    { path: '/', label: 'Accueil' },
    { path: '/play', label: 'Explorer' },
    { path: '/leaderboard', label: 'Classement' },
  ];

  const playerNavLinks = userRole === 'organizer'
    ? [{ path: '/player/dashboard', label: 'Mon Espace' }]
    : [
      { path: '/player/dashboard', label: 'Mon Espace' },
      { path: '/my-team', label: 'Mon Équipe' },
    ];

  const organizerNavLinks = [
    { path: '/organizer/dashboard', label: 'Mes Tournois' },
  ];

  // Combine all nav links for display
  const allNavLinks = [
    ...mainNavLinks,
    ...(session ? playerNavLinks : []),
    ...(session && userRole === 'organizer' ? organizerNavLinks : []),
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05050A]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-[#05050A] to-pink-900/20 animate-pulse" style={{ animationDuration: '8s' }} />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* ======== NAVIGATION HEADER ======== */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 lg:px-12 border-b border-[rgba(148,163,184,0.1)] backdrop-blur-sm bg-[rgba(5,5,10,0.8)]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <span className="text-lg font-bold text-white">FB</span>
          </div>
          <span className="text-xl font-bold text-[#F8FAFC]">Fluky Boys</span>
        </Link>

        {/* ... (rest of nav code implied, but focusing on the div wrapper changes if needed) ... */}

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-8 md:flex">
          {allNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={clsx(
                "text-sm font-medium transition-colors",
                isActive(link.path)
                  ? "text-[#00F5FF]"
                  : "text-[#94A3B8] hover:text-[#00F5FF]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side - Auth buttons or User menu */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {session && notificationCount > 0 && (
            <Link
              to="/profile"
              className="relative p-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors hidden md:block"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF3E9D] rounded-full text-[10px] text-white flex items-center justify-center shadow-[0_0_10px_rgba(255,62,157,0.5)]">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </Link>
          )}

          {/* User Menu or Auth Buttons */}
          {session ? (
            <div className="relative hidden md:block user-menu-container">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[rgba(99,102,241,0.1)] transition-colors border border-transparent hover:border-[rgba(99,102,241,0.2)]"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                  {session.user.user_metadata?.username?.charAt(0)?.toUpperCase() || '👤'}
                </div>
                <span className="text-sm text-[#F8FAFC]">
                  {session.user.user_metadata?.username || 'Utilisateur'}
                </span>
                <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[rgba(13,13,20,0.98)] backdrop-blur-xl border border-[rgba(99,102,241,0.15)] shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50">
                  <div className="p-3 border-b border-[rgba(148,163,184,0.1)]">
                    <p className="text-sm font-medium text-[#F8FAFC]">
                      {session.user.user_metadata?.username || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {userRole === 'organizer' ? '⭐ Organisateur' : '🎮 Joueur'}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(99,102,241,0.1)] rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Mon Profil
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#94A3B8] hover:text-[#FF3E9D] hover:bg-[rgba(255,62,157,0.1)] rounded-lg transition-colors"
                    >
                      🚪 Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <GradientButton variant="secondary" size="sm" onClick={() => navigate('/auth')}>
                Se Connecter
              </GradientButton>
              <GradientButton variant="primary" size="sm" onClick={() => navigate('/auth')}>
                Créer un Compte
              </GradientButton>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* ======== MOBILE MENU ======== */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed top-[73px] left-0 right-0 bg-[rgba(13,13,20,0.98)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] z-50 max-h-[calc(100vh-73px)] overflow-y-auto">
            <div className="p-4 space-y-2">
              {allNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive(link.path)
                      ? "bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 text-[#00F5FF]"
                      : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(99,102,241,0.1)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile User Section */}
              {session ? (
                <div className="pt-4 mt-4 border-t border-[rgba(148,163,184,0.1)] space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(99,102,241,0.1)]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center text-sm font-bold text-white">
                      {session.user.user_metadata?.username?.charAt(0)?.toUpperCase() || '👤'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F8FAFC]">
                        {session.user.user_metadata?.username || 'Profil'}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {userRole === 'organizer' ? 'Organisateur' : 'Joueur'}
                      </p>
                    </div>
                    {notificationCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-[#FF3E9D] rounded-full text-xs text-white flex items-center justify-center">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#94A3B8] hover:text-[#FF3E9D] hover:bg-[rgba(255,62,157,0.1)] rounded-lg transition-colors"
                  >
                    🚪 Déconnexion
                  </button>
                </div>
              ) : (
                <div className="pt-4 mt-4 border-t border-[rgba(148,163,184,0.1)] space-y-2">
                  <GradientButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/auth'); }}
                  >
                    Se Connecter
                  </GradientButton>
                  <GradientButton
                    variant="primary"
                    className="w-full"
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/auth'); }}
                  >
                    Créer un Compte
                  </GradientButton>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======== MAIN CONTENT ======== */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          {children}
        </div>

        {/* Footer with legal links */}
        <footer className="border-t border-[rgba(148,163,184,0.1)] bg-[rgba(5,5,10,0.8)] backdrop-blur-sm py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                <span>© {new Date().getFullYear()} Fluky Boys</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Tous droits réservés</span>
              </div>

              <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <Link
                  to="/legal/privacy"
                  className="text-[#94A3B8] hover:text-[#00F5FF] transition-colors"
                >
                  Confidentialité
                </Link>
                <Link
                  to="/legal/terms"
                  className="text-[#94A3B8] hover:text-[#00F5FF] transition-colors"
                >
                  CGU
                </Link>
                <Link
                  to="/legal/mentions"
                  className="text-[#94A3B8] hover:text-[#00F5FF] transition-colors"
                >
                  Mentions légales
                </Link>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.openCookieSettings) {
                      window.openCookieSettings();
                    }
                  }}
                  className="text-[#94A3B8] hover:text-[#00F5FF] transition-colors"
                >
                  Gérer les cookies
                </button>
              </nav>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
