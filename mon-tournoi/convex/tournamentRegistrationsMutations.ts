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
