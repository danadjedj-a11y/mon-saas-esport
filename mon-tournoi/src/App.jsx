import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { getUserRole } from './utils/userRole';
import { toast } from './utils/toast';
import analytics from './utils/analytics';
import monitoring from './utils/monitoring';
import './i18n/config'; // Initialiser i18n

// Lazy loading des composants pour améliorer les performances
const Auth = lazy(() => import('./Auth'));
const HomePage = lazy(() => import('./HomePage'));
const Dashboard = lazy(() => import('./Dashboard'));
const OrganizerDashboard = lazy(() => import('./OrganizerDashboard'));
const PlayerDashboard = lazy(() => import('./PlayerDashboard'));
const Tournament = lazy(() => import('./Tournament'));
const Profile = lazy(() => import('./Profile'));
const CreateTeam = lazy(() => import('./CreateTeam'));
const MyTeam = lazy(() => import('./MyTeam'));
const JoinTeam = lazy(() => import('./JoinTeam'));
const MatchLobby = lazy(() => import('./MatchLobby'));
const CreateTournament = lazy(() => import('./CreateTournament'));
const PublicTournament = lazy(() => import('./PublicTournament'));
const StatsDashboard = lazy(() => import('./StatsDashboard'));
const Leaderboard = lazy(() => import('./Leaderboard'));
const StreamOverlay = lazy(() => import('./stream/StreamOverlay'));
const StreamDashboard = lazy(() => import('./stream/StreamDashboard'));
const TournamentAPI = lazy(() => import('./api/TournamentAPI'));

// Composant de chargement pour Suspense
const LoadingFallback = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#030913',
    color: '#F8F6F2',
    fontFamily: "'Protest Riot', sans-serif"
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
      <p style={{ fontSize: '1.2rem', color: '#FF36A3' }}>Chargement...</p>
    </div>
  </div>
);

// Composant de chargement pour la vérification de session (style neon)
const AuthLoadingSpinner = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#030913',
    backgroundImage: 'radial-gradient(circle, rgba(193, 4, 104, 0.15) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    color: '#F8F6F2',
    fontFamily: "'Protest Riot', sans-serif"
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '20px',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        textShadow: '0 0 20px rgba(193, 4, 104, 0.8), 0 0 40px rgba(255, 54, 163, 0.6)'
      }}>
        🎮
      </div>
      <p style={{
        fontSize: '1.5rem',
        color: '#FF36A3',
        fontFamily: "'Shadows Into Light', cursive",
        textShadow: '0 0 10px rgba(193, 4, 104, 0.5)'
      }}>
        Vérification de la session...
      </p>
      <div style={{
        marginTop: '20px',
        width: '50px',
        height: '50px',
        border: '4px solid rgba(193, 4, 104, 0.3)',
        borderTop: '4px solid #FF36A3',
        borderRadius: '50%',
        margin: '20px auto',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  </div>
);

// Composant pour protéger les routes organisateur
function OrganizerRoute({ children, session }) {
  const [authorized, setAuthorized] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      
      const role = await getUserRole(supabase, session.user.id);
      if (role === 'organizer') {
        setAuthorized(true);
      } else {
        toast.error('❌ Accès refusé. Seuls les organisateurs peuvent accéder à cette section.');
        navigate('/player/dashboard');
        setAuthorized(false);
      }
    };
    
    checkRole();
  }, [session, navigate]);

  if (authorized === null) return <div style={{color:'white', padding:'20px'}}>Vérification des permissions...</div>;
  if (!authorized) return null;
  
  return children;
}

// Composant pour protéger les routes joueur
// Par défaut, tous les utilisateurs connectés peuvent accéder (joueurs ou organisateurs)
function PlayerRoute({ children, session }) {
  if (!session?.user) {
    return null; // App.jsx gère la redirection vers Auth
  }
  
  // Pas besoin de vérifier le rôle : tous les utilisateurs connectés peuvent être joueurs
  return children;
}

