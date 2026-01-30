/**
 * QUERIES ET MUTATIONS POUR LES BADGES, NIVEAUX ET RATINGS
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// USER BADGES
// ============================================

/**
 * Récupère les badges d'un utilisateur
 */
export const getUserBadges = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const badges = await ctx.db
            .query("userBadges")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        return badges;
    },
});

/**
 * Attribue un badge à un utilisateur
 */
export const awardBadge = mutation({
    args: {
        userId: v.id("users"),
        badgeId: v.string(),
        name: v.string(),
        icon: v.string(),
        description: v.string(),
        rarity: v.optional(v.union(
            v.literal("common"),
            v.literal("rare"),
            v.literal("epic"),
            v.literal("legendary")
        )),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Vérifie si le badge existe déjà
        const existing = await ctx.db
            .query("userBadges")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
            .first();

        if (existing) {
            return { success: false, message: "Badge already owned" };
        }

        await ctx.db.insert("userBadges", {
            userId: args.userId,
            badgeId: args.badgeId,
            name: args.name,
            icon: args.icon,
            description: args.description,
            rarity: args.rarity,
            category: args.category,
            earnedAt: Date.now(),
        });

        return { success: true };
    },
});

// ============================================
// USER LEVELS
// ============================================

/**
 * Récupère le niveau d'un utilisateur
 */
export const getUserLevel = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const level = await ctx.db
            .query("userLevels")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        return level || { level: 1, xp: 0, totalXp: 0 };
    },
});

/**
 * Ajoute de l'XP à un utilisateur
 */
export const addXp = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userLevels")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            const newXp = existing.xp + args.amount;
            const newTotalXp = existing.totalXp + args.amount;
            
            // Calcul du niveau (simple: 100 XP par niveau)
            const xpPerLevel = 100;
            const newLevel = Math.floor(newTotalXp / xpPerLevel) + 1;

            await ctx.db.patch(existing._id, {
                xp: newXp % xpPerLevel,
                totalXp: newTotalXp,
                level: newLevel,
                updatedAt: Date.now(),
            });

            return { level: newLevel, xp: newXp % xpPerLevel, totalXp: newTotalXp };
        } else {
            const level = Math.floor(args.amount / 100) + 1;
            await ctx.db.insert("userLevels", {
                userId: args.userId,
                level: level,
                xp: args.amount % 100,
                totalXp: args.amount,
                updatedAt: Date.now(),
            });

            return { level, xp: args.amount % 100, totalXp: args.amount };
        }
    },
});

// ============================================
// TOURNAMENT RATINGS
// ============================================

/**
 * Récupère la note moyenne d'un tournoi
 */
export const getTournamentRating = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const ratings = await ctx.db
            .query("tournamentRatings")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        if (ratings.length === 0) {
            return { averageRating: 0, totalRatings: 0 };
        }

        const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / ratings.length;

        return {
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings: ratings.length,
        };
    },
});

/**
 * Récupère la note d'un utilisateur pour un tournoi
 */
export const getUserTournamentRating = query({
    args: {
        tournamentId: v.id("tournaments"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const rating = await ctx.db
            .query("tournamentRatings")
            .withIndex("by_tournament_and_user", (q) =>
                q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
            )
            .first();

        return rating;
    },
});

/**
 * Note un tournoi (crée ou met à jour)
 */
export const rateTournament = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        userId: v.id("users"),
        rating: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Validation
        if (args.rating < 1 || args.rating > 5) {
            throw new Error("Rating must be between 1 and 5");
        }

        // Vérifie si l'utilisateur a déjà noté
        const existing = await ctx.db
            .query("tournamentRatings")
            .withIndex("by_tournament_and_user", (q) =>
                q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                rating: args.rating,
                comment: args.comment,
            });
            return { action: "updated" };
        } else {
            await ctx.db.insert("tournamentRatings", {
                tournamentId: args.tournamentId,
                userId: args.userId,
                rating: args.rating,
                comment: args.comment,
                createdAt: Date.now(),
            });
            return { action: "created" };
        }
    },
});
