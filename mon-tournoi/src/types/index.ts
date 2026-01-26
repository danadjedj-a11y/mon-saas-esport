/**
 * Core TypeScript types for Mon-Tournoi
 * These types define the main data structures used throughout the application
 */

// ============================================
// User & Authentication
// ============================================

export interface User {
    id: string;
    email: string;
    user_metadata?: {
        username?: string;
        avatar_url?: string;
        full_name?: string;
    };
    created_at?: string;
}

export interface Session {
    user: User;
    access_token: string;
    refresh_token: string;
    expires_at?: number;
}

export type UserRole = 'player' | 'organizer' | 'admin';

// ============================================
// Teams
// ============================================

export interface Team {
    id: string;
    name: string;
    tag?: string;
    logo_url?: string;
    captain_id: string;
    created_at: string;
    updated_at?: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: 'captain' | 'player' | 'substitute';
    joined_at: string;
}

export interface TemporaryTeam {
    id: string;
    tournament_id: string;
    name: string;
    captain_id: string;
    created_at: string;
    updated_at?: string;
}

export interface TemporaryTeamPlayer {
    id: string;
    temporary_team_id: string;
    user_id?: string;
    player_name: string;
    player_email?: string;
    game_account?: string;
}

// ============================================
// Tournaments
// ============================================

export type TournamentStatus =
    | 'draft'
    | 'registration_open'
    | 'registration_closed'
    | 'check_in'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

export type TournamentFormat =
    | 'elimination'
    | 'double_elimination'
    | 'round_robin'
    | 'swiss'
    | 'gauntlet';

export interface Tournament {
    id: string;
    name: string;
    description?: string;
    game: string;
    format: TournamentFormat;
    status: TournamentStatus;
    owner_id: string;
    max_participants?: number;
    registration_start?: string;
    registration_end?: string;
    start_date?: string;
    end_date?: string;
    prize_pool?: string;
    rules?: string;
    logo_url?: string;
    banner_url?: string;
    is_public: boolean;
    check_in_enabled: boolean;
    check_in_duration?: number;
    team_size?: number;
    created_at: string;
    updated_at?: string;
}

export interface TournamentPhase {
    id: string;
    tournament_id: string;
    name: string;
    format: TournamentFormat;
    phase_order: number;
    config: PhaseConfig;
    status: 'pending' | 'in_progress' | 'completed';
    created_at: string;
}

export interface PhaseConfig {
    size?: number;
    grand_final?: 'single' | 'double';
    third_place_match?: boolean;
    rounds?: number;
    points_win?: number;
    points_draw?: number;
    points_loss?: number;
}

// ============================================
// Participants
// ============================================

export type ParticipantStatus =
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'disqualified'
    | 'withdrawn';

export interface Participant {
    id: string;
    tournament_id: string;
    team_id?: string;
    user_id?: string;
    status: ParticipantStatus;
    seed?: number;
    check_in_at?: string;
    created_at: string;
    // Joined data
    team?: Team;
    temporary_team?: TemporaryTeam;
}

// ============================================
// Matches
// ============================================

export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type BracketType =
    | 'winners'
    | 'losers'
    | 'grand_final'
    | 'round_robin'
    | 'swiss'
    | 'gauntlet';

export interface Match {
    id: string;
    tournament_id: string;
    phase_id?: string;
    round_number: number;
    match_number: number;
    bracket_type: BracketType;
    player1_id?: string;
    player2_id?: string;
    score_p1?: number;
    score_p2?: number;
    winner_id?: string;
    status: MatchStatus;
    scheduled_at?: string;
    completed_at?: string;
    next_match_id?: string;
    loser_next_match_id?: string;
    created_at: string;
    updated_at?: string;
    // Joined data
    player1?: Participant;
    player2?: Participant;
}

export interface MatchGame {
    id: string;
    match_id: string;
    game_number: number;
    map_name?: string;
    winner_team_id?: string;
    score_team1?: number;
    score_team2?: number;
    status: 'pending' | 'in_progress' | 'completed';
}

export interface MatchVeto {
    id: string;
    match_id: string;
    team_id: string;
    map_name: string;
    veto_phase: string;
    created_at: string;
}

// ============================================
// Swiss System
// ============================================

export interface SwissScore {
    id: string;
    tournament_id: string;
    team_id: string;
    wins: number;
    losses: number;
    draws: number;
    buchholz_score: number;
    opp_wins: number;
}

export interface SwissPair {
    team1_id: string;
    team2_id: string;
}

// ============================================
// Notifications
// ============================================

export type NotificationType =
    | 'match_ready'
    | 'match_result'
    | 'tournament_start'
    | 'team_invitation'
    | 'check_in_reminder'
    | 'info'
    | 'warning'
    | 'error';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    read: boolean;
    created_at: string;
}

// ============================================
// API Responses
// ============================================

export interface ApiResponse<T> {
    data: T | null;
    error: ApiError | null;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

// ============================================
// Store Types
// ============================================

export interface AuthState {
    session: Session | null;
    user: User | null;
    userRole: UserRole | null;
    loading: boolean;
    initialized: boolean;
}

export interface TournamentCache {
    data: Tournament;
    timestamp: number;
}

export interface TournamentState {
    tournaments: Map<string, Tournament>;
    activeTournamentId: string | null;
    cache: {
        tournaments: Map<string, TournamentCache>;
        participants: Map<string, { data: Participant[]; timestamp: number }>;
        matches: Map<string, { data: Match[]; timestamp: number }>;
        swissScores: Map<string, { data: SwissScore[]; timestamp: number }>;
    };
    cacheExpiry: number;
}

// ============================================
// Component Props (common)
// ============================================

export interface WithSession {
    session: Session | null;
}

export interface WithTournament {
    tournament: Tournament;
}

export interface WithMatch {
    match: Match;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncResult<T> = Promise<ApiResponse<T>>;
