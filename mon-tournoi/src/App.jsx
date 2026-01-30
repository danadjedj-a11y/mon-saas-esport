/**
 * APP.JSX - Version optimisée pour Clerk + Convex
 * 
 * Cette version remplace complètement Supabase par :
 * - Clerk pour l'authentification
 * - Convex pour les données en temps réel
 */

import { lazy, Suspense, useEffect } from 'react'
import { useUser, SignedIn, SignedOut } from "@clerk/clerk-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastContainer, OfflineBanner } from './shared/components/feedback';
import { useOnlineStatus } from './shared/hooks';
import { toast } from './utils/toast';
import analytics from './utils/analytics';
import monitoring from './utils/monitoring';
import CookieConsent from './components/CookieConsent';
import './i18n/config';

// ============================================
// LAZY LOADING DES COMPOSANTS
// ============================================

// Auth
const Auth = lazy(() => import('./Auth'));
const HomePage = lazy(() => import('./HomePage'));

// Dashboards
const Dashboard = lazy(() => import('./Dashboard'));
const OrganizerDashboard = lazy(() => import('./OrganizerDashboard'));
const PlayerDashboard = lazy(() => import('./PlayerDashboard'));

// Tournois
const Tournament = lazy(() => import('./Tournament'));
const CreateTournament = lazy(() => import('./CreateTournament'));
const PublicTournament = lazy(() => import('./PublicTournament'));

// Équipes
const CreateTeam = lazy(() => import('./CreateTeam'));
const MyTeam = lazy(() => import('./MyTeam'));
const JoinTeam = lazy(() => import('./JoinTeam'));

// Matchs
const MatchLobby = lazy(() => import('./MatchLobby'));
const MatchDetails = lazy(() => import('./pages/MatchDetails'));

// Profil & Stats
const Profile = lazy(() => import('./Profile'));
const StatsDashboard = lazy(() => import('./StatsDashboard'));
const Leaderboard = lazy(() => import('./Leaderboard'));

// Stream
const StreamOverlay = lazy(() => import('./stream/StreamOverlay'));
const StreamDashboard = lazy(() => import('./stream/StreamDashboard'));

// API
const TournamentAPI = lazy(() => import('./api/TournamentAPI'));

