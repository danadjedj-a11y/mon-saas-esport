/**
 * QUERIES ET MUTATIONS POUR LE CATALOGUE DE JEUX
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste tous les jeux actifs
 */
export const list = query({
    args: {
        includeInactive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        if (args.includeInactive) {
            return await ctx.db.query("games").collect();
        }

        return await ctx.db
            .query("games")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .collect();
    },
});

/**
 * Récupère un jeu par slug
 */
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query("games")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!game) return null;

        // Compte les tournois pour ce jeu
        const tournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_game", (q) => q.eq("game", game.name))
            .collect();

        return {
            ...game,
            tournamentsCount: tournaments.length,
            activeTournaments: tournaments.filter(t => t.status !== "completed").length,
        };
    },
});

/**
 * Récupère un jeu par ID
 */
export const getById = query({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.gameId);
    },
});

/**
 * Crée un nouveau jeu (admin)
 */
export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        bannerUrl: v.optional(v.string()),
        description: v.optional(v.string()),
        defaultTeamSize: v.number(),
        maps: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Vérifie si le slug existe déjà
        const existing = await ctx.db
            .query("games")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (existing) {
            throw new Error("A game with this slug already exists");
        }

        const gameId = await ctx.db.insert("games", {
            name: args.name,
            slug: args.slug,
            logoUrl: args.logoUrl,
            bannerUrl: args.bannerUrl,
            description: args.description,
            defaultTeamSize: args.defaultTeamSize,
            maps: args.maps,
            tournamentsCount: 0,
            isActive: true,
            createdAt: Date.now(),
        });

        return gameId;
    },
});

/**
 * Met à jour un jeu
 */
export const update = mutation({
    args: {
        gameId: v.id("games"),
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        bannerUrl: v.optional(v.string()),
        description: v.optional(v.string()),
        defaultTeamSize: v.optional(v.number()),
        maps: v.optional(v.array(v.string())),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { gameId, ...updates } = args;

        // Filtre les valeurs undefined
        const cleanUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                cleanUpdates[key] = value;
            }
        }

        await ctx.db.patch(gameId, cleanUpdates);
        return { success: true };
    },
});

/**
 * Liste les tournois pour un jeu
 */
export const getTournamentsByGame = query({
    args: {
        gameName: v.string(),
        status: v.optional(v.union(
            v.literal("draft"),
            v.literal("ongoing"),
            v.literal("completed")
        )),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("tournaments")
            .withIndex("by_game", (q) => q.eq("game", args.gameName));

        let tournaments = await query.collect();

        // Filtre par statut si spécifié
        if (args.status) {
            tournaments = tournaments.filter(t => t.status === args.status);
        }

        // Limite les résultats
        if (args.limit) {
            tournaments = tournaments.slice(0, args.limit);
        }

        return tournaments;
    },
});
