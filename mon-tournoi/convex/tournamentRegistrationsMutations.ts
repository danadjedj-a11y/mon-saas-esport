/**
 * MUTATIONS POUR LES INSCRIPTIONS DE TOURNOI
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Inscrit une équipe à un tournoi
 */
export const register = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Vérifier que l'équipe existe et que l'utilisateur en est le capitaine
        const team = await ctx.db.get(args.teamId);
        if (!team) {
            throw new Error("Équipe non trouvée");
        }

        if (team.captainId !== user._id) {
            throw new Error("Seul le capitaine peut inscrire l'équipe");
        }

        // Vérifier que le tournoi existe et accepte les inscriptions
        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        if (tournament.status !== "draft") {
            throw new Error("Les inscriptions sont fermées");
        }

        // Vérifier que l'équipe n'est pas déjà inscrite
        const existing = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("teamId"), args.teamId))
            .first();

        if (existing) {
            throw new Error("Cette équipe est déjà inscrite");
        }

        // Vérifier le nombre max de participants
        if (tournament.maxTeams) {
            const registrations = await ctx.db
                .query("tournamentRegistrations")
                .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
                .collect();

            if (registrations.length >= tournament.maxTeams) {
                throw new Error("Le tournoi est complet");
            }
        }

        // Créer l'inscription
        const registrationId = await ctx.db.insert("tournamentRegistrations", {
            tournamentId: args.tournamentId,
            teamId: args.teamId,
            userId: user._id,
            status: "confirmed",
            seed: undefined,
            checkedInAt: undefined,
            createdAt: Date.now(),
        });

        return registrationId;
    },
});

/**
 * Retire une équipe d'un tournoi
 */
export const unregister = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Trouver l'inscription
        const registration = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("teamId"), args.teamId))
            .first();

        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        // Vérifier les permissions (capitaine ou organisateur)
        const team = await ctx.db.get(args.teamId);
        const tournament = await ctx.db.get(args.tournamentId);

        const isCapitaine = team && team.captainId === user._id;
        const isOrganizer = tournament && tournament.organizerId === user._id;

        if (!isCapitaine && !isOrganizer) {
            throw new Error("Non autorisé");
        }

        // Supprimer l'inscription
        await ctx.db.delete(registration._id);

        return { success: true };
    },
});

/**
 * Toggle check-in pour une équipe (change status en checked_in)
 */
export const toggleCheckIn = mutation({
    args: {
        registrationId: v.id("tournamentRegistrations"),
        checkedIn: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const registration = await ctx.db.get(args.registrationId);
        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        // Utilise le statut "checked_in" au lieu d'un flag boolean
        await ctx.db.patch(args.registrationId, {
            status: args.checkedIn ? "checked_in" : "confirmed",
            checkedInAt: args.checkedIn ? Date.now() : undefined,
        });

        return args.registrationId;
    },
});

/**
 * Disqualifie une équipe (change status en disqualified)
 */
export const disqualify = mutation({
    args: {
        registrationId: v.id("tournamentRegistrations"),
        disqualified: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const registration = await ctx.db.get(args.registrationId);
        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        // Vérifier que l'utilisateur est l'organisateur
        const tournament = await ctx.db.get(registration.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut disqualifier une équipe");
        }

        // Utilise le statut "disqualified" au lieu d'un flag boolean
        await ctx.db.patch(args.registrationId, {
            status: args.disqualified ? "disqualified" : "confirmed",
        });

        return args.registrationId;
    },
});

/**
 * Met à jour le seed d'une équipe
 */
