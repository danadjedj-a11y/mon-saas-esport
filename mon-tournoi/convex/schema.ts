import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * SCHEMA OPTIMISÉ POUR PLATEFORME DE TOURNOIS ESPORT
 * 
 * Principes d'optimisation :
 * - Indexes sur tous les champs fréquemment filtrés
 * - Relations via IDs (v.id("table"))
 * - Timestamps en number (Date.now()) pour performance
 * - Enums via v.union() pour type-safety
 */

export default defineSchema({
    // ============================================
    // USERS & PROFILES
    // ============================================

    users: defineTable({
        // Informations de base
        username: v.string(),
        email: v.string(),
        role: v.union(v.literal("player"), v.literal("organizer")),

        // Profil
        avatarUrl: v.optional(v.string()),
        bio: v.optional(v.string()),

        // Gaming accounts (flexible avec object)
        gamingAccounts: v.optional(v.object({
            riotId: v.optional(v.string()),
            steamId: v.optional(v.string()),
            epicGamesId: v.optional(v.string()),
            battleNetId: v.optional(v.string()),
        })),

        // Métadonnées
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_username", ["username"])
        .index("by_role", ["role"]),

    // ============================================
    // TOURNAMENTS
    // ============================================

    tournaments: defineTable({
        // Informations de base
        name: v.string(),
        game: v.string(),
        format: v.union(
            v.literal("elimination"),
            v.literal("double_elimination"),
            v.literal("swiss"),
            v.literal("round_robin"),
            v.literal("gauntlet")
        ),
        status: v.union(
            v.literal("draft"),
            v.literal("ongoing"),
            v.literal("completed")
        ),

        // Relations
        organizerId: v.id("users"),

        // Configuration
        maxTeams: v.number(),
        teamSize: v.number(), // 1 pour solo, 2+ pour équipes
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),

        // Détails
        description: v.optional(v.string()),
        rules: v.optional(v.string()),
        prizePool: v.optional(v.string()),

        // Paramètres
        isPublic: v.boolean(),
        checkInRequired: v.boolean(),
        checkInStart: v.optional(v.number()),
        checkInEnd: v.optional(v.number()),

        // Apparence
        logoUrl: v.optional(v.string()),
        bannerUrl: v.optional(v.string()),

        // Métadonnées
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_organizer", ["organizerId"])
        .index("by_status", ["status"])
        .index("by_game", ["game"])
        .index("by_format", ["format"])
        .index("by_public", ["isPublic"])
        // Index composé pour requêtes fréquentes
        .index("by_game_and_status", ["game", "status"])
        .index("by_status_and_public", ["status", "isPublic"]),

    // ============================================
    // TOURNAMENT PHASES (pour tournois multi-phases)
    // ============================================

    tournamentPhases: defineTable({
        tournamentId: v.id("tournaments"),
        name: v.string(),
        phaseNumber: v.number(),
        format: v.union(
            v.literal("elimination"),
            v.literal("double_elimination"),
            v.literal("swiss"),
            v.literal("round_robin"),
            v.literal("gauntlet")
        ),
        status: v.union(
            v.literal("pending"),
            v.literal("ongoing"),
            v.literal("completed")
        ),

        // Settings flexibles par phase
        settings: v.optional(v.object({
            maxTeams: v.optional(v.number()),
            bestOf: v.optional(v.number()),
            swissRounds: v.optional(v.number()),
        })),

        createdAt: v.number(),
    })
        .index("by_tournament", ["tournamentId"])
        .index("by_tournament_and_phase", ["tournamentId", "phaseNumber"]),

    // ============================================
    // TEAMS
    // ============================================

    teams: defineTable({
        name: v.string(),
        tag: v.string(), // 3-5 caractères
        logoUrl: v.optional(v.string()),

        // Relations
        captainId: v.id("users"),

        // Type d'équipe
        isTemporary: v.boolean(), // true = équipe temporaire pour 1 tournoi
        tournamentId: v.optional(v.id("tournaments")), // si temporaire

        // Métadonnées
        createdAt: v.number(),
    })
        .index("by_captain", ["captainId"])
        .index("by_tournament", ["tournamentId"])
        .index("by_temporary", ["isTemporary"]),

    // ============================================
    // TEAM MEMBERS
    // ============================================

    teamMembers: defineTable({
        teamId: v.id("teams"),
        userId: v.id("users"),
        role: v.union(
            v.literal("captain"),
            v.literal("member"),
            v.literal("player"),
            v.literal("manager"),
            v.literal("coach")
        ),
        joinedAt: v.number(),
    })
        .index("by_team", ["teamId"])
        .index("by_user", ["userId"])
        .index("by_team_and_user", ["teamId", "userId"]),

    // ============================================
    // TEAM INVITATIONS
    // ============================================

    teamInvitations: defineTable({
        teamId: v.id("teams"),
        inviterId: v.id("users"),
        inviteeId: v.id("users"),
        message: v.optional(v.string()),
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("declined")
        ),
        createdAt: v.number(),
    })
        .index("by_team", ["teamId"])
        .index("by_invitee", ["inviteeId"])
        .index("by_invitee_and_status", ["inviteeId", "status"]),

    // ============================================
    // TOURNAMENT REGISTRATIONS
    // ============================================

    tournamentRegistrations: defineTable({
        tournamentId: v.id("tournaments"),

        // Soit équipe, soit joueur solo
        teamId: v.optional(v.id("teams")),
        userId: v.optional(v.id("users")),

        status: v.union(
            v.literal("pending"),
            v.literal("confirmed"),
            v.literal("checked_in"),
            v.literal("disqualified")
        ),

        seed: v.optional(v.number()), // Position de seeding
        checkedInAt: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_tournament", ["tournamentId"])
        .index("by_team", ["teamId"])
        .index("by_user", ["userId"])
        .index("by_tournament_and_status", ["tournamentId", "status"]),

    // ============================================
    // MATCHES
    // ============================================

    matches: defineTable({
        tournamentId: v.id("tournaments"),
        phaseId: v.optional(v.id("tournamentPhases")),

        // Position dans le bracket
        round: v.number(),
        matchNumber: v.number(),
        bracketPosition: v.optional(v.string()), // "WB-R1-M1", "LB-R2-M3"
        isLosersBracket: v.boolean(),

        // Participants
        team1Id: v.optional(v.id("teams")),
        team2Id: v.optional(v.id("teams")),
        winnerId: v.optional(v.id("teams")),

        // Scores
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),

        // Status
        status: v.union(
            v.literal("pending"),
            v.literal("ready"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("disputed")
        ),

        // Best of
        bestOf: v.number(), // 1, 3, 5
        currentGame: v.number(), // Game actuel dans le BO

        // Timestamps
        scheduledTime: v.optional(v.number()),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),

        // Navigation bracket
        nextMatchId: v.optional(v.id("matches")),

        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_tournament", ["tournamentId"])
        .index("by_phase", ["phaseId"])
        .index("by_status", ["status"])
        .index("by_tournament_and_round", ["tournamentId", "round"])
        .index("by_team1", ["team1Id"])
        .index("by_team2", ["team2Id"])
        // Index composé pour requêtes fréquentes
        .index("by_tournament_and_status", ["tournamentId", "status"]),

    // ============================================
    // MATCH GAMES (pour BO3, BO5)
    // ============================================

    matchGames: defineTable({
        matchId: v.id("matches"),
        gameNumber: v.number(), // 1, 2, 3, etc.

        mapName: v.optional(v.string()),

        winnerId: v.optional(v.id("teams")),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),

        status: v.union(
            v.literal("pending"),
            v.literal("in_progress"),
            v.literal("completed")
        ),

        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
    })
        .index("by_match", ["matchId"])
        .index("by_match_and_game", ["matchId", "gameNumber"]),

    // ============================================
    // MATCH VETO (système de ban/pick de maps)
    // ============================================

    matchVeto: defineTable({
        matchId: v.id("matches"),
        teamId: v.id("teams"),
        action: v.union(v.literal("ban"), v.literal("pick")),
        mapName: v.string(),
        order: v.number(), // Ordre du veto (1, 2, 3, ...)
        createdAt: v.number(),
    })
        .index("by_match", ["matchId"])
        .index("by_match_and_order", ["matchId", "order"]),

    // ============================================
    // MATCH CHAT
    // ============================================

    matchChat: defineTable({
        matchId: v.id("matches"),
        userId: v.id("users"),
        message: v.string(),
        createdAt: v.number(),
    })
        .index("by_match", ["matchId"])
        .index("by_match_and_time", ["matchId", "createdAt"]),

    // ============================================
    // NOTIFICATIONS
    // ============================================

    notifications: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("match_ready"),
            v.literal("team_invitation"),
            v.literal("tournament_update"),
            v.literal("check_in_reminder"),
            v.literal("match_result"),
            v.literal("tournament_start")
        ),

        title: v.string(),
        message: v.string(),
        link: v.optional(v.string()),

        // Métadonnées
        relatedTournamentId: v.optional(v.id("tournaments")),
        relatedMatchId: v.optional(v.id("matches")),
        relatedTeamId: v.optional(v.id("teams")),

        read: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_read", ["userId", "read"])
        .index("by_user_and_time", ["userId", "createdAt"]),

    // ============================================
    // USER STATS
    // ============================================

    userStats: defineTable({
        userId: v.id("users"),

        // Statistiques globales
        tournamentsPlayed: v.number(),
        tournamentsWon: v.number(),
        matchesPlayed: v.number(),
        matchesWon: v.number(),
        winRate: v.number(), // 0-100

        // ELO rating
        eloRating: v.number(),

        // Stats par jeu (flexible)
        statsByGame: v.optional(v.object({
            // Exemple: "League of Legends": { matches: 10, wins: 6 }
        })),

        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_elo", ["eloRating"]),

    // ============================================
    // NEWS & ANNOUNCEMENTS
    // ============================================

    news: defineTable({
        title: v.string(),
        content: v.string(),
        authorId: v.id("users"),

        isPinned: v.boolean(),
        publishedAt: v.number(),
        createdAt: v.number(),
    })
        .index("by_published", ["publishedAt"])
        .index("by_pinned", ["isPinned"]),

    // ============================================
    // COMMENTS (pour tournois/matchs)
    // ============================================

    comments: defineTable({
        userId: v.id("users"),
        content: v.string(),

        // Commentaire sur quoi ?
        tournamentId: v.optional(v.id("tournaments")),
        matchId: v.optional(v.id("matches")),

        // Threading
        parentId: v.optional(v.id("comments")),

        createdAt: v.number(),
    })
        .index("by_tournament", ["tournamentId"])
        .index("by_match", ["matchId"])
        .index("by_parent", ["parentId"]),
});
