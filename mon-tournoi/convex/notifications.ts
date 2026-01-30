/**
 * QUERIES ET MUTATIONS POUR LES NOTIFICATIONS
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste les notifications d'un utilisateur
 */
export const listByUser = query({
    args: {
        userId: v.id("users"),
        unreadOnly: v.optional(v.boolean()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("notifications")
            .withIndex("by_user_and_time", (q) => q.eq("userId", args.userId))
            .order("desc");

        if (args.unreadOnly) {
            query = ctx.db
                .query("notifications")
                .withIndex("by_user_and_read", (q) =>
                    q.eq("userId", args.userId).eq("read", false)
                )
                .order("desc");
        }

        return await query.take(args.limit ?? 50);
    },
});

/**
 * Compte les notifications non lues
 */
export const countUnread = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_and_read", (q) =>
                q.eq("userId", args.userId).eq("read", false)
            )
            .collect();

        return unreadNotifications.length;
    },
});

/**
 * Marque une notification comme lue
 */
export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const notification = await ctx.db.get(args.notificationId);
        if (!notification) {
            throw new Error("Notification non trouvée");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || notification.userId !== user._id) {
            throw new Error("Cette notification ne vous appartient pas");
        }

        await ctx.db.patch(args.notificationId, {
            read: true,
        });

        return { success: true };
    },
});

/**
 * Marque toutes les notifications comme lues
 */
export const markAllAsRead = mutation({
    handler: async (ctx) => {
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

        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_and_read", (q) =>
                q.eq("userId", user._id).eq("read", false)
            )
            .collect();

        for (const notification of unreadNotifications) {
            await ctx.db.patch(notification._id, { read: true });
        }

        return { count: unreadNotifications.length };
    },
});

/**
 * Crée une notification
 */
export const create = mutation({
    args: {
        userId: v.id("users"),
        type: v.union(
            v.literal("match_ready"),
            v.literal("team_invitation"),
            v.literal("tournament_update"),
            v.literal("check_in_reminder"),
            v.literal("match_result"),
            v.literal("tournament_start"),
            v.literal("match_upcoming"),
            v.literal("score_dispute"),
            v.literal("score_declared"),
            v.literal("admin_message")
        ),
        title: v.string(),
        message: v.string(),
        link: v.optional(v.string()),
        relatedTournamentId: v.optional(v.id("tournaments")),
        relatedMatchId: v.optional(v.id("matches")),
        relatedTeamId: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const notificationId = await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            title: args.title,
            message: args.message,
            link: args.link,
            relatedTournamentId: args.relatedTournamentId,
            relatedMatchId: args.relatedMatchId,
            relatedTeamId: args.relatedTeamId,
            read: false,
            createdAt: Date.now(),
        });

        return notificationId;
    },
});

/**
 * Crée des notifications pour tous les membres d'une équipe
 */
export const createForTeam = mutation({
    args: {
        teamId: v.id("teams"),
        type: v.union(
            v.literal("match_ready"),
            v.literal("team_invitation"),
            v.literal("tournament_update"),
            v.literal("check_in_reminder"),
            v.literal("match_result"),
            v.literal("tournament_start"),
            v.literal("match_upcoming"),
            v.literal("score_dispute"),
            v.literal("score_declared"),
            v.literal("admin_message")
        ),
        title: v.string(),
        message: v.string(),
        link: v.optional(v.string()),
        relatedTournamentId: v.optional(v.id("tournaments")),
        relatedMatchId: v.optional(v.id("matches")),
    },
    handler: async (ctx, args) => {
        // Get team
        const team = await ctx.db.get(args.teamId);
        if (!team) throw new Error("Équipe non trouvée");

        // Get team members
        const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
            .collect();

        // Create a set of user IDs (captain + members)
        const userIds = new Set<string>();
        userIds.add(team.captainId as string);
        members.forEach((m) => userIds.add(m.userId as string));

        // Create notifications for all users
        const created: string[] = [];
        for (const userId of userIds) {
            const notificationId = await ctx.db.insert("notifications", {
                userId: userId as any, // Cast to Id<"users">
                type: args.type,
                title: args.title,
                message: args.message,
                link: args.link,
                relatedTournamentId: args.relatedTournamentId,
                relatedMatchId: args.relatedMatchId,
                relatedTeamId: args.teamId,
                read: false,
                createdAt: Date.now(),
            });
            created.push(notificationId);
        }

        return { count: created.length };
    },
});

/**
 * Crée des notifications pour les deux équipes d'un match
 */
export const createForMatch = mutation({
    args: {
        matchId: v.id("matches"),
        type: v.union(
            v.literal("match_ready"),
            v.literal("match_result"),
            v.literal("match_upcoming"),
            v.literal("score_dispute"),
            v.literal("score_declared")
        ),
        title: v.string(),
        message: v.string(),
        link: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match non trouvé");

        const teamIds = [match.player1Id, match.player2Id].filter(Boolean);
        let totalNotifications = 0;

        for (const teamId of teamIds) {
            if (!teamId) continue;
            
            const team = await ctx.db.get(teamId);
            if (!team) continue;

            // Get team members
            const members = await ctx.db
                .query("teamMembers")
                .withIndex("by_team", (q) => q.eq("teamId", teamId))
                .collect();

            const userIds = new Set<string>();
            userIds.add(team.captainId as string);
            members.forEach((m) => userIds.add(m.userId as string));

            for (const userId of userIds) {
                await ctx.db.insert("notifications", {
                    userId: userId as any,
                    type: args.type,
                    title: args.title,
                    message: args.message,
                    link: args.link ?? `/match/${args.matchId}`,
                    relatedMatchId: args.matchId,
                    relatedTournamentId: match.tournamentId,
                    read: false,
                    createdAt: Date.now(),
                });
                totalNotifications++;
            }
        }

        return { count: totalNotifications };
    },
});
