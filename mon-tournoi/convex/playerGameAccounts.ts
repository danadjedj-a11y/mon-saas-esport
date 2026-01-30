import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * PLAYER GAME ACCOUNTS - Comptes de jeu des joueurs
 * Gestion des comptes Riot, Steam, Epic, Battle.net, etc.
 */

// ============================================
// QUERIES
// ============================================

/**
 * Récupérer tous les comptes de jeu d'un utilisateur
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("playerGameAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

/**
 * Récupérer un compte de jeu par plateforme pour un utilisateur
 */
export const getByPlatform = query({
  args: { 
    userId: v.id("users"),
    platform: v.string(),
  },
  handler: async (ctx, { userId, platform }) => {
    return await ctx.db
      .query("playerGameAccounts")
      .withIndex("by_user_and_platform", (q) => 
        q.eq("userId", userId).eq("platform", platform)
      )
      .first();
  },
});

/**
 * Vérifier si un utilisateur a un compte pour une plateforme
 */
export const hasPlatformAccount = query({
  args: { 
    userId: v.id("users"),
    platform: v.string(),
  },
  handler: async (ctx, { userId, platform }) => {
    const account = await ctx.db
      .query("playerGameAccounts")
      .withIndex("by_user_and_platform", (q) => 
        q.eq("userId", userId).eq("platform", platform)
      )
      .first();
    return account !== null;
  },
});

/**
 * Récupérer un compte par ID
 */
export const getById = query({
  args: { accountId: v.id("playerGameAccounts") },
  handler: async (ctx, { accountId }) => {
    return await ctx.db.get(accountId);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Ajouter un nouveau compte de jeu
 */
export const add = mutation({
  args: {
    userId: v.id("users"),
    platform: v.string(),
    gameUsername: v.string(),
    gameTag: v.optional(v.string()),
  },
  handler: async (ctx, { userId, platform, gameUsername, gameTag }) => {
    // Vérifier si le compte existe déjà
    const existing = await ctx.db
      .query("playerGameAccounts")
      .withIndex("by_user_and_platform", (q) => 
        q.eq("userId", userId).eq("platform", platform)
      )
      .first();

    if (existing) {
      throw new Error(`Un compte ${platform} existe déjà pour cet utilisateur`);
    }

    const now = Date.now();
    return await ctx.db.insert("playerGameAccounts", {
      userId,
      platform,
      gameUsername: gameUsername.trim(),
      gameTag: gameTag ? gameTag.trim() : undefined,
      verified: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Mettre à jour un compte de jeu
 */
export const update = mutation({
  args: {
    accountId: v.id("playerGameAccounts"),
    gameUsername: v.string(),
    gameTag: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, gameUsername, gameTag }) => {
    const existing = await ctx.db.get(accountId);
    if (!existing) {
      throw new Error("Compte de jeu non trouvé");
    }

    await ctx.db.patch(accountId, {
      gameUsername: gameUsername.trim(),
      gameTag: gameTag ? gameTag.trim() : undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(accountId);
  },
});

/**
 * Supprimer un compte de jeu
 */
export const remove = mutation({
  args: { accountId: v.id("playerGameAccounts") },
  handler: async (ctx, { accountId }) => {
    const existing = await ctx.db.get(accountId);
    if (!existing) {
      throw new Error("Compte de jeu non trouvé");
    }

    await ctx.db.delete(accountId);
    return { success: true };
  },
});

/**
 * Marquer un compte comme vérifié
 */
export const verify = mutation({
  args: { accountId: v.id("playerGameAccounts") },
  handler: async (ctx, { accountId }) => {
    const existing = await ctx.db.get(accountId);
    if (!existing) {
      throw new Error("Compte de jeu non trouvé");
    }

    await ctx.db.patch(accountId, {
      verified: true,
      verifiedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(accountId);
  },
});

/**
 * Retirer la vérification d'un compte
 */
export const unverify = mutation({
  args: { accountId: v.id("playerGameAccounts") },
  handler: async (ctx, { accountId }) => {
    const existing = await ctx.db.get(accountId);
    if (!existing) {
      throw new Error("Compte de jeu non trouvé");
    }

    await ctx.db.patch(accountId, {
      verified: false,
      verifiedAt: undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(accountId);
  },
});

// ============================================
// GAMING ACCOUNT CHANGE REQUESTS
// ============================================

/**
 * Récupérer toutes les demandes de changement en attente
 */
export const listPendingChangeRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("gamingAccountChangeRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .collect();

    // Enrichir avec les infos utilisateur
    return await Promise.all(
      requests.map(async (req) => {
        const user = await ctx.db.get(req.userId);
        return {
          ...req,
          profiles: user ? {
            username: user.username,
            avatar_url: user.avatarUrl,
          } : null,
        };
      })
    );
  },
});

/**
 * Récupérer les demandes d'un utilisateur
 */
export const listChangeRequestsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("gamingAccountChangeRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Créer une demande de changement
 */
export const createChangeRequest = mutation({
  args: {
    userId: v.id("users"),
    platform: v.string(),
    oldUsername: v.string(),
    oldTag: v.optional(v.string()),
    newUsername: v.string(),
    newTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Vérifier s'il existe déjà une demande en attente
    const existing = await ctx.db
      .query("gamingAccountChangeRequests")
      .withIndex("by_user_and_platform", (q) => 
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      throw new Error("Une demande est déjà en attente pour cette plateforme");
    }

    return await ctx.db.insert("gamingAccountChangeRequests", {
      userId: args.userId,
      platform: args.platform,
      oldUsername: args.oldUsername,
      oldTag: args.oldTag,
      newUsername: args.newUsername,
      newTag: args.newTag,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Approuver une demande de changement
 */
export const approveChangeRequest = mutation({
  args: {
    requestId: v.id("gamingAccountChangeRequests"),
    adminId: v.id("users"),
  },
  handler: async (ctx, { requestId, adminId }) => {
    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Demande non trouvée");
    }

    // Mettre à jour la demande
    await ctx.db.patch(requestId, {
      status: "approved",
      adminId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Rejeter une demande de changement
 */
export const rejectChangeRequest = mutation({
  args: {
    requestId: v.id("gamingAccountChangeRequests"),
    adminId: v.id("users"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, adminId, adminNotes }) => {
    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Demande non trouvée");
    }

    await ctx.db.patch(requestId, {
      status: "rejected",
      adminId,
      adminNotes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
