/**
 * QUERIES POUR LES TOURNOIS
 * 
 * Optimisations :
 * - Utilisation des indexes pour performance
 * - Pagination pour grandes listes
 * - Filtres composés
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste tous les tournois publics actifs (draft + ongoing)
 * Optimisé avec index "by_status_and_public"
 */
export const listPublic = query({
    args: {
        limit: v.optional(v.number()),
        game: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("tournaments")
            .withIndex("by_public", (q) => q.eq("isPublic", true));

        // Filtre par jeu si spécifié
        if (args.game) {
            query = ctx.db
                .query("tournaments")
                .withIndex("by_game_and_status", (q) => q.eq("game", args.game));
        }

        const tournaments = await query
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "draft"),
                    q.eq(q.field("status"), "ongoing")
                )
            )
            .order("desc")
            .take(args.limit ?? 50);

        return tournaments;
    },
});

/**
 * Récupère un tournoi par ID avec ses détails
 */
export const getById = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const tournament = await ctx.db.get(args.tournamentId);

        if (!tournament) {
            return null;
        }

        // Récupère l'organisateur
        const organizer = await ctx.db.get(tournament.organizerId);

        // Compte les participants
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        return {
            ...tournament,
            organizer: organizer ? {
                _id: organizer._id,
                username: organizer.username,
                avatarUrl: organizer.avatarUrl,
            } : null,
            participantCount: registrations.length,
        };
    },
});

/**
 * Liste les tournois d'un organisateur
 * Optimisé avec index "by_organizer"
 */
export const listByOrganizer = query({
    args: {
        organizerId: v.id("users"),
        status: v.optional(v.union(
            v.literal("draft"),
            v.literal("ongoing"),
            v.literal("completed")
        )),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("tournaments")
            .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId));

        const tournaments = await query.collect();

        // Filtre par status si spécifié
        if (args.status) {
            return tournaments.filter(t => t.status === args.status);
        }

        return tournaments;
    },
});

/**
 * Recherche de tournois avec filtres multiples
 */
export const search = query({
    args: {
        searchQuery: v.optional(v.string()),
        game: v.optional(v.string()),
        format: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Commence avec tous les tournois publics
        let tournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_public", (q) => q.eq("isPublic", true))
            .collect();

        // Filtre par recherche textuelle
        if (args.searchQuery) {
            const query = args.searchQuery.toLowerCase();
            tournaments = tournaments.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.game.toLowerCase().includes(query)
            );
        }

        // Filtre par jeu
        if (args.game) {
            tournaments = tournaments.filter(t => t.game === args.game);
        }

        // Filtre par format
        if (args.format) {
            tournaments = tournaments.filter(t => t.format === args.format);
        }

        // Filtre par status
        if (args.status) {
            tournaments = tournaments.filter(t => t.status === args.status);
        }

        // Limite les résultats
        return tournaments.slice(0, args.limit ?? 50);
    },
});

/**
 * Récupère les jeux disponibles (liste unique)
 */
export const getAvailableGames = query({
    handler: async (ctx) => {
        const tournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_public", (q) => q.eq("isPublic", true))
            .collect();

        const games = [...new Set(tournaments.map(t => t.game))];
        return games.sort();
    },
});

/**
 * Vérifie si un utilisateur est inscrit à un tournoi
 */
export const isUserRegistered = query({
    args: {
        tournamentId: v.id("tournaments"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const registration = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .first();

        return registration !== null;
    },
});

/**
 * Liste les tournois où un utilisateur participe (via ses équipes)
 */
export const listByParticipant = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Récupère les équipes de l'utilisateur
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const teamIds = memberships.map((m) => m.teamId);
        if (teamIds.length === 0) return [];

        // Récupère les inscriptions de ces équipes
        const registrations = [];
        for (const teamId of teamIds) {
            const teamRegs = await ctx.db
                .query("tournamentRegistrations")
                .filter((q) => q.eq(q.field("teamId"), teamId))
                .collect();
            registrations.push(...teamRegs);
        }

        // Récupère les tournois uniques
        const tournamentIds = [...new Set(registrations.map((r) => r.tournamentId))];

        const tournaments = await Promise.all(
            tournamentIds.map(async (tournamentId) => {
                const tournament = await ctx.db.get(tournamentId);
                if (!tournament) return null;

                // Compte les participants
                const allRegs = await ctx.db
                    .query("tournamentRegistrations")
                    .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
                    .collect();

                return {
                    ...tournament,
                    participantCount: allRegs.length,
                };
            })
        );

        return tournaments.filter(Boolean);
    },
});
