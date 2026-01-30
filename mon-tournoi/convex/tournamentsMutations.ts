/**
 * MUTATIONS POUR LES TOURNOIS
 * 
 * Optimisations :
 * - Validation stricte des données
 * - Transactions atomiques
 * - Gestion d'erreurs
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Crée un nouveau tournoi
 */
export const create = mutation({
    args: {
        name: v.string(),
        game: v.string(),
        format: v.union(
            v.literal("elimination"),
            v.literal("double_elimination"),
            v.literal("swiss"),
            v.literal("round_robin"),
            v.literal("gauntlet")
        ),
        maxTeams: v.number(),
        teamSize: v.number(),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        description: v.optional(v.string()),
        rules: v.optional(v.string()),
        prizePool: v.optional(v.string()),
        checkInRequired: v.boolean(),
        checkInStart: v.optional(v.number()),
        checkInEnd: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Récupère l'utilisateur authentifié
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        // Trouve l'utilisateur dans la DB
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Vérifie que l'utilisateur est organisateur
        if (user.role !== "organizer") {
            throw new Error("Seuls les organisateurs peuvent créer des tournois");
        }

        // Validation
        if (args.maxTeams < 2) {
            throw new Error("Un tournoi doit avoir au moins 2 participants");
        }

        if (args.teamSize < 1) {
            throw new Error("La taille d'équipe doit être au moins 1");
        }

        // Crée le tournoi
        const now = Date.now();
        const tournamentId = await ctx.db.insert("tournaments", {
            name: args.name,
            game: args.game,
            format: args.format,
            status: "draft",
            organizerId: user._id,
            maxTeams: args.maxTeams,
            teamSize: args.teamSize,
            startDate: args.startDate,
            endDate: args.endDate,
            description: args.description,
            rules: args.rules,
            prizePool: args.prizePool,
            isPublic: true,
            checkInRequired: args.checkInRequired,
            checkInStart: args.checkInStart,
            checkInEnd: args.checkInEnd,
            createdAt: now,
            updatedAt: now,
        });

        return tournamentId;
    },
});

/**
 * Met à jour un tournoi
 */
export const update = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        rules: v.optional(v.string()),
        prizePool: v.optional(v.string()),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        isPublic: v.optional(v.boolean()),
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
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut modifier ce tournoi");
        }

        // Ne peut pas modifier un tournoi terminé
        if (tournament.status === "completed") {
            throw new Error("Impossible de modifier un tournoi terminé");
        }

        await ctx.db.patch(args.tournamentId, {
            ...(args.name && { name: args.name }),
            ...(args.description !== undefined && { description: args.description }),
            ...(args.rules !== undefined && { rules: args.rules }),
            ...(args.prizePool !== undefined && { prizePool: args.prizePool }),
            ...(args.startDate !== undefined && { startDate: args.startDate }),
            ...(args.endDate !== undefined && { endDate: args.endDate }),
            ...(args.isPublic !== undefined && { isPublic: args.isPublic }),
            updatedAt: Date.now(),
        });

        return args.tournamentId;
    },
});

/**
 * Change le statut d'un tournoi
 */
export const updateStatus = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        status: v.union(
            v.literal("draft"),
            v.literal("ongoing"),
            v.literal("completed")
        ),
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
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut modifier le statut");
        }

        await ctx.db.patch(args.tournamentId, {
            status: args.status,
            updatedAt: Date.now(),
        });

        return args.tournamentId;
    },
});

/**
 * Supprime un tournoi (seulement si draft et aucun participant)
 */
export const remove = mutation({
    args: { tournamentId: v.id("tournaments") },
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
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut supprimer ce tournoi");
        }

        // Vérifie qu'il est en draft
        if (tournament.status !== "draft") {
            throw new Error("Seuls les tournois en brouillon peuvent être supprimés");
        }

        // Vérifie qu'il n'y a pas de participants
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        if (registrations.length > 0) {
            throw new Error("Impossible de supprimer un tournoi avec des participants");
        }

        await ctx.db.delete(args.tournamentId);
        return { success: true };
    },
});
