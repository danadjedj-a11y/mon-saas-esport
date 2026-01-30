/**
 * QUERIES POUR LES ÉQUIPES
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste toutes les équipes d'un utilisateur
 */
export const listByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Récupère les memberships
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        // Récupère les équipes
        const teams = await Promise.all(
            memberships.map(async (m) => {
                const team = await ctx.db.get(m.teamId);
                if (!team) return null;

                // Compte les membres
                const members = await ctx.db
                    .query("teamMembers")
                    .withIndex("by_team", (q) => q.eq("teamId", m.teamId))
                    .collect();

                return {
                    ...team,
                    memberCount: members.length,
                    userRole: m.role,
                };
            })
        );

        return teams.filter((t) => t !== null);
    },
});

/**
 * Récupère une équipe par ID avec ses membres
 */
export const getById = query({
    args: { teamId: v.id("teams") },
    handler: async (ctx, args) => {
        const team = await ctx.db.get(args.teamId);
        if (!team) return null;

        // Récupère les membres avec leurs infos
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        const members = await Promise.all(
            memberships.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return {
                    ...m,
                    user: user ? {
                        _id: user._id,
                        username: user.username,
                        avatarUrl: user.avatarUrl,
                    } : null,
                };
            })
        );

        // Récupère le capitaine
        const captain = await ctx.db.get(team.captainId);

        return {
            ...team,
            members,
            captain: captain ? {
                _id: captain._id,
                username: captain.username,
                avatarUrl: captain.avatarUrl,
            } : null,
        };
    },
});

/**
 * Liste les invitations d'équipe pour un utilisateur
 */
export const listInvitations = query({
    args: {
        userId: v.id("users"),
        status: v.optional(v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("declined")
        )),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("teamInvitations")
            .withIndex("by_invitee", (q) => q.eq("inviteeId", args.userId));

        if (args.status) {
            query = ctx.db
                .query("teamInvitations")
                .withIndex("by_invitee_and_status", (q) =>
                    q.eq("inviteeId", args.userId).eq("status", args.status)
                );
        }

        const invitations = await query.collect();

        // Enrichit avec les infos de l'équipe et de l'inviteur
        return await Promise.all(
            invitations.map(async (inv) => {
                const team = await ctx.db.get(inv.teamId);
                const inviter = await ctx.db.get(inv.inviterId);

                return {
                    ...inv,
                    team: team ? { _id: team._id, name: team.name, tag: team.tag } : null,
                    inviter: inviter ? { _id: inviter._id, username: inviter.username } : null,
                };
            })
        );
    },
});

/**
 * Vérifie si un utilisateur est membre d'une équipe
 */
export const isMember = query({
    args: {
        teamId: v.id("teams"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const membership = await ctx.db
            .query("teamMembers")
            .withIndex("by_team_and_user", (q) =>
                q.eq("teamId", args.teamId).eq("userId", args.userId)
            )
            .first();

        return membership !== null;
    },
});

/**
 * Liste les équipes d'un tournoi
 */
export const listByTournament = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const teams = await ctx.db
            .query("teams")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        return await Promise.all(
            teams.map(async (team) => {
                const members = await ctx.db
                    .query("teamMembers")
                    .withIndex("by_team", (q) => q.eq("teamId", team._id))
                    .collect();

                return {
                    ...team,
                    memberCount: members.length,
                };
            })
        );
    },
});

/**
 * Récupère les membres d'une équipe (pour MyTeam.jsx)
 */
export const getMembers = query({
    args: { teamId: v.id("teams") },
    handler: async (ctx, args) => {
        const memberships = await ctx.db
            .query("teamMembers")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        return await Promise.all(
            memberships.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return {
                    ...m,
                    user: user ? {
                        _id: user._id,
                        username: user.username,
                        avatarUrl: user.avatarUrl,
                        email: user.email,
                    } : null,
                };
            })
        );
    },
});

/**
 * Récupère les invitations en attente d'une équipe
 */
export const getPendingInvitations = query({
    args: { teamId: v.id("teams") },
    handler: async (ctx, args) => {
        const invitations = await ctx.db
            .query("teamInvitations")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        return await Promise.all(
            invitations.map(async (inv) => {
                const invitee = await ctx.db.get(inv.inviteeId);
                const inviter = await ctx.db.get(inv.inviterId);
                return {
                    ...inv,
                    invitee: invitee ? {
                        _id: invitee._id,
                        username: invitee.username,
                        avatarUrl: invitee.avatarUrl,
                    } : null,
                    inviter: inviter ? {
                        _id: inviter._id,
                        username: inviter.username,
                    } : null,
                };
            })
        );
    },
});