export const updateSeed = mutation({
    args: {
        registrationId: v.id("tournamentRegistrations"),
        seed: v.union(v.number(), v.null()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const registration = await ctx.db.get(args.registrationId);
        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        await ctx.db.patch(args.registrationId, {
            seed: args.seed ?? undefined,
        });

        return args.registrationId;
    },
});

/**
 * Admin: supprime une inscription (par l'organisateur)
 */
export const removeParticipant = mutation({
    args: {
        registrationId: v.id("tournamentRegistrations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const registration = await ctx.db.get(args.registrationId);
        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        const tournament = await ctx.db.get(registration.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut supprimer un participant");
        }

        await ctx.db.delete(args.registrationId);

        return { success: true };
    },
});

/**
 * Admin: promouvoir une équipe depuis la waitlist vers les participants
 */
export const promoteFromWaitlist = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        waitlistEntryId: v.string(), // ID de l'entrée dans la waitlist
        teamId: v.id("teams"),
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
            throw new Error("Seul l'organisateur peut promouvoir depuis la waitlist");
        }

        // Vérifier que l'équipe n'est pas déjà inscrite
        const existing = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("teamId"), args.teamId))
            .first();

        if (existing) {
            throw new Error("Cette équipe est déjà inscrite");
        }

        // Vérifier le nombre max de participants
        if (tournament.maxTeams) {
            const registrations = await ctx.db
                .query("tournamentRegistrations")
                .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
                .collect();

            if (registrations.length >= tournament.maxTeams) {
                throw new Error("Le tournoi est complet");
            }
        }

        // Créer l'inscription
        const team = await ctx.db.get(args.teamId);
        await ctx.db.insert("tournamentRegistrations", {
            tournamentId: args.tournamentId,
            teamId: args.teamId,
            userId: team?.captainId,
            status: "confirmed",
            seed: undefined,
            checkedInAt: undefined,
            createdAt: Date.now(),
        });

        // Note: La waitlist est gérée séparément (dans une table ou un champ du tournoi)
        // Pour l'instant on ne supprime pas de la waitlist car elle n'est pas dans Convex
        // TODO: Migrer la waitlist vers Convex si nécessaire

        return { success: true };
    },
});

/**
 * Création manuelle d'une inscription par l'organisateur
 * Permet d'ajouter une équipe ou un joueur solo manuellement
 */
export const createManualRegistration = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.optional(v.id("teams")),
        playerName: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        seed: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Vérifier le tournoi
        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        // Vérifier que c'est l'organisateur
        if (tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut ajouter des participants manuellement");
        }

        // Vérifier qu'on a soit un teamId soit un playerName
        if (!args.teamId && !args.playerName) {
            throw new Error("Il faut spécifier une équipe ou un nom de joueur");
        }

        // Si équipe fournie, vérifier qu'elle n'est pas déjà inscrite
        if (args.teamId) {
            const existing = await ctx.db
                .query("tournamentRegistrations")
                .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
                .filter((q) => q.eq(q.field("teamId"), args.teamId))
                .first();

            if (existing) {
                throw new Error("Cette équipe est déjà inscrite");
            }
        }

        // Créer l'inscription
        const registrationId = await ctx.db.insert("tournamentRegistrations", {
            tournamentId: args.tournamentId,
            teamId: args.teamId,
            userId: args.userId,
            status: "confirmed",
            seed: args.seed,
            checkedInAt: undefined,
            createdAt: Date.now(),
            // Note: playerName pourrait être stocké dans un champ supplémentaire si nécessaire
        });

        return registrationId;
    },
});

/**
 * Actions en masse sur les inscriptions (bulk)
 */
export const bulkUpdateStatus = mutation({
    args: {
        registrationIds: v.array(v.id("tournamentRegistrations")),
        status: v.union(
            v.literal("pending"),
            v.literal("confirmed"),
            v.literal("rejected"),
            v.literal("checked_in")
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        let updatedCount = 0;

        for (const regId of args.registrationIds) {
            const registration = await ctx.db.get(regId);
            if (!registration) continue;

            // Vérifier que l'utilisateur est l'organisateur du tournoi
            const tournament = await ctx.db.get(registration.tournamentId);
            if (!tournament || tournament.organizerId !== user._id) continue;

            await ctx.db.patch(regId, {
                status: args.status,
                ...(args.status === "checked_in" ? { checkedInAt: Date.now() } : {}),
            });
            updatedCount++;
        }

        return { updatedCount };
    },
});

/**
 * Suppression en masse des inscriptions
 */
export const bulkDelete = mutation({
    args: {
        registrationIds: v.array(v.id("tournamentRegistrations")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        let deletedCount = 0;

        for (const regId of args.registrationIds) {
            const registration = await ctx.db.get(regId);
            if (!registration) continue;

            // Vérifier que l'utilisateur est l'organisateur du tournoi
            const tournament = await ctx.db.get(registration.tournamentId);
            if (!tournament || tournament.organizerId !== user._id) continue;

            await ctx.db.delete(regId);
            deletedCount++;
        }

        return { deletedCount };
    },
});
