/**
 * QUERIES ET MUTATIONS POUR LE SYSTÈME DE FOLLOW
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// TOURNAMENT FOLLOWS
// ============================================

/**
 * Vérifie si l'utilisateur suit un tournoi
 */
export const isFollowingTournament = query({
    args: {
        userId: v.id("users"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const follow = await ctx.db
            .query("tournamentFollows")
            .withIndex("by_user_and_tournament", (q) =>
                q.eq("userId", args.userId).eq("tournamentId", args.tournamentId)
            )
            .first();

        return !!follow;
    },
});

/**
 * Compte les followers d'un tournoi
 */
export const getTournamentFollowersCount = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const followers = await ctx.db
            .query("tournamentFollows")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        return followers.length;
    },
});

/**
 * Follow/Unfollow un tournoi
 */
export const toggleTournamentFollow = mutation({
    args: {
        userId: v.id("users"),
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        // Vérifie si déjà suivi
        const existing = await ctx.db
            .query("tournamentFollows")
            .withIndex("by_user_and_tournament", (q) =>
                q.eq("userId", args.userId).eq("tournamentId", args.tournamentId)
            )
            .first();

        if (existing) {
            // Unfollow
            await ctx.db.delete(existing._id);
            return { action: "unfollowed" };
        } else {
            // Follow
            await ctx.db.insert("tournamentFollows", {
                userId: args.userId,
                tournamentId: args.tournamentId,
                createdAt: Date.now(),
            });
            return { action: "followed" };
        }
    },
});

/**
 * Liste les tournois suivis par un utilisateur
 */
export const listFollowedTournaments = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const follows = await ctx.db
            .query("tournamentFollows")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const tournaments = await Promise.all(
            follows.map(async (f) => {
                const tournament = await ctx.db.get(f.tournamentId);
                return tournament;
            })
        );

        return tournaments.filter(Boolean);
    },
});

// ============================================
// TEAM FOLLOWS
// ============================================

/**
 * Vérifie si l'utilisateur suit une équipe
 */
export const isFollowingTeam = query({
    args: {
        userId: v.id("users"),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        const follow = await ctx.db
            .query("teamFollows")
            .withIndex("by_user_and_team", (q) =>
                q.eq("userId", args.userId).eq("teamId", args.teamId)
            )
            .first();

        return !!follow;
    },
});

/**
 * Compte les followers d'une équipe
 */
export const getTeamFollowersCount = query({
    args: { teamId: v.id("teams") },
    handler: async (ctx, args) => {
        const followers = await ctx.db
            .query("teamFollows")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        return followers.length;
    },
});

/**
 * Follow/Unfollow une équipe
 */
export const toggleTeamFollow = mutation({
    args: {
        userId: v.id("users"),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        // Vérifie si déjà suivi
        const existing = await ctx.db
            .query("teamFollows")
            .withIndex("by_user_and_team", (q) =>
                q.eq("userId", args.userId).eq("teamId", args.teamId)
            )
            .first();

        if (existing) {
            // Unfollow
            await ctx.db.delete(existing._id);
            return { action: "unfollowed" };
        } else {
            // Follow
            await ctx.db.insert("teamFollows", {
                userId: args.userId,
                teamId: args.teamId,
                createdAt: Date.now(),
            });
            return { action: "followed" };
        }
    },
});

/**
 * Liste les équipes suivies par un utilisateur
 */
export const listFollowedTeams = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const follows = await ctx.db
            .query("teamFollows")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const teams = await Promise.all(
            follows.map(async (f) => {
                const team = await ctx.db.get(f.teamId);
                return team;
            })
        );

        return teams.filter(Boolean);
    },
});
