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
            v.literal("tournament_start")
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
