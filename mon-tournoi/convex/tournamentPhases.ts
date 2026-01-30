/**
 * QUERIES ET MUTATIONS POUR LES PHASES DE TOURNOI
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Liste les phases d'un tournoi
 */
export const listByTournament = query({
    args: { tournamentId: v.id("tournaments") },
    handler: async (ctx, args) => {
        const phases = await ctx.db
            .query("tournamentPhases")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Trier par numéro de phase
        return phases.sort((a, b) => a.phaseNumber - b.phaseNumber);
    },
});

/**
 * Récupère une phase par ID
 */
export const getById = query({
    args: { phaseId: v.id("tournamentPhases") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.phaseId);
    },
});

/**
 * Crée une nouvelle phase
 */
export const create = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        name: v.string(),
        phaseNumber: v.number(),
        format: v.union(
            v.literal("elimination"),
            v.literal("double_elimination"),
            v.literal("swiss"),
            v.literal("round_robin"),
            v.literal("gauntlet")
        ),
        settings: v.optional(v.object({
            maxTeams: v.optional(v.number()),
            bestOf: v.optional(v.number()),
            swissRounds: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const phaseId = await ctx.db.insert("tournamentPhases", {
            tournamentId: args.tournamentId,
            name: args.name,
            phaseNumber: args.phaseNumber,
            format: args.format,
            status: "pending",
            settings: args.settings,
            createdAt: Date.now(),
        });

        return phaseId;
    },
});

/**
 * Met à jour une phase
 */
export const update = mutation({
    args: {
        phaseId: v.id("tournamentPhases"),
        name: v.optional(v.string()),
        format: v.optional(v.union(
            v.literal("elimination"),
            v.literal("double_elimination"),
            v.literal("swiss"),
            v.literal("round_robin"),
            v.literal("gauntlet")
        )),
        status: v.optional(v.union(
            v.literal("pending"),
            v.literal("ongoing"),
            v.literal("completed")
        )),
        settings: v.optional(v.object({
            maxTeams: v.optional(v.number()),
            bestOf: v.optional(v.number()),
            swissRounds: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const { phaseId, ...updates } = args;

        // Filtre les valeurs undefined
        const cleanUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                cleanUpdates[key] = value;
            }
        }

        await ctx.db.patch(phaseId, cleanUpdates);
        return { success: true };
    },
});

/**
 * Supprime une phase
 */
export const remove = mutation({
    args: { phaseId: v.id("tournamentPhases") },
    handler: async (ctx, args) => {
        // Supprimer aussi les matchs de cette phase
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
            .collect();

        for (const match of matches) {
            await ctx.db.delete(match._id);
        }

        await ctx.db.delete(args.phaseId);
        return { success: true };
    },
});

/**
 * Réordonne les phases d'un tournoi
 */
export const reorder = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        phaseIds: v.array(v.id("tournamentPhases")),
    },
    handler: async (ctx, args) => {
        for (let i = 0; i < args.phaseIds.length; i++) {
            await ctx.db.patch(args.phaseIds[i], {
                phaseNumber: i + 1,
            });
        }
        return { success: true };
    },
});

// ============================================
// BRACKET SLOTS QUERIES
// ============================================

/**
 * Liste les slots d'une phase
 */
export const getBracketSlots = query({
    args: { phaseId: v.id("tournamentPhases") },
    handler: async (ctx, args) => {
        const slots = await ctx.db
            .query("bracketSlots")
            .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
            .collect();

        // Enrichir avec les infos d'équipe
        return await Promise.all(
            slots.map(async (slot) => {
                if (slot.teamId) {
                    const team = await ctx.db.get(slot.teamId);
                    return { ...slot, team };
                }
                return { ...slot, team: null };
            })
        );
    },
});

// ============================================
// BRACKET SLOTS MUTATIONS
// ============================================

/**
 * Place une équipe dans un slot
 */
export const placeBracketSlot = mutation({
    args: {
        phaseId: v.id("tournamentPhases"),
        slotNumber: v.number(),
        teamId: v.optional(v.id("teams")),
        participantId: v.optional(v.id("tournamentRegistrations")),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        
        // Chercher si un slot existe déjà
        const existing = await ctx.db
            .query("bracketSlots")
            .withIndex("by_phase_and_slot", (q) => 
                q.eq("phaseId", args.phaseId).eq("slotNumber", args.slotNumber)
            )
            .first();

        if (existing) {
            // Mettre à jour
            await ctx.db.patch(existing._id, {
                teamId: args.teamId,
                participantId: args.participantId,
                updatedAt: now,
            });
            return existing._id;
        } else {
            // Créer
            return await ctx.db.insert("bracketSlots", {
                phaseId: args.phaseId,
                slotNumber: args.slotNumber,
                teamId: args.teamId,
                participantId: args.participantId,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

/**
 * Retire une équipe d'un slot
 */
export const clearBracketSlot = mutation({
    args: {
        phaseId: v.id("tournamentPhases"),
        slotNumber: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("bracketSlots")
            .withIndex("by_phase_and_slot", (q) => 
                q.eq("phaseId", args.phaseId).eq("slotNumber", args.slotNumber)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                teamId: undefined,
                participantId: undefined,
                updatedAt: Date.now(),
            });
        }
        return { success: true };
    },
});

/**
 * Réinitialise tous les slots d'une phase
 */
export const resetBracketSlots = mutation({
    args: { phaseId: v.id("tournamentPhases") },
    handler: async (ctx, args) => {
        const slots = await ctx.db
            .query("bracketSlots")
            .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
            .collect();

        for (const slot of slots) {
            await ctx.db.delete(slot._id);
        }
        return { success: true };
    },
});

/**
 * Placement automatique selon seeding
 */
export const autoPlaceBracketSlots = mutation({
    args: { 
        phaseId: v.id("tournamentPhases"),
        placements: v.array(v.object({
            slotNumber: v.number(),
            teamId: v.optional(v.id("teams")),
            participantId: v.optional(v.id("tournamentRegistrations")),
        })),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        
        // Supprimer les slots existants
        const existingSlots = await ctx.db
            .query("bracketSlots")
            .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
            .collect();

        for (const slot of existingSlots) {
            await ctx.db.delete(slot._id);
        }

        // Créer les nouveaux slots
        for (const placement of args.placements) {
            await ctx.db.insert("bracketSlots", {
                phaseId: args.phaseId,
                slotNumber: placement.slotNumber,
                teamId: placement.teamId,
                participantId: placement.participantId,
                createdAt: now,
                updatedAt: now,
            });
        }

        return { success: true };
    },
});
