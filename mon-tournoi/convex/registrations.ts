/**
 * QUERIES POUR LES INSCRIPTIONS AUX TOURNOIS
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste les participants d'un tournoi
 */
export const listByTournament = query({
    args: {
        tournamentId: v.id("tournaments"),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId));

        if (args.status) {
            query = ctx.db
                .query("tournamentRegistrations")
                .withIndex("by_tournament_and_status", (q) =>
                    q.eq("tournamentId", args.tournamentId).eq("status", args.status as any)
                );
        }

        const registrations = await query.collect();

        // Enrichit avec les infos des équipes/joueurs
        return await Promise.all(
            registrations.map(async (reg) => {
                if (reg.teamId) {
                    const team = await ctx.db.get(reg.teamId);
                    return {
                        ...reg,
                        team: team ? { _id: team._id, name: team.name, tag: team.tag } : null,
                    };
                } else if (reg.userId) {
                    const user = await ctx.db.get(reg.userId);
                    return {
                        ...reg,
                        user: user ? { _id: user._id, username: user.username, avatarUrl: user.avatarUrl } : null,
                    };
                }
                return reg;
            })
        );
    },
});

/**
 * Vérifie si un utilisateur/équipe est inscrit à un tournoi
 */
export const isRegistered = query({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.optional(v.id("teams")),
        userId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        if (args.teamId) {
            return registrations.some((r) => r.teamId === args.teamId);
        } else if (args.userId) {
            return registrations.some((r) => r.userId === args.userId);
        }

        return false;
    },
});

/**
 * Vérifie l'éligibilité d'un utilisateur à s'inscrire
 */
export const checkEligibility = query({
    args: {
        tournamentId: v.id("tournaments"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            return { canRegister: false, reason: "Tournoi introuvable", tournament: null };
        }

        // Vérifier le statut du tournoi
        if (tournament.status !== "draft") {
            return { 
                canRegister: false, 
                reason: "Les inscriptions sont fermées (tournoi en cours ou terminé)", 
                tournament 
            };
        }

        // Vérifier la date limite d'inscription
        if (tournament.registrationDeadline && tournament.registrationDeadline < Date.now()) {
            return { 
                canRegister: false, 
                reason: "La date limite d'inscription est dépassée", 
                tournament 
            };
        }

        // Récupérer les équipes de l'utilisateur
        const userTeams = await ctx.db
            .query("teams")
            .withIndex("by_captain", (q) => q.eq("captainId", args.userId))
            .collect();

        const userTeamIds = userTeams.map(t => t._id);

        // Vérifier les inscriptions existantes
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Vérifier si l'utilisateur ou une de ses équipes est déjà inscrit
        const existingParticipation = registrations.find((r) =>
            r.userId === args.userId || (r.teamId && userTeamIds.includes(r.teamId))
        );

        if (existingParticipation) {
            return { 
                canRegister: false, 
                reason: "Vous êtes déjà inscrit à ce tournoi", 
                tournament,
                existingParticipation: {
                    id: existingParticipation._id,
                    teamId: existingParticipation.teamId,
                }
            };
        }

        // Compter les participants
        const currentCount = registrations.length;
        const maxParticipants = tournament.maxParticipants || tournament.maxTeams;
        const isFull = maxParticipants && currentCount >= maxParticipants;

        return { 
            canRegister: true, 
            reason: null, 
            tournament,
            currentCount,
            maxParticipants,
            isFull,
            spotsLeft: maxParticipants ? maxParticipants - currentCount : null
        };
    },
});

/**
 * Récupère les équipes d'un utilisateur (dont il est capitaine)
 */
export const getUserTeams = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("teams")
            .withIndex("by_captain", (q) => q.eq("captainId", args.userId))
            .filter((q) => q.eq(q.field("isTemporary"), false))
            .collect();
    },
});