// Pages publiques
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const PublicTeam = lazy(() => import('./pages/PublicTeam'));
const TournamentRegister = lazy(() => import('./pages/tournament/TournamentRegister'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Pages légales (RGPD)
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const LegalNotice = lazy(() => import('./pages/legal/LegalNotice'));
const PrivacySettings = lazy(() => import('./pages/profile/PrivacySettings'));

// Pages Play (côté joueur public)
const PlayHome = lazy(() => import('./pages/play/PlayHome'));
const GamesDirectory = lazy(() => import('./pages/play/GamesDirectory'));
const GamePage = lazy(() => import('./pages/play/GamePage'));
const SearchResults = lazy(() => import('./pages/play/SearchResults'));

// Pages Admin
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

// Pages Organizer (nouvelle interface)
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
const ParticipantDetails = lazy(() => import('./pages/organizer/participants/ParticipantDetails'));
const ParticipantsBulkEdit = lazy(() => import('./pages/organizer/participants/ParticipantsBulkEdit'));
const ParticipantsExport = lazy(() => import('./pages/organizer/participants/ParticipantsExport'));

// Placement
const PlacementOverview = lazy(() => import('./pages/organizer/placement/PlacementOverview'));
const PlacementPhase = lazy(() => import('./pages/organizer/placement/PlacementPhase'));

// Matches
const MatchesOverview = lazy(() => import('./pages/organizer/matches/MatchesOverview'));
const MatchesPhase = lazy(() => import('./pages/organizer/matches/MatchesPhase'));
const MatchEdit = lazy(() => import('./pages/organizer/matches/MatchEdit'));

// Bracket
const TournamentBracket = lazy(() => import('./pages/organizer/TournamentBracket'));

// Final Standings
const FinalStandings = lazy(() => import('./pages/organizer/FinalStandings'));

// Share
const Widgets = lazy(() => import('./pages/organizer/share/Widgets'));
const Sponsors = lazy(() => import('./pages/organizer/share/Sponsors'));
const Streams = lazy(() => import('./pages/organizer/share/Streams'));
const SharingPublic = lazy(() => import('./pages/organizer/sharing/SharingPublic'));
const SharingTV = lazy(() => import('./pages/organizer/sharing/SharingTV'));

// Embed Widgets
const EmbedTournament = lazy(() => import('./pages/embed/EmbedTournament'));
const EmbedBracket = lazy(() => import('./pages/embed/EmbedBracket'));
const EmbedParticipants = lazy(() => import('./pages/embed/EmbedParticipants'));
const EmbedStandings = lazy(() => import('./pages/embed/EmbedStandings'));
const EmbedMatches = lazy(() => import('./pages/embed/EmbedMatches'));
const EmbedCalendar = lazy(() => import('./pages/embed/EmbedCalendar'));

// ============================================
// COMPOSANTS DE CHARGEMENT
// ============================================

const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-pulse">
                <img src="/Logo.png" alt="Fluky Boys" className="w-full h-full object-contain" />
            </div>
            <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body text-text-secondary">Chargement...</p>
        </div>
    </div>
);

const AuthLoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative z-10 text-center">
            <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center float">
                <img src="/Logo.png" alt="Fluky Boys" className="w-full h-full object-contain" />
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

// ============================================
// HOOK PERSONNALISÉ POUR L'UTILISATEUR CONVEX
// ============================================

/**
 * Hook qui synchronise l'utilisateur Clerk avec Convex
 * et retourne l'utilisateur Convex avec son rôle
 */
function useConvexUser() {
    const { user: clerkUser, isSignedIn, isLoaded } = useUser();
    const convexUser = useQuery(api.users.getCurrent);
    const upsertUser = useMutation(api.usersMutations.upsert);

    // Synchroniser l'utilisateur Clerk avec Convex
    useEffect(() => {
        if (isSignedIn && clerkUser && convexUser === null) {
            // L'utilisateur Clerk existe mais pas dans Convex, on le crée
            upsertUser({
                email: clerkUser.primaryEmailAddress?.emailAddress || "",
                username: clerkUser.username || clerkUser.firstName || "User",
                avatarUrl: clerkUser.imageUrl,
            }).then(() => {
                console.log("✅ Utilisateur synchronisé avec Convex");
            }).catch((err) => {
                console.error("❌ Erreur sync utilisateur:", err);
            });
        }
    }, [isSignedIn, clerkUser, convexUser, upsertUser]);

    return {
        // État de chargement
        isLoaded: isLoaded && convexUser !== undefined,
        isLoading: !isLoaded || (isSignedIn && convexUser === undefined),

        // Utilisateur
        isSignedIn,
        clerkUser,
        convexUser,

        // Rôle (depuis Convex)
        role: convexUser?.role || 'player',
        isOrganizer: convexUser?.role === 'organizer',
        isPlayer: convexUser?.role === 'player',
    };
}

// ============================================
// COMPOSANTS DE PROTECTION DES ROUTES
// ============================================

/**
 * Route protégée pour les organisateurs
 */
function OrganizerRoute({ children }) {
    const { isLoaded, isSignedIn, isOrganizer } = useConvexUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/auth');
        } else if (isLoaded && isSignedIn && !isOrganizer) {
            toast.error('❌ Accès refusé. Seuls les organisateurs peuvent accéder à cette section.');
            navigate('/player/dashboard');
        }
    }, [isLoaded, isSignedIn, isOrganizer, navigate]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-body text-text-secondary">Vérification des permissions...</p>
                </div>
            </div>
        );
    }

    if (!isSignedIn || !isOrganizer) return null;

    return children;
}

/**
 * Route protégée pour les joueurs (tous les utilisateurs connectés)
 */
function PlayerRoute({ children }) {
    const { isLoaded, isSignedIn } = useConvexUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/auth');
        }
    }, [isLoaded, isSignedIn, navigate]);

    if (!isLoaded) {
        return <LoadingFallback />;
    }

    if (!isSignedIn) return null;

    return children;
}

/**
 * Redirection automatique après connexion
 */
