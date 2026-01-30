/**
 * QUERIES POUR LES INSCRIPTIONS DE TOURNOI
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste les inscriptions d'un tournoi avec les infos d'équipe
 */
export const listByTournament = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Enrichir avec les infos d'équipe
        return await Promise.all(
            registrations.map(async (reg) => {
                let team = null;
                let user = null;

                if (reg.teamId) {
                    const teamData = await ctx.db.get(reg.teamId);
                    if (teamData) {
                        // Récupérer les membres
                        const members = await ctx.db
                            .query("teamMembers")
                            .withIndex("by_team", (q) => q.eq("teamId", reg.teamId!))
                            .collect();

                        team = {
                            _id: teamData._id,
                            name: teamData.name,
                            tag: teamData.tag,
                            logoUrl: teamData.logoUrl,
                            captainId: teamData.captainId,
                            memberCount: members.length,
                        };
                    }
                }

                if (reg.userId) {
                    const userData = await ctx.db.get(reg.userId);
                    if (userData) {
                        user = {
                            _id: userData._id,
                            username: userData.username,
                            avatarUrl: userData.avatarUrl,
                        };
                    }
                }

                return {
                    ...reg,
                    team,
                    user,
                };
            })
        );
    },
});

/**
 * Récupère une inscription spécifique
 */
export const getById = query({
    args: { registrationId: v.id("tournamentRegistrations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.registrationId);
    },
});

/**
 * Vérifie si une équipe est inscrite à un tournoi
 */
export const isTeamRegistered = query({
    args: {
        tournamentId: v.id("tournaments"),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        const registration = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("teamId"), args.teamId))
            .first();

        return registration !== null;
    },
});

/**
 * Compte les inscriptions confirmées d'un tournoi
 */
export const countConfirmed = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament_and_status", (q) =>
                q.eq("tournamentId", args.tournamentId).eq("status", "confirmed")
            )
            .collect();

        return registrations.length;
    },
});

/**
 * Liste les inscriptions d'un utilisateur (via ses équipes)
 */
export const listByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Récupérer les équipes de l'utilisateur
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const teamIds = memberships.map((m) => m.teamId);
        if (teamIds.length === 0) return [];

        // Récupérer les inscriptions de ces équipes
        const registrations = [];
        for (const teamId of teamIds) {
            const teamRegs = await ctx.db
                .query("tournamentRegistrations")
                .withIndex("by_team", (q) => q.eq("teamId", teamId))
                .collect();
            registrations.push(...teamRegs);
        }

        // Enrichir avec les infos du tournoi
        return await Promise.all(
            registrations.map(async (reg) => {
                const tournament = await ctx.db.get(reg.tournamentId);
                const team = await ctx.db.get(reg.teamId!);

                return {
                    ...reg,
                    tournament: tournament ? {
                        _id: tournament._id,
                        name: tournament.name,
                        game: tournament.game,
                        status: tournament.status,
                        startDate: tournament.startDate,
                    } : null,
                    team: team ? {
                        _id: team._id,
                        name: team.name,
                        tag: team.tag,
                    } : null,
                };
            })
        );
    },
});
