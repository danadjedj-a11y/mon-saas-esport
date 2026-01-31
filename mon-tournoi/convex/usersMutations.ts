/**
 * MUTATIONS POUR LES UTILISATEURS
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Crée ou met à jour un utilisateur lors de la connexion
 * Appelé automatiquement par Clerk
 */
export const upsert = mutation({
    args: {
        email: v.string(),
        username: v.string(),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Non authentifié");
        }

        // Vérifie si l'utilisateur existe déjà
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existingUser) {
            // Met à jour l'utilisateur existant
            await ctx.db.patch(existingUser._id, {
                username: args.username,
                avatarUrl: args.avatarUrl,
                updatedAt: Date.now(),
            });
            return existingUser._id;
        }

        // Crée un nouvel utilisateur
        const now = Date.now();
        const userId = await ctx.db.insert("users", {
            email: args.email,
            username: args.username,
            role: "player", // Par défaut, tous les nouveaux users sont players
            avatarUrl: args.avatarUrl,
            createdAt: now,
            updatedAt: now,
        });

        // Crée les stats initiales
        await ctx.db.insert("userStats", {
            userId,
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            winRate: 0,
            eloRating: 1000, // ELO de départ
            updatedAt: now,
        });

        return userId;
    },
});

/**
 * Met à jour le profil utilisateur
 */
export const updateProfile = mutation({
    args: {
        username: v.optional(v.string()),
        bio: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        gamingAccounts: v.optional(v.object({
            discordId: v.optional(v.string()),
            riotId: v.optional(v.string()),
            steamId: v.optional(v.string()),
            epicGamesId: v.optional(v.string()),
            battleNetId: v.optional(v.string()),
            // Valorant et LoL data stockés en JSON string
            valorantDataJson: v.optional(v.string()),
            lolDataJson: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Vérifie que le username n'est pas déjà pris
        if (args.username && args.username !== user.username) {
            const existingUsername = await ctx.db
                .query("users")
                .withIndex("by_username", (q) => q.eq("username", args.username))
                .first();

            if (existingUsername) {
                throw new Error("Ce nom d'utilisateur est déjà pris");
            }
        }

        await ctx.db.patch(user._id, {
            ...(args.username && { username: args.username }),
            ...(args.bio !== undefined && { bio: args.bio }),
            ...(args.avatarUrl !== undefined && { avatarUrl: args.avatarUrl }),
            ...(args.gamingAccounts && { gamingAccounts: args.gamingAccounts }),
            updatedAt: Date.now(),
        });

        return user._id;
    },
});

/**
 * Change le rôle d'un utilisateur (admin only)
 */
export const updateRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("player"), v.literal("organizer")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Non authentifié");
        }

        // Pour l'instant, on permet à tout le monde de changer son rôle
        // Plus tard, tu peux ajouter une vérification admin
        await ctx.db.patch(args.userId, {
            role: args.role,
            updatedAt: Date.now(),
        });

        return args.userId;
    },
});

/**
 * Génère une URL d'upload pour l'avatar
 */
export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }
        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Met à jour l'avatar avec un fichier uploadé via Convex Storage
 */
export const updateAvatar = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Obtenir l'URL publique du fichier
        const avatarUrl = await ctx.storage.getUrl(args.storageId);

        await ctx.db.patch(user._id, {
            avatarUrl: avatarUrl,
            updatedAt: Date.now(),
        });

        return { success: true, avatarUrl };
    },
});
