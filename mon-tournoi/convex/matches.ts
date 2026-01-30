/**
 * QUERIES POUR LES MATCHS
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste les matchs d'un tournoi
 */
export const listByTournament = query({
    args: {
        tournamentId: v.id("tournaments"),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Filtre par status si spécifié
        if (args.status) {
            matches = matches.filter((m) => m.status === args.status);
        }

        // Enrichit avec les infos des équipes
        return await Promise.all(
            matches.map(async (match) => {
                const team1 = match.team1Id ? await ctx.db.get(match.team1Id) : null;
                const team2 = match.team2Id ? await ctx.db.get(match.team2Id) : null;

                return {
                    ...match,
                    team1: team1 ? { _id: team1._id, name: team1.name, tag: team1.tag } : null,
                    team2: team2 ? { _id: team2._id, name: team2.name, tag: team2.tag } : null,
                };
            })
        );
    },
});

/**
 * Récupère un match par ID avec tous ses détails
 */
export const getById = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) return null;

        // Récupère les équipes
        const team1 = match.team1Id ? await ctx.db.get(match.team1Id) : null;
        const team2 = match.team2Id ? await ctx.db.get(match.team2Id) : null;

        // Récupère les games (pour BO3/BO5)
        const games = await ctx.db
            .query("matchGames")
            .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
            .collect();

        // Récupère le veto
        const veto = await ctx.db
            .query("matchVeto")
            .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
            .collect();

        return {
            ...match,
            team1: team1 ? { _id: team1._id, name: team1.name, tag: team1.tag, logoUrl: team1.logoUrl } : null,
            team2: team2 ? { _id: team2._id, name: team2.name, tag: team2.tag, logoUrl: team2.logoUrl } : null,
            games: games.sort((a, b) => a.gameNumber - b.gameNumber),
            veto: veto.sort((a, b) => a.order - b.order),
        };
    },
});

/**
 * Liste les matchs d'une équipe
 */
export const listByTeam = query({
    args: { teamId: v.id("teams") },
    handler: async (ctx, args) => {
        const matchesAsTeam1 = await ctx.db
            .query("matches")
            .withIndex("by_team1", (q) => q.eq("team1Id", args.teamId))
            .collect();

        const matchesAsTeam2 = await ctx.db
            .query("matches")
            .withIndex("by_team2", (q) => q.eq("team2Id", args.teamId))
            .collect();

        const allMatches = [...matchesAsTeam1, ...matchesAsTeam2];

        // Enrichit avec les infos des équipes adverses
        return await Promise.all(
            allMatches.map(async (match) => {
                const opponent = match.team1Id === args.teamId
                    ? (match.team2Id ? await ctx.db.get(match.team2Id) : null)
                    : (match.team1Id ? await ctx.db.get(match.team1Id) : null);

                return {
                    ...match,
                    opponent: opponent ? { _id: opponent._id, name: opponent.name, tag: opponent.tag } : null,
                };
            })
        );
    },
});

/**
 * Liste les matchs à venir pour un utilisateur (via ses équipes)
 */
export const listUpcoming = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Récupère les équipes de l'utilisateur
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const teamIds = memberships.map((m) => m.teamId);
        if (teamIds.length === 0) return [];

        // Récupère les matchs à venir pour ces équipes
        const allMatches = [];
        for (const teamId of teamIds) {
            const matchesAsTeam1 = await ctx.db
                .query("matches")
                .withIndex("by_team1", (q) => q.eq("team1Id", teamId))
                .filter((q) =>
                    q.or(
                        q.eq(q.field("status"), "pending"),
                        q.eq(q.field("status"), "in_progress")
                    )
                )
                .collect();

            const matchesAsTeam2 = await ctx.db
                .query("matches")
                .withIndex("by_team2", (q) => q.eq("team2Id", teamId))
                .filter((q) =>
                    q.or(
                        q.eq(q.field("status"), "pending"),
                        q.eq(q.field("status"), "in_progress")
                    )
                )
                .collect();

            allMatches.push(...matchesAsTeam1, ...matchesAsTeam2);
        }

        // Déduplique et enrichit
        const uniqueMatches = Array.from(
            new Map(allMatches.map((m) => [m._id, m])).values()
        );

        const enriched = await Promise.all(
            uniqueMatches.slice(0, args.limit ?? 10).map(async (match) => {
                const team1 = match.team1Id ? await ctx.db.get(match.team1Id) : null;
                const team2 = match.team2Id ? await ctx.db.get(match.team2Id) : null;
                const tournament = await ctx.db.get(match.tournamentId);

                return {
                    ...match,
                    team1: team1 ? { _id: team1._id, name: team1.name, tag: team1.tag } : null,
                    team2: team2 ? { _id: team2._id, name: team2.name, tag: team2.tag } : null,
                    tournament: tournament ? { name: tournament.name, game: tournament.game } : null,
                };
            })
        );

        return enriched;
    },
});

/**
 * Liste les matchs récents (terminés) pour un utilisateur
 */
export const listRecent = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Récupère les équipes de l'utilisateur
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const teamIds = memberships.map((m) => m.teamId);
        if (teamIds.length === 0) return [];

        // Récupère les matchs terminés pour ces équipes
        const allMatches = [];
        for (const teamId of teamIds) {
            const matchesAsTeam1 = await ctx.db
                .query("matches")
                .withIndex("by_team1", (q) => q.eq("team1Id", teamId))
                .filter((q) => q.eq(q.field("status"), "completed"))
                .collect();

            const matchesAsTeam2 = await ctx.db
                .query("matches")
                .withIndex("by_team2", (q) => q.eq("team2Id", teamId))
                .filter((q) => q.eq(q.field("status"), "completed"))
                .collect();

            allMatches.push(...matchesAsTeam1, ...matchesAsTeam2);
        }

        // Déduplique, trie par date et enrichit
        const uniqueMatches = Array.from(
            new Map(allMatches.map((m) => [m._id, m])).values()
        ).sort((a, b) => b.completedAt - a.completedAt);

        const enriched = await Promise.all(
            uniqueMatches.slice(0, args.limit ?? 10).map(async (match) => {
                const team1 = match.team1Id ? await ctx.db.get(match.team1Id) : null;
                const team2 = match.team2Id ? await ctx.db.get(match.team2Id) : null;
                const tournament = await ctx.db.get(match.tournamentId);

                return {
                    ...match,
                    team1: team1 ? { _id: team1._id, name: team1.name, tag: team1.tag } : null,
                    team2: team2 ? { _id: team2._id, name: team2.name, tag: team2.tag } : null,
                    tournament: tournament ? { name: tournament.name, game: tournament.game } : null,
                };
            })
        );

        return enriched;
    },
});
