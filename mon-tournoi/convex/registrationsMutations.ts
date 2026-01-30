/**
 * MUTATIONS POUR LES INSCRIPTIONS AUX TOURNOIS
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Inscrit un joueur ou une équipe à un tournoi
 */
export const register = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.optional(v.id("teams")),
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

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        // Vérifie que le tournoi est ouvert aux inscriptions
        if (tournament.status !== "draft") {
            throw new Error("Les inscriptions sont fermées");
        }

        // Vérifie qu'il reste de la place
        const existingRegistrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        if (existingRegistrations.length >= tournament.maxTeams) {
            throw new Error("Le tournoi est complet");
        }

        // Vérifie que l'utilisateur/équipe n'est pas déjà inscrit
        const alreadyRegistered = existingRegistrations.some((r) =>
            (args.teamId && r.teamId === args.teamId) ||
            (!args.teamId && r.userId === user._id)
        );

        if (alreadyRegistered) {
            throw new Error("Déjà inscrit à ce tournoi");
        }

        // Crée l'inscription
        const registrationId = await ctx.db.insert("tournamentRegistrations", {
            tournamentId: args.tournamentId,
            teamId: args.teamId,
            userId: args.teamId ? undefined : user._id,
            status: "pending",
            createdAt: Date.now(),
        });

        // Crée une notification pour l'organisateur
        await ctx.db.insert("notifications", {
            userId: tournament.organizerId,
            type: "tournament_update",
            title: "Nouvelle inscription",
            message: args.teamId
                ? "Une équipe s'est inscrite à votre tournoi"
                : `${user.username} s'est inscrit à votre tournoi`,
            relatedTournamentId: args.tournamentId,
            read: false,
            createdAt: Date.now(),
        });

        return registrationId;
    },
});

/**
 * Check-in pour un tournoi
 */
export const checkIn = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.optional(v.id("teams")),
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

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        // Vérifie que le check-in est requis
        if (!tournament.checkInRequired) {
            throw new Error("Le check-in n'est pas requis pour ce tournoi");
        }

        // Vérifie que le check-in est ouvert
        const now = Date.now();
        if (tournament.checkInStart && now < tournament.checkInStart) {
            throw new Error("Le check-in n'est pas encore ouvert");
        }
        if (tournament.checkInEnd && now > tournament.checkInEnd) {
            throw new Error("Le check-in est fermé");
        }

        // Trouve l'inscription
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        const registration = registrations.find((r) =>
            (args.teamId && r.teamId === args.teamId) ||
            (!args.teamId && r.userId === user._id)
        );

        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        if (registration.status === "checked_in") {
            throw new Error("Déjà check-in");
        }

        // Met à jour l'inscription
        await ctx.db.patch(registration._id, {
            status: "checked_in",
            checkedInAt: now,
        });

        return registration._id;
    },
});

/**
 * Annule une inscription
 */
export const unregister = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.optional(v.id("teams")),
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

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        // Ne peut pas se désinscrire si le tournoi a commencé
        if (tournament.status !== "draft") {
            throw new Error("Impossible de se désinscrire d'un tournoi en cours");
        }

        // Trouve l'inscription
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        const registration = registrations.find((r) =>
            (args.teamId && r.teamId === args.teamId) ||
            (!args.teamId && r.userId === user._id)
        );

        if (!registration) {
            throw new Error("Inscription non trouvée");
        }

        // Supprime l'inscription
        await ctx.db.delete(registration._id);

        return { success: true };
    },
});