function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true) // État de chargement pour la vérification initiale
  const monitoringInitialized = useRef(false);

  // Fonction pour mettre à jour le rôle utilisateur
  const updateUserRole = async (user) => {
    if (!user) {
      setUserRole(null);
      return;
    }
    try {
      const role = await getUserRole(supabase, user.id);
      setUserRole(role);
      monitoring.setUser({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du rôle:', error);
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Initialiser analytics et monitoring (une seule fois)
    if (!monitoringInitialized.current) {
      analytics.init();
      monitoring.init();
      monitoringInitialized.current = true;
    }

    // 1. Vérifier la session persistée au premier chargement
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la vérification de la session:', error);
          setSession(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setSession(session);
          await updateUserRole(session.user);
        } else {
          setSession(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification initiale:', error);
        setSession(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // 2. Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth State Change:', event, session?.user?.email || 'No user');

      // Gérer les événements spécifiques
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          setSession(session);
          // Mettre à jour le rôle et récupérer le rôle pour la redirection
          const role = await getUserRole(supabase, session.user.id);
          setUserRole(role);
          monitoring.setUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.username
          });
          
          // Rediriger vers le dashboard approprié si on est sur /auth ou /
          const currentPath = window.location.pathname;
          if (currentPath === '/auth' || currentPath === '/') {
            const targetRoute = role === 'organizer' 
              ? '/organizer/dashboard' 
              : '/player/dashboard';
            // Utiliser window.location pour forcer une navigation complète et éviter les problèmes de state
            window.location.href = targetRoute;
          }
          // Si on est déjà sur une page protégée, l'état est déjà mis à jour
          
          analytics.trackEvent('user_logged_in');
          toast.success('✅ Connexion réussie !');
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserRole(null);
        monitoring.setUser(null);
        
        // Rediriger vers la page d'accueil ou auth
        if (window.location.pathname.startsWith('/player/') || 
            window.location.pathname.startsWith('/organizer/') ||
            window.location.pathname.startsWith('/profile') ||
            window.location.pathname.startsWith('/create-team') ||
            window.location.pathname.startsWith('/my-team') ||
            window.location.pathname.startsWith('/stats') ||
            window.location.pathname.startsWith('/leaderboard')) {
          window.location.href = '/';
        }
        
        analytics.trackEvent('user_logged_out');
        toast.info('👋 Vous avez été déconnecté');
      } else if (event === 'TOKEN_REFRESHED') {
        // Rafraîchir la session si le token est renouvelé
        if (session?.user) {
          setSession(session);
          await updateUserRole(session.user);
        }
      } else if (event === 'USER_UPDATED') {
        // Mettre à jour les informations utilisateur
        if (session?.user) {
          setSession(session);
          await updateUserRole(session.user);
        }
      } else {
        // Pour les autres événements, mettre à jour l'état normalement
        setSession(session);
        if (session?.user) {
          await updateUserRole(session.user);
        } else {
          setUserRole(null);
        }
      }
    });

    // Suivre la page vue initiale
    analytics.trackPageView(window.location.pathname);

    return () => {
      subscription.unsubscribe();
    };
  }, [])

  // Afficher le spinner de chargement pendant la vérification initiale de la session
  if (loading) {
    return (
      <ErrorBoundary>
        <AuthLoadingSpinner />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
        {/* ROUTES PUBLIQUES (Accessibles sans authentification) */}
        <Route path="/tournament/:id/public" element={<PublicTournament />} />
        
        {/* STREAM & API ROUTES (Accessibles sans authentification) */}
        <Route path="/stream/overlay/:id" element={<StreamOverlay />} />
        <Route path="/stream/dashboard/:id" element={<StreamDashboard />} />
        <Route path="/api/tournament/:id/:endpoint" element={<TournamentAPI />} />
        
        {/* Route racine - Page publique d'accueil */}
        <Route path="/" element={<HomePage />} />
        
        {/* Route de connexion/authentification */}
        <Route path="/auth" element={<Auth />} />
        
        {/* Route dashboard - redirection intelligente vers organizer ou player */}
        <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Navigate to="/" />} />
        
        {/* Routes Organisateur - PROTÉGÉES */}
        <Route path="/organizer/dashboard" element={
          session ? (
            <OrganizerRoute session={session}>
              <OrganizerDashboard session={session} />
            </OrganizerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/organizer/tournament/:id" element={
          session ? (
            <OrganizerRoute session={session}>
              <Tournament session={session} />
            </OrganizerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/create-tournament" element={
          session ? (
            <OrganizerRoute session={session}>
              <CreateTournament session={session} supabase={supabase} />
            </OrganizerRoute>
          ) : <Navigate to="/auth" />
        } />
        
        {/* Routes Joueur - PROTÉGÉES */}
        <Route path="/player/dashboard" element={
          session ? (
            <PlayerRoute session={session}>
              <PlayerDashboard session={session} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/player/tournament/:id" element={
          session ? (
            <PlayerRoute session={session}>
              <Tournament session={session} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        
        {/* Route legacy - redirige automatiquement selon le rôle */}
        <Route path="/tournament/:id" element={
          session ? (
            userRole === 'organizer' ? (
              <OrganizerRoute session={session}>
                <Tournament session={session} />
              </OrganizerRoute>
            ) : (
              <PlayerRoute session={session}>
                <Tournament session={session} />
              </PlayerRoute>
            )
          ) : <Navigate to="/auth" />
        } />
        {/* Routes communes (joueurs et organisateurs) */}
        <Route path="/profile" element={session ? <Profile session={session} /> : <Auth />} />
        <Route path="/create-team" element={
          session ? (
            <PlayerRoute session={session}>
              <CreateTeam session={session} supabase={supabase} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/my-team" element={
          session ? (
            <PlayerRoute session={session}>
              <MyTeam session={session} supabase={supabase} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/join-team/:teamId" element={
          session ? (
            <PlayerRoute session={session}>
              <JoinTeam session={session} supabase={supabase} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/match/:id" element={
          session ? (
            <PlayerRoute session={session}>
              <MatchLobby session={session} supabase={supabase} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/stats" element={
          session ? (
            <PlayerRoute session={session}>
              <StatsDashboard session={session} supabase={supabase} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />
        <Route path="/leaderboard" element={
          session ? (
            <PlayerRoute session={session}>
              <Leaderboard session={session} supabase={supabase} />
            </PlayerRoute>
          ) : <Navigate to="/auth" />
        } />

        {/* Catch-all pour les routes non définies */}
        <Route path="*" element={
          session ? (
            userRole === 'organizer' ? (
              <Navigate to="/organizer/dashboard" replace />
            ) : (
              <Navigate to="/player/dashboard" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        } />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  )
}

export default App