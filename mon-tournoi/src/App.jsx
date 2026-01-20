import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastContainer, OfflineBanner } from './shared/components/feedback';
import { useOnlineStatus } from './shared/hooks';
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
const MatchDetails = lazy(() => import('./pages/MatchDetails'));
const CreateTournament = lazy(() => import('./CreateTournament'));
const PublicTournament = lazy(() => import('./PublicTournament'));
const StatsDashboard = lazy(() => import('./StatsDashboard'));
const Leaderboard = lazy(() => import('./Leaderboard'));
const StreamOverlay = lazy(() => import('./stream/StreamOverlay'));
const StreamDashboard = lazy(() => import('./stream/StreamDashboard'));
const TournamentAPI = lazy(() => import('./api/TournamentAPI'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const PublicTeam = lazy(() => import('./pages/PublicTeam'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Pages Play (côté joueur public)
const PlayHome = lazy(() => import('./pages/play/PlayHome'));
const GamesDirectory = lazy(() => import('./pages/play/GamesDirectory'));
const GamePage = lazy(() => import('./pages/play/GamePage'));
const SearchResults = lazy(() => import('./pages/play/SearchResults'));

// Pages Organizer (nouvelle interface organisateur)
const OrganizerLayout = lazy(() => import('./layouts/OrganizerLayout'));
const TournamentOverview = lazy(() => import('./pages/organizer/TournamentOverview'));
const TournamentStructure = lazy(() => import('./pages/organizer/TournamentStructure'));
const BracketEditor = lazy(() => import('./components/bracket/BracketEditor'));
const PhaseSettings = lazy(() => import('./pages/organizer/structure/PhaseSettings'));
const SettingsGeneral = lazy(() => import('./pages/organizer/settings/SettingsGeneral'));
const SettingsAppearance = lazy(() => import('./pages/organizer/settings/SettingsAppearance'));
const SettingsDiscipline = lazy(() => import('./pages/organizer/settings/SettingsDiscipline'));
const SettingsMatch = lazy(() => import('./pages/organizer/settings/SettingsMatch'));
const SettingsRegistration = lazy(() => import('./pages/organizer/settings/SettingsRegistration'));
const SettingsParticipant = lazy(() => import('./pages/organizer/settings/SettingsParticipant'));
const SettingsCustomFields = lazy(() => import('./pages/organizer/settings/SettingsCustomFields'));
const SettingsLocations = lazy(() => import('./pages/organizer/settings/SettingsLocations'));
const SettingsPermissions = lazy(() => import('./pages/organizer/settings/SettingsPermissions'));
const SettingsOperations = lazy(() => import('./pages/organizer/settings/SettingsOperations'));
// Participants
const ParticipantsList = lazy(() => import('./pages/organizer/participants/ParticipantsList'));
const ParticipantCreate = lazy(() => import('./pages/organizer/participants/ParticipantCreate'));
const ParticipantsBulkEdit = lazy(() => import('./pages/organizer/participants/ParticipantsBulkEdit'));
const ParticipantsExport = lazy(() => import('./pages/organizer/participants/ParticipantsExport'));
// Placement
const PlacementOverview = lazy(() => import('./pages/organizer/placement/PlacementOverview'));
const PlacementPhase = lazy(() => import('./pages/organizer/placement/PlacementPhase'));
// Matches
const MatchesOverview = lazy(() => import('./pages/organizer/matches/MatchesOverview'));
const MatchesPhase = lazy(() => import('./pages/organizer/matches/MatchesPhase'));
const MatchEdit = lazy(() => import('./pages/organizer/matches/MatchEdit'));
// Final Standings
const FinalStandings = lazy(() => import('./pages/organizer/FinalStandings'));
// Share
const Widgets = lazy(() => import('./pages/organizer/share/Widgets'));
const Sponsors = lazy(() => import('./pages/organizer/share/Sponsors'));
const Streams = lazy(() => import('./pages/organizer/share/Streams'));
const SharingPublic = lazy(() => import('./pages/organizer/sharing/SharingPublic'));
const SharingTV = lazy(() => import('./pages/organizer/sharing/SharingTV'));
// Embed Widgets
const EmbedBracket = lazy(() => import('./pages/embed/EmbedBracket'));
const EmbedParticipants = lazy(() => import('./pages/embed/EmbedParticipants'));
const EmbedStandings = lazy(() => import('./pages/embed/EmbedStandings'));
const EmbedMatches = lazy(() => import('./pages/embed/EmbedMatches'));

// Composant de chargement pour Suspense
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-violet to-cyan rounded-2xl flex items-center justify-center text-3xl shadow-glow-md animate-pulse">
        🎮
      </div>
      <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
      <p className="font-body text-text-secondary">Chargement...</p>
    </div>
  </div>
);

// Composant de chargement pour la vérification de session (style neon)
const AuthLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
    {/* Background effects */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
    
    <div className="relative z-10 text-center">
      <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-violet to-cyan rounded-2xl flex items-center justify-center text-4xl shadow-glow-lg float">
        🎮
      </div>
      <h2 className="font-display text-xl font-semibold text-text mb-2">
        Vérification de la session
      </h2>
      <p className="font-body text-text-muted mb-6">
        Connexion en cours...
      </p>
      <div className="w-10 h-10 border-3 border-glass-border border-t-violet rounded-full animate-spin mx-auto" />
    </div>
  </div>
);

// Composant placeholder pour les pages en cours de développement
const PlaceholderPage = ({ title }) => (
  <div className="text-center py-16">
    <div className="w-20 h-20 mx-auto mb-6 bg-violet/20 rounded-2xl flex items-center justify-center text-4xl">
      🚧
    </div>
    <h1 className="text-2xl font-display font-bold text-white mb-2">{title}</h1>
    <p className="text-gray-400 mb-6">Cette fonctionnalité est en cours de développement</p>
    <p className="text-sm text-gray-500">Revenez bientôt pour découvrir les nouvelles fonctionnalités !</p>
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

  if (authorized === null) return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
        <p className="font-body text-text-secondary">Vérification des permissions...</p>
      </div>
    </div>
  );
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
  const [redirectTo, setRedirectTo] = useState(null); // État pour déclencher une redirection
  const monitoringInitialized = useRef(false);
  const authStateChangeHandled = useRef(false); // Protection contre les boucles
  const redirecting = useRef(false); // Protection contre les redirections multiples
  const lastAuthEvent = useRef(null); // Protection contre les événements en double
  const timeoutIdsRef = useRef([]); // Pour nettoyer les timeouts
  
  // Détecter le statut de connexion réseau (doit être au début avec les autres hooks)
  const isOnline = useOnlineStatus();

  // Fonction pour mettre à jour le rôle utilisateur
  const updateUserRole = async (user) => {
    if (!user) {
      setUserRole(null);
      return;
    }
    try {
      // Timeout de sécurité pour éviter les blocages
      const rolePromise = getUserRole(supabase, user.id);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const role = await Promise.race([rolePromise, timeoutPromise]);
      setUserRole(role);
      
      // Monitoring de manière non-bloquante
      try {
        monitoring.setUser({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username
        });
      } catch (monitoringError) {
        console.warn('Erreur monitoring (non-bloquant):', monitoringError);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du rôle:', error);
      // En cas d'erreur, on met 'player' par défaut pour ne pas bloquer
      setUserRole('player');
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
      console.log('🔍 [App] Début de la vérification de la session...');
      
      let timeoutId;
      const isCancelledRef = { current: false };
      
      // Timeout de sécurité : si ça prend plus de 5 secondes, on arrête le loading
      timeoutId = setTimeout(() => {
        if (!isCancelledRef.current) {
          console.warn('⚠️ [App] Timeout lors de la vérification de la session - arrêt du loading');
          setLoading(false);
        }
      }, 5000);
      timeoutIdsRef.current.push(timeoutId);

      try {
        console.log('🔍 [App] Appel à supabase.auth.getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 [App] Session récupérée:', session ? `User: ${session.user?.email}` : 'Aucune session');
        
        if (isCancelledRef.current) return;
        
        if (error) {
          console.error('❌ [App] Erreur lors de la vérification de la session:', error);
          setSession(null);
          setUserRole(null);
          isCancelledRef.current = true;
          clearTimeout(timeoutId);
          setLoading(false);
          console.log('✅ [App] Loading mis à false (erreur)');
          return;
        }

        if (session?.user) {
          console.log('✅ [App] Session trouvée, mise à jour du rôle...');
          setSession(session);
          // Mettre à jour le rôle de manière non-bloquante
          updateUserRole(session.user).catch(err => {
            console.error('❌ [App] Erreur lors de la mise à jour du rôle (non-bloquant):', err);
            // On continue même si ça échoue
          });
        } else {
          console.log('ℹ️ [App] Aucune session trouvée');
          setSession(null);
          setUserRole(null);
        }
      } catch (error) {
        if (!isCancelledRef.current) {
          console.error('❌ [App] Erreur lors de la vérification initiale:', error);
          setSession(null);
          setUserRole(null);
        }
      } finally {
        if (!isCancelledRef.current) {
          isCancelledRef.current = true;
          clearTimeout(timeoutId);
          setLoading(false);
          console.log('✅ [App] Loading mis à false (finally)');
        }
      }
    };

    checkInitialSession();

    // 2. Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [App] Auth State Change:', event, session?.user?.email || 'No user');

      // Protection contre les événements en double (même événement avec même session)
      const eventKey = `${event}_${session?.user?.id || 'null'}`;
      if (lastAuthEvent.current === eventKey) {
        console.log('⏭️ [App] Événement en double ignoré:', eventKey);
        return;
      }
      lastAuthEvent.current = eventKey;

      // Vérifier le path actuel pour décider si on doit ignorer SIGNED_IN
      const currentPath = window.location.pathname;
      
      // Ne PAS ignorer SIGNED_IN si on est sur /auth - on doit rediriger même si loading est true
      // On ignore seulement si on n'est PAS sur /auth (pour éviter double traitement lors du chargement initial)
      if (loading && event === 'SIGNED_IN' && !authStateChangeHandled.current && currentPath !== '/auth' && currentPath !== '/auth/') {
        console.log('⏭️ [App] Ignoré: événement SIGNED_IN pendant le chargement initial (pas sur /auth)');
        authStateChangeHandled.current = true;
        return;
      }

      // Gérer les événements spécifiques
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          console.log('✅ [App] SIGNED_IN détecté, mise à jour de la session...');
          setSession(session);
          
          // Réinitialiser le flag de redirection pour permettre une nouvelle redirection
          redirecting.current = false;
          
          console.log('📍 [App] Current path:', currentPath);
          
          // Rediriger si on est sur /auth
          if (currentPath === '/auth' || currentPath === '/auth/') {
            console.log('🔄 [App] Sur /auth, redirection vers dashboard...');
            
            // Marquer qu'on est en train de rediriger pour éviter les doubles
            redirecting.current = true;
            
            // Timeout de sécurité: rediriger vers player après 2 secondes max
            const safetyTimeout = setTimeout(() => {
              console.warn('⚠️ [App] Timeout sécurité, redirection vers player/dashboard');
              window.location.href = '/player/dashboard';
            }, 2000);
            
            // Récupérer le rôle et rediriger
            getUserRole(supabase, session.user.id)
              .then((role) => {
                clearTimeout(safetyTimeout);
                console.log('✅ [App] Rôle récupéré:', role);
                setUserRole(role);
                
                const targetRoute = role === 'organizer' 
                  ? '/organizer/dashboard' 
                  : '/player/dashboard';
                
                console.log(`🔄 [App] Redirection immédiate vers ${targetRoute}`);
                
                // Utiliser window.location.href pour forcer un rechargement complet
                // Cela évite les problèmes de state React et garantit la redirection
                window.location.href = targetRoute;
              })
              .catch((err) => {
                clearTimeout(safetyTimeout);
                console.error('❌ [App] Erreur lors de la récupération du rôle:', err);
                // Par défaut, rediriger vers player
                window.location.href = '/player/dashboard';
              });
          } else {
            // Si on n'est pas sur /auth, juste mettre à jour le rôle
            updateUserRole(session.user).catch(err => {
              console.error('❌ [App] Erreur updateUserRole (non-bloquant):', err);
            });
          }
          
          analytics.trackEvent('user_logged_in');
          toast.success('✅ Connexion réussie !');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔴 [App] SIGNED_OUT détecté');
        setSession(null);
        setUserRole(null);
        monitoring.setUser(null);
        
        // Rediriger vers la page d'accueil ou auth (une seule fois)
        const currentPath = window.location.pathname;
        if ((currentPath.startsWith('/player/') || 
            currentPath.startsWith('/organizer/') ||
            currentPath.startsWith('/profile') ||
            currentPath.startsWith('/create-team') ||
            currentPath.startsWith('/my-team') ||
            currentPath.startsWith('/stats') ||
            currentPath.startsWith('/leaderboard')) && 
            !redirecting.current) {
          redirecting.current = true;
          console.log('🔄 [App] Redirection vers / après SIGNED_OUT');
          // Pour SIGNED_OUT, on utilise window.location.href car on veut forcer un rechargement complet
          // Cela nettoie tous les états et évite les fuites mémoire
          const timeoutId = setTimeout(() => {
            window.location.href = '/';
          }, 100);
          timeoutIdsRef.current.push(timeoutId);
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
        console.log(`ℹ️ [App] Autre événement: ${event}`);
        setSession(session);
        if (session?.user) {
          updateUserRole(session.user).catch(err => {
            console.error('❌ [App] Erreur updateUserRole (non-bloquant):', err);
          });
        } else {
          setUserRole(null);
          monitoring.setUser(null);
        }
      }
    });

    // Suivre la page vue initiale
    analytics.trackPageView(window.location.pathname);

    return () => {
      subscription.unsubscribe();
      // Nettoyer tous les timeouts en attente
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
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

  // Composant interne pour gérer la redirection avec navigate()
  const AppRoutes = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const hasNavigatedRef = useRef(false);

    // Gérer la redirection déclenchée par l'état redirectTo
    useEffect(() => {
      if (redirectTo && !hasNavigatedRef.current) {
        const targetPath = redirectTo;
        
        // Éviter les redirections inutiles si on est déjà sur la route cible
        if (location.pathname !== targetPath) {
          console.log(`🔄 [AppRoutes] Navigation vers ${targetPath}`);
          hasNavigatedRef.current = true;
          setRedirectTo(null);
          
          // Navigation immédiate sans délai pour éviter le clignotement
          navigate(targetPath, { replace: true });
          
          // Réinitialiser après la navigation
          setTimeout(() => {
            redirecting.current = false;
            hasNavigatedRef.current = false;
          }, 100);
        } else {
          // Si on est déjà sur la route, juste nettoyer
          setRedirectTo(null);
          redirecting.current = false;
          hasNavigatedRef.current = false;
        }
      }
    }, [redirectTo, navigate, location.pathname]);

    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
        {/* ROUTES PUBLIQUES (Accessibles sans authentification) */}
        <Route path="/tournament/:id/public" element={<PublicTournament />} />
        <Route path="/player/:userId" element={<PublicProfile session={session} />} />
        <Route path="/team/:teamId" element={<PublicTeam session={session} />} />
        
        {/* STREAM & API ROUTES (Accessibles sans authentification) */}
        <Route path="/stream/overlay/:id" element={<StreamOverlay />} />
        <Route path="/stream/dashboard/:id" element={<StreamDashboard />} />
        <Route path="/api/tournament/:id/:endpoint" element={<TournamentAPI />} />
        
        {/* EMBED WIDGETS (Accessibles sans authentification) */}
        <Route path="/embed/tournament/:id/bracket" element={<EmbedBracket />} />
        <Route path="/embed/tournament/:id/participants" element={<EmbedParticipants />} />
        <Route path="/embed/tournament/:id/standings" element={<EmbedStandings />} />
        <Route path="/embed/tournament/:id/matches" element={<EmbedMatches />} />
        
        {/* Route racine - Page publique d'accueil */}
        <Route path="/" element={<HomePage />} />
        
        {/* ROUTES PLAY - Navigation joueur public */}
        <Route path="/play" element={<PlayHome session={session} />} />
        <Route path="/play/games" element={<GamesDirectory session={session} />} />
        <Route path="/play/games/:gameSlug" element={<GamePage session={session} />} />
        <Route path="/play/search" element={<SearchResults session={session} />} />
        
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
        
        {/* NOUVELLE Interface Organizer avec OrganizerLayout */}
        <Route path="/organizer/tournament/:id" element={
          session ? (
            <OrganizerRoute session={session}>
              <OrganizerLayout session={session} />
            </OrganizerRoute>
          ) : <Navigate to="/auth" />
        }>
          {/* Vue d'ensemble */}
          <Route index element={<TournamentOverview />} />
          
          {/* Structure */}
          <Route path="structure" element={<TournamentStructure />} />
          <Route path="structure/:phaseId/bracket" element={<BracketEditor />} />
          <Route path="structure/:phaseId/settings" element={<PhaseSettings />} />
          
          {/* Settings */}
          <Route path="settings/general" element={<SettingsGeneral />} />
          <Route path="settings/appearance" element={<SettingsAppearance />} />
          <Route path="settings/discipline" element={<SettingsDiscipline />} />
          <Route path="settings/match" element={<SettingsMatch />} />
          <Route path="settings/registration" element={<SettingsRegistration />} />
          <Route path="settings/participant" element={<SettingsParticipant />} />
          <Route path="settings/custom-fields" element={<SettingsCustomFields />} />
          <Route path="settings/locations" element={<SettingsLocations />} />
          <Route path="settings/permissions" element={<SettingsPermissions />} />
          <Route path="settings/operations" element={<SettingsOperations />} />
          
          {/* Participants */}
          <Route path="participants" element={<ParticipantsList />} />
          <Route path="participants/create" element={<ParticipantCreate />} />
          <Route path="participants/bulk-edit" element={<ParticipantsBulkEdit />} />
          <Route path="participants/export" element={<ParticipantsExport />} />
          
          {/* Placement */}
          <Route path="placement" element={<PlacementOverview />} />
          <Route path="placement/:phaseId" element={<PlacementPhase />} />
          
          {/* Matchs */}
          <Route path="matches" element={<MatchesOverview />} />
          <Route path="matches/phase/:phaseId" element={<MatchesPhase />} />
          <Route path="matches/:matchId" element={<MatchEdit />} />
          
          {/* Classement final */}
          <Route path="final-standings" element={<FinalStandings />} />
          
          {/* Partage */}
          <Route path="sharing/public" element={<SharingPublic />} />
          <Route path="sharing/widgets" element={<Widgets />} />
          <Route path="sharing/tv" element={<SharingTV />} />
          
          {/* Sponsors & Streams */}
          <Route path="sponsors" element={<Sponsors />} />
          <Route path="streams" element={<Streams />} />
        </Route>
        
        {/* Route legacy pour Tournament (ancien système) */}
        <Route path="/organizer/tournament/:id/legacy" element={
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
          <MatchDetails session={session} supabase={supabase} />
        } />
        <Route path="/match/:id/lobby" element={
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

        {/* Catch-all pour les routes non définies - Page 404 */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
  };

  return (
    <ErrorBoundary>
      <Router>
        {!isOnline && <OfflineBanner />}
        <AppRoutes />
        <ToastContainer />
      </Router>
    </ErrorBoundary>
  )
}

export default App