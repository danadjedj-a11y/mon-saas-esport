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
  const monitoringInitialized = useRef(false);

  useEffect(() => {
    // Initialiser analytics et monitoring (une seule fois)
    if (!monitoringInitialized.current) {
      analytics.init();
      monitoring.init();
      monitoringInitialized.current = true;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const role = await getUserRole(supabase, session.user.id)
        setUserRole(role)
        monitoring.setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username
        });
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        const role = await getUserRole(supabase, session.user.id)
        setUserRole(role)
        monitoring.setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username
        });
      } else {
        setUserRole(null)
      }
      // Suivre la connexion/déconnexion
      analytics.trackEvent(session ? 'user_logged_in' : 'user_logged_out');
    })

    // Suivre la page vue initiale
    analytics.trackPageView(window.location.pathname);

    return () => subscription.unsubscribe()
  }, [])

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