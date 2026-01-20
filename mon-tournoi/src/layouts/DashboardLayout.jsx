import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getUserRole } from '../utils/userRole';
import clsx from 'clsx';

export default function DashboardLayout({ children, session = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Navigation simplifiée et groupée
  const mainNavLinks = [
    { path: '/', label: 'Accueil', icon: '🏠' },
    { path: '/play', label: 'Explorer', icon: '🔍' },
    { path: '/leaderboard', label: 'Classement', icon: '🏆' },
  ];

  // Les joueurs voient Mon Équipe, les organisateurs non
  const playerNavLinks = userRole === 'organizer' 
    ? [{ path: '/player/dashboard', label: 'Mon Espace', icon: '📊' }]
    : [
        { path: '/player/dashboard', label: 'Mon Espace', icon: '📊' },
        { path: '/my-team', label: 'Mon Équipe', icon: '👥' },
      ];

  const organizerNavLinks = [
    { path: '/organizer/dashboard', label: 'Mes Tournois', icon: '🎯' },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-56 bg-[#161b22] border-r border-white/10 z-50 flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/Logo.png" 
              alt="Fluky Boys" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-display text-lg font-bold text-white">
              Fluky Boys
            </span>
            {notificationCount > 0 && (
              <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Section principale */}
          <div className="px-3 space-y-1">
            {mainNavLinks.map((link) => (
              <NavLink key={link.path} link={link} isActive={isActive(link.path)} />
            ))}
          </div>

          {/* Section Joueur */}
          {session && (
            <>
              <div className="mt-6 mb-2 px-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joueur
                </span>
              </div>
              <div className="px-3 space-y-1">
                {playerNavLinks.map((link) => (
                  <NavLink key={link.path} link={link} isActive={isActive(link.path)} />
                ))}
              </div>
            </>
          )}

          {/* Section Organisateur */}
          {session && userRole === 'organizer' && (
            <>
              <div className="mt-6 mb-2 px-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisateur
                </span>
              </div>
              <div className="px-3 space-y-1">
                {organizerNavLinks.map((link) => (
                  <NavLink key={link.path} link={link} isActive={isActive(link.path)} />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-white/10">
          {session ? (
            <div className="space-y-2">
              <Link
                to="/profile"
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive('/profile')
                    ? 'bg-violet/20 text-violet-400'
                    : 'hover:bg-white/5 text-gray-400 hover:text-white'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-sm">
                  {session.user.user_metadata?.username?.charAt(0)?.toUpperCase() || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session.user.user_metadata?.username || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userRole === 'organizer' ? 'Organisateur' : 'Joueur'}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <span>🚪</span>
                <span>Déconnexion</span>
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet hover:bg-violet-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Connexion
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#161b22] border-b border-white/10 z-50 flex items-center px-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <span className="text-xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>
        
        <Link to="/" className="flex items-center gap-2 ml-3">
          <img src="/Logo.png" alt="" className="w-6 h-6" />
          <span className="font-display font-bold text-white">Fluky Boys</span>
        </Link>

        {session && notificationCount > 0 && (
          <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-[#161b22] border-r border-white/10 z-50 flex flex-col overflow-y-auto">
            <nav className="flex-1 py-4">
              <div className="px-3 space-y-1">
                {mainNavLinks.map((link) => (
                  <NavLink 
                    key={link.path} 
                    link={link} 
                    isActive={isActive(link.path)} 
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </div>

              {session && (
                <>
                  <div className="mt-6 mb-2 px-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">Joueur</span>
                  </div>
                  <div className="px-3 space-y-1">
                    {playerNavLinks.map((link) => (
                      <NavLink 
                        key={link.path} 
                        link={link} 
                        isActive={isActive(link.path)}
                        onClick={() => setIsMobileMenuOpen(false)}
                      />
                    ))}
                  </div>
                </>
              )}

              {session && userRole === 'organizer' && (
                <>
                  <div className="mt-6 mb-2 px-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">Organisateur</span>
                  </div>
                  <div className="px-3 space-y-1">
                    {organizerNavLinks.map((link) => (
                      <NavLink 
                        key={link.path} 
                        link={link} 
                        isActive={isActive(link.path)}
                        onClick={() => setIsMobileMenuOpen(false)}
                      />
                    ))}
                  </div>
                </>
              )}
            </nav>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-white/10">
              {session ? (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-sm">
                      {session.user.user_metadata?.username?.charAt(0)?.toUpperCase() || '👤'}
                    </div>
                    <span className="text-sm text-white">
                      {session.user.user_metadata?.username || 'Profil'}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 rounded-lg"
                  >
                    <span>🚪</span>
                    <span>Déconnexion</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 bg-violet text-white rounded-lg text-sm font-medium"
                >
                  Connexion
                </Link>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-56 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// Navigation Link Component
function NavLink({ link, isActive, onClick }) {
  return (
    <Link
      to={link.path}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-violet/20 text-cyan-400 border-l-2 border-cyan-400 -ml-0.5 pl-[calc(0.75rem-2px)]'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      )}
    >
      <span className="text-base">{link.icon}</span>
      <span>{link.label}</span>
    </Link>
  );
}

