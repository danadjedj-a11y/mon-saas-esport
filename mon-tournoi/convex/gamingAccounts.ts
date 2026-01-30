import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * GAMING ACCOUNTS - Gestion des demandes de changement de compte gaming
 * Table: gamingAccountChangeRequests
 */

// ============================================
// QUERIES
// ============================================

/**
 * Compter les demandes de changement en attente
 */
export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("gamingAccountChangeRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pending.length;
  },
});

/**
 * Lister toutes les demandes en attente
 */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("gamingAccountChangeRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    // Enrichir avec les données utilisateur
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const user = await ctx.db.get(req.userId);
        return {
          ...req,
          user: user ? {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
          } : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Lister les demandes d'un utilisateur
 */
export const listByUser = query({
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
 * Récupérer une demande par ID
 */
export const getById = query({
  args: { requestId: v.id("gamingAccountChangeRequests") },
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId);
    if (!request) return null;

    const user = await ctx.db.get(request.userId);
    return {
      ...request,
      user: user ? {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      } : null,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Créer une demande de changement de compte gaming
 */
export const create = mutation({
  args: {
    platform: v.string(),
    oldUsername: v.string(),
    oldTag: v.optional(v.string()),
    newUsername: v.string(),
    newTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) throw new Error("Non authentifié");

    // Récupérer l'utilisateur Convex par email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("Utilisateur non trouvé");

    // Vérifier s'il y a déjà une demande pending pour cette plateforme
    const existingPending = await ctx.db
      .query("gamingAccountChangeRequests")
      .withIndex("by_user_and_platform", (q) => 
        q.eq("userId", user._id).eq("platform", args.platform)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingPending) {
      throw new Error("Une demande est déjà en attente pour cette plateforme");
    }

    const now = Date.now();
    return await ctx.db.insert("gamingAccountChangeRequests", {
      userId: user._id,
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
export const approve = mutation({
  args: {
    requestId: v.id("gamingAccountChangeRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, adminNotes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) throw new Error("Non authentifié");

    // Vérifier que c'est un admin/organizer
    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!admin || admin.role !== "organizer") {
      throw new Error("Accès non autorisé");
    }

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Demande non trouvée");
    if (request.status !== "pending") throw new Error("Demande déjà traitée");

    // Mettre à jour le compte gaming dans le profil utilisateur
    const user = await ctx.db.get(request.userId);
    if (user) {
      const currentGamingAccounts = user.gamingAccounts || {};
      
      // Construire la nouvelle valeur selon la plateforme
      let newAccountValue = request.newUsername;
      if (request.newTag) {
        newAccountValue = `${request.newUsername}#${request.newTag}`;
      }

      // Mapper la plateforme au champ correspondant
      const platformMap: Record<string, string> = {
        "Riot": "riotId",
        "Valorant": "riotId",
        "League of Legends": "riotId",
        "Steam": "steamId",
        "CS2": "steamId",
        "Epic Games": "epicGamesId",
        "Fortnite": "epicGamesId",
        "Battle.net": "battleNetId",
        "Overwatch": "battleNetId",
      };

      const fieldName = platformMap[request.platform] || request.platform.toLowerCase() + "Id";

      await ctx.db.patch(request.userId, {
        gamingAccounts: {
          ...currentGamingAccounts,
          [fieldName]: newAccountValue,
        },
        updatedAt: Date.now(),
      });
    }

    // Marquer la demande comme approuvée
    await ctx.db.patch(requestId, {
      status: "approved",
      adminId: admin._id,
      adminNotes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Rejeter une demande de changement
 */
export const reject = mutation({
  args: {
    requestId: v.id("gamingAccountChangeRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, adminNotes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) throw new Error("Non authentifié");

    // Vérifier que c'est un admin/organizer
    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!admin || admin.role !== "organizer") {
      throw new Error("Accès non autorisé");
    }

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Demande non trouvée");
    if (request.status !== "pending") throw new Error("Demande déjà traitée");

    // Marquer la demande comme rejetée
    await ctx.db.patch(requestId, {
      status: "rejected",
      adminId: admin._id,
      adminNotes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Annuler sa propre demande (utilisateur)
 */
export const cancel = mutation({
  args: {
    requestId: v.id("gamingAccountChangeRequests"),
  },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) throw new Error("Non authentifié");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("Utilisateur non trouvé");

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Demande non trouvée");
    if (request.userId !== user._id) throw new Error("Accès non autorisé");
    if (request.status !== "pending") throw new Error("Demande déjà traitée");

    // Supprimer la demande
    await ctx.db.delete(requestId);

    return { success: true };
  },
});
