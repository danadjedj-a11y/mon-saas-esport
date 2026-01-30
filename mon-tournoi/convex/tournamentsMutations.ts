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
        // Informations de base
        name: v.optional(v.string()),
        game: v.optional(v.string()),
        description: v.optional(v.string()),
        rules: v.optional(v.string()),
        prizePool: v.optional(v.string()),
        // Configuration
        maxTeams: v.optional(v.number()),
        teamSize: v.optional(v.number()),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        isPublic: v.optional(v.boolean()),
        // Apparence
        logoUrl: v.optional(v.string()),
        bannerUrl: v.optional(v.string()),
        // Check-in
        checkInRequired: v.optional(v.boolean()),
        checkInStart: v.optional(v.number()),
        checkInEnd: v.optional(v.number()),
        // Match settings
        bestOf: v.optional(v.number()),
        matchDurationMinutes: v.optional(v.number()),
        matchBreakMinutes: v.optional(v.number()),
        // Registration
        registrationDeadline: v.optional(v.number()),
        maxParticipants: v.optional(v.number()),
        // Discipline settings
        mapsPool: v.optional(v.array(v.string())),
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

        const { tournamentId, ...updates } = args;
        
        // Filter out undefined values and build patch object
        const patch: Record<string, unknown> = { updatedAt: Date.now() };
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                patch[key] = value;
            }
        });

        await ctx.db.patch(args.tournamentId, patch);

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
 * Publie un tournoi
 */
export const publish = mutation({
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
            throw new Error("Seul l'organisateur peut publier ce tournoi");
        }

        await ctx.db.patch(args.tournamentId, {
            status: "published",
            publishedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return args.tournamentId;
    },
});

/**
 * Dépublie un tournoi (repasse en draft)
 */
export const unpublish = mutation({
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
            throw new Error("Seul l'organisateur peut dépublier ce tournoi");
        }

        await ctx.db.patch(args.tournamentId, {
            status: "draft",
            updatedAt: Date.now(),
        });

        return args.tournamentId;
    },
});

/**
 * Archive un tournoi
 */
export const archive = mutation({
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
            throw new Error("Seul l'organisateur peut archiver ce tournoi");
        }

        await ctx.db.patch(args.tournamentId, {
            status: "archived",
            archivedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return args.tournamentId;
    },
});

/**
 * Duplique un tournoi
 */
export const duplicate = mutation({
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
            throw new Error("Seul l'organisateur peut dupliquer ce tournoi");
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, _creationTime, createdAt, updatedAt, publishedAt, archivedAt, status, ...tournamentData } = tournament;

        const now = Date.now();
        const newTournamentId = await ctx.db.insert("tournaments", {
            ...tournamentData,
            name: `${tournamentData.name} (copie)`,
            status: "draft",
            createdAt: now,
            updatedAt: now,
        });

        return newTournamentId;
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