function AuthRedirect() {
    const { isLoaded, isSignedIn, role } = useConvexUser();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            const targetRoute = role === 'organizer' ? '/organizer/dashboard' : '/player/dashboard';
            console.log(`🔄 Redirection vers ${targetRoute}`);
            navigate(targetRoute, { replace: true });
        }
    }, [isLoaded, isSignedIn, role, navigate]);

    // Si connecté, afficher le loading pendant la redirection
    if (isSignedIn) {
        return <AuthLoadingSpinner />;
    }

    // Sinon, afficher la page Auth
    return <Auth />;
}

// ============================================
// COMPOSANT PRINCIPAL APP
// ============================================

function AppRoutes() {
    const { isLoaded, isLoading, isSignedIn, convexUser, role } = useConvexUser();
    const isOnline = useOnlineStatus();

    // Initialiser analytics et monitoring
    useEffect(() => {
        analytics.init();
        monitoring.init();

        if (convexUser) {
            monitoring.setUser({
                id: convexUser._id,
                email: convexUser.email,
                username: convexUser.username
            });
        }
    }, [convexUser]);

    // Afficher le spinner de chargement
    if (isLoading) {
        return <AuthLoadingSpinner />;
    }

    return (
        <>
            {!isOnline && <OfflineBanner />}

            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    {/* ============================================ */}
                    {/* PAGES LÉGALES (Accessibles sans auth) */}
                    {/* ============================================ */}
                    <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                    <Route path="/legal/terms" element={<TermsOfService />} />
                    <Route path="/legal/mentions" element={<LegalNotice />} />
                    <Route path="/profile/privacy" element={<PrivacySettings />} />

                    {/* ============================================ */}
                    {/* ROUTES PUBLIQUES */}
                    {/* ============================================ */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/tournament/:id/public" element={<PublicTournament />} />
                    <Route path="/tournament/:id/register" element={<TournamentRegister />} />
                    <Route path="/player/:userId" element={<PublicProfile />} />
                    <Route path="/team/:teamId" element={<PublicTeam />} />

                    {/* STREAM & API */}
                    <Route path="/stream/overlay/:id" element={<StreamOverlay />} />
                    <Route path="/stream/dashboard/:id" element={<StreamDashboard />} />
                    <Route path="/api/tournament/:id/:endpoint" element={<TournamentAPI />} />

                    {/* EMBED WIDGETS */}
                    <Route path="/embed/tournament/:id" element={<EmbedTournament />} />
                    <Route path="/embed/tournament/:id/bracket" element={<EmbedBracket />} />
                    <Route path="/embed/tournament/:id/participants" element={<EmbedParticipants />} />
                    <Route path="/embed/tournament/:id/standings" element={<EmbedStandings />} />
                    <Route path="/embed/tournament/:id/matches" element={<EmbedMatches />} />
                    <Route path="/embed/tournament/:id/calendar" element={<EmbedCalendar />} />

                    {/* PLAY - Navigation joueur public */}
                    <Route path="/play" element={<PlayHome />} />
                    <Route path="/play/games" element={<GamesDirectory />} />
                    <Route path="/play/games/:gameSlug" element={<GamePage />} />
                    <Route path="/play/search" element={<SearchResults />} />

                    {/* ============================================ */}
                    {/* AUTHENTIFICATION */}
                    {/* ============================================ */}
                    <Route path="/auth" element={<AuthRedirect />} />

                    {/* Dashboard - redirection intelligente */}
                    <Route path="/dashboard" element={
                        isSignedIn ? (
                            <Navigate to={role === 'organizer' ? '/organizer/dashboard' : '/player/dashboard'} replace />
                        ) : (
                            <Navigate to="/auth" replace />
                        )
                    } />

                    {/* ============================================ */}
                    {/* ROUTES ORGANISATEUR - PROTÉGÉES */}
                    {/* ============================================ */}
                    <Route path="/organizer/dashboard" element={
                        <OrganizerRoute>
                            <OrganizerDashboard />
                        </OrganizerRoute>
                    } />

                    <Route path="/organizer/admin/users" element={
                        <OrganizerRoute>
                            <AdminUsers />
                        </OrganizerRoute>
                    } />

                    <Route path="/organizer/tournament/:id" element={
                        <OrganizerRoute>
                            <OrganizerLayout />
                        </OrganizerRoute>
                    }>
                        <Route index element={<TournamentOverview />} />
                        <Route path="structure" element={<TournamentStructure />} />
                        <Route path="structure/:phaseId/bracket" element={<BracketEditor />} />
                        <Route path="structure/:phaseId/settings" element={<PhaseSettings />} />
                        <Route path="bracket" element={<TournamentBracket />} />
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
                        <Route path="participants" element={<ParticipantsList />} />
                        <Route path="participants/create" element={<ParticipantCreate />} />
                        <Route path="participants/:participantId" element={<ParticipantDetails />} />
                        <Route path="participants/bulk-edit" element={<ParticipantsBulkEdit />} />
                        <Route path="participants/export" element={<ParticipantsExport />} />
                        <Route path="placement" element={<PlacementOverview />} />
                        <Route path="placement/:phaseId" element={<PlacementPhase />} />
                        <Route path="matches" element={<MatchesOverview />} />
                        <Route path="matches/phase/:phaseId" element={<MatchesPhase />} />
                        <Route path="matches/:matchId" element={<MatchEdit />} />
                        <Route path="final-standings" element={<FinalStandings />} />
                        <Route path="sharing/public" element={<SharingPublic />} />
                        <Route path="sharing/widgets" element={<Widgets />} />
                        <Route path="sharing/tv" element={<SharingTV />} />
                        <Route path="sponsors" element={<Sponsors />} />
                        <Route path="streams" element={<Streams />} />
                    </Route>

                    <Route path="/organizer/tournament/:id/legacy" element={
                        <OrganizerRoute>
                            <Tournament />
                        </OrganizerRoute>
                    } />

                    <Route path="/create-tournament" element={
                        <OrganizerRoute>
                            <CreateTournament />
                        </OrganizerRoute>
                    } />

                    {/* ============================================ */}
                    {/* ROUTES JOUEUR - PROTÉGÉES */}
                    {/* ============================================ */}
                    <Route path="/player/dashboard" element={
                        <PlayerRoute>
                            <PlayerDashboard />
                        </PlayerRoute>
                    } />

                    <Route path="/player/tournament/:id" element={
                        <PlayerRoute>
                            <Tournament />
                        </PlayerRoute>
                    } />

                    <Route path="/tournament/:id" element={
                        isSignedIn ? (
                            role === 'organizer' ? (
                                <OrganizerRoute>
                                    <Tournament />
                                </OrganizerRoute>
                            ) : (
                                <PlayerRoute>
                                    <Tournament />
                                </PlayerRoute>
                            )
                        ) : <Navigate to="/auth" replace />
                    } />

                    <Route path="/profile" element={
                        <PlayerRoute>
                            <Profile />
                        </PlayerRoute>
                    } />

                    <Route path="/create-team" element={
                        <PlayerRoute>
                            <CreateTeam />
                        </PlayerRoute>
                    } />

                    <Route path="/my-team" element={
                        <PlayerRoute>
                            <MyTeam />
                        </PlayerRoute>
                    } />

                    <Route path="/join-team/:teamId" element={
                        <PlayerRoute>
                            <JoinTeam />
                        </PlayerRoute>
                    } />

                    <Route path="/match/:id" element={<MatchDetails />} />

                    <Route path="/match/:id/lobby" element={
                        <PlayerRoute>
                            <MatchLobby />
                        </PlayerRoute>
                    } />

                    <Route path="/stats" element={
                        <PlayerRoute>
                            <StatsDashboard />
                        </PlayerRoute>
                    } />

                    <Route path="/leaderboard" element={
                        <PlayerRoute>
                            <Leaderboard />
                        </PlayerRoute>
                    } />

                    {/* ============================================ */}
                    {/* 404 - Page non trouvée */}
                    {/* ============================================ */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>

            <ToastContainer />
            <CookieConsent />
        </>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AppRoutes />
            </Router>
        </ErrorBoundary>
    );
}

export default App;
