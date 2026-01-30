/**
 * QUERIES ET MUTATIONS POUR LE CHAT DE MATCH
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste les messages d'un match
 */
export const listByMatch = query({
    args: {
        matchId: v.id("matches"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("matchChat")
            .withIndex("by_match_and_time", (q) => q.eq("matchId", args.matchId))
            .order("desc")
            .take(args.limit ?? 100);

        // Enrichit avec les infos utilisateur
        const enrichedMessages = await Promise.all(
            messages.map(async (msg) => {
                const user = await ctx.db.get(msg.userId);
                return {
                    ...msg,
                    user: user ? {
                        _id: user._id,
                        username: user.username,
                        avatarUrl: user.avatarUrl,
                    } : null,
                };
            })
        );

        return enrichedMessages.reverse(); // Ordre chronologique
    },
});

/**
 * Envoie un message dans le chat d'un match
 */
export const send = mutation({
    args: {
        matchId: v.id("matches"),
        message: v.string(),
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

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        // Validation du message
        if (args.message.trim().length === 0) {
            throw new Error("Le message ne peut pas être vide");
        }

        if (args.message.length > 500) {
            throw new Error("Le message est trop long (max 500 caractères)");
        }

        // Crée le message
        const messageId = await ctx.db.insert("matchChat", {
            matchId: args.matchId,
            userId: user._id,
            message: args.message.trim(),
            createdAt: Date.now(),
        });

        return messageId;
    },
});
