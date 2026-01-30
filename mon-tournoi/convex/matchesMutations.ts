/**
 * MUTATIONS POUR LES MATCHS
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Met à jour le score d'un match
 */
export const updateScore = mutation({
    args: {
        matchId: v.id("matches"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
        winnerId: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        // Récupère le tournoi pour vérifier les permissions
        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Vérifie que l'utilisateur est l'organisateur
        if (tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut modifier les scores");
        }

        // Met à jour le match
        await ctx.db.patch(args.matchId, {
            scoreTeam1: args.scoreTeam1,
            scoreTeam2: args.scoreTeam2,
            winnerId: args.winnerId,
            status: args.winnerId ? "completed" : match.status,
            completedAt: args.winnerId ? Date.now() : match.completedAt,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Change le statut d'un match
 */
export const updateStatus = mutation({
    args: {
        matchId: v.id("matches"),
        status: v.union(
            v.literal("pending"),
            v.literal("ready"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("disputed")
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        await ctx.db.patch(args.matchId, {
            status: args.status,
            startedAt: args.status === "in_progress" && !match.startedAt ? Date.now() : match.startedAt,
            completedAt: args.status === "completed" && !match.completedAt ? Date.now() : match.completedAt,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Ajoute une action de veto (ban/pick de map)
 */
export const addVeto = mutation({
    args: {
        matchId: v.id("matches"),
        teamId: v.id("teams"),
        action: v.union(v.literal("ban"), v.literal("pick")),
        mapName: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        // Vérifie que l'équipe participe au match
        if (match.team1Id !== args.teamId && match.team2Id !== args.teamId) {
            throw new Error("Cette équipe ne participe pas à ce match");
        }

        // Compte les vetos existants pour déterminer l'ordre
        const existingVetos = await ctx.db
            .query("matchVeto")
            .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
            .collect();

        const vetoId = await ctx.db.insert("matchVeto", {
            matchId: args.matchId,
            teamId: args.teamId,
            action: args.action,
            mapName: args.mapName,
            order: existingVetos.length + 1,
            createdAt: Date.now(),
        });

        return vetoId;
    },
});

/**
 * Crée un game dans un match (pour BO3/BO5)
 */
export const createGame = mutation({
    args: {
        matchId: v.id("matches"),
        gameNumber: v.number(),
        mapName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const gameId = await ctx.db.insert("matchGames", {
            matchId: args.matchId,
            gameNumber: args.gameNumber,
            mapName: args.mapName,
            scoreTeam1: 0,
            scoreTeam2: 0,
            status: "pending",
        });

        return gameId;
    },
});

/**
 * Met à jour le score d'un game
 */
export const updateGameScore = mutation({
    args: {
        gameId: v.id("matchGames"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
        winnerId: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        await ctx.db.patch(args.gameId, {
            scoreTeam1: args.scoreTeam1,
            scoreTeam2: args.scoreTeam2,
            winnerId: args.winnerId,
            status: args.winnerId ? "completed" : "in_progress",
            completedAt: args.winnerId ? Date.now() : undefined,
        });

        return args.gameId;
    },
});

/**
 * Crée un match dans un tournoi
 */
export const createMatch = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        matchNumber: v.number(),
        round: v.number(),
        team1Id: v.optional(v.id("teams")),
        team2Id: v.optional(v.id("teams")),
        isLosersBracket: v.optional(v.boolean()),
        bestOf: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut créer des matchs");
        }

        const matchId = await ctx.db.insert("matches", {
            tournamentId: args.tournamentId,
            matchNumber: args.matchNumber,
            round: args.round,
            team1Id: args.team1Id,
            team2Id: args.team2Id,
            scoreTeam1: 0,
            scoreTeam2: 0,
            status: "pending",
            isLosersBracket: args.isLosersBracket ?? false,
            bestOf: args.bestOf ?? 1,
            currentGame: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return matchId;
    },
});

/**
 * Supprime tous les matchs d'un tournoi
 */
export const deleteAllByTournament = mutation({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut supprimer les matchs");
        }

        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        for (const match of matches) {
            await ctx.db.delete(match._id);
        }

        return { deletedCount: matches.length };
    },
});

/**
 * Met à jour les équipes d'un match (pour la progression)
 */
export const updateTeams = mutation({
    args: {
        matchId: v.id("matches"),
        team1Id: v.optional(v.id("teams")),
        team2Id: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const updateData: { team1Id?: typeof args.team1Id; team2Id?: typeof args.team2Id; updatedAt: number } = {
            updatedAt: Date.now(),
        };

        if (args.team1Id !== undefined) {
            updateData.team1Id = args.team1Id;
        }
        if (args.team2Id !== undefined) {
            updateData.team2Id = args.team2Id;
        }

        await ctx.db.patch(args.matchId, updateData);

        return args.matchId;
    },
});

/**
 * Batch create matches pour générer un bracket complet
 */
export const batchCreate = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        matches: v.array(v.object({
            matchNumber: v.number(),
            round: v.number(),
            team1Id: v.optional(v.id("teams")),
            team2Id: v.optional(v.id("teams")),
            isLosersBracket: v.optional(v.boolean()),
            bestOf: v.optional(v.number()),
            status: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut créer des matchs");
        }

        const createdIds = [];
        const now = Date.now();

        for (const matchData of args.matches) {
            const matchId = await ctx.db.insert("matches", {
                tournamentId: args.tournamentId,
                matchNumber: matchData.matchNumber,
                round: matchData.round,
                team1Id: matchData.team1Id,
                team2Id: matchData.team2Id,
                scoreTeam1: 0,
                scoreTeam2: 0,
                status: (matchData.status as "pending" | "ready" | "in_progress" | "completed" | "disputed") || "pending",
                isLosersBracket: matchData.isLosersBracket ?? false,
                bestOf: matchData.bestOf ?? 1,
                currentGame: 1,
                createdAt: now,
                updatedAt: now,
            });
            createdIds.push(matchId);
        }

        return { createdCount: createdIds.length, matchIds: createdIds };
    },
});
