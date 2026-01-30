import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Match Veto System - Ban/Pick de maps pour les matchs
 */

// Récupérer l'état du veto pour un match
export const getByMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matchVeto")
      .withIndex("by_match_and_step", (q) => q.eq("matchId", args.matchId))
      .collect();
  },
});

// Ajouter une action de veto (ban ou pick)
export const addAction = mutation({
  args: {
    matchId: v.id("matches"),
    teamId: v.id("teams"),
    mapName: v.string(),
    actionType: v.union(v.literal("ban"), v.literal("pick")),
    step: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("matchVeto", {
      matchId: args.matchId,
      teamId: args.teamId,
      mapName: args.mapName,
      actionType: args.actionType,
      step: args.step,
      createdAt: Date.now(),
    });
  },
});

// Réinitialiser le veto d'un match
export const resetVeto = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query("matchVeto")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const action of actions) {
      await ctx.db.delete(action._id);
    }

    return { deleted: actions.length };
  },
});
