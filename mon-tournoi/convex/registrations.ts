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
