/**
 * MUTATIONS POUR LES MATCHS
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Met à jour le score d'un match
 */
export const updateScore = mutation({
    args: {
        matchId: v.id("matches"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
        winnerId: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        // Récupère le tournoi pour vérifier les permissions
        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        // Vérifie que l'utilisateur est l'organisateur
        if (tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut modifier les scores");
        }

        // Met à jour le match
        await ctx.db.patch(args.matchId, {
            scoreTeam1: args.scoreTeam1,
            scoreTeam2: args.scoreTeam2,
            winnerId: args.winnerId,
            status: args.winnerId ? "completed" : match.status,
            completedAt: args.winnerId ? Date.now() : match.completedAt,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Change le statut d'un match
 */
export const updateStatus = mutation({
    args: {
        matchId: v.id("matches"),
        status: v.union(
            v.literal("pending"),
            v.literal("ready"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("disputed")
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        await ctx.db.patch(args.matchId, {
            status: args.status,
            startedAt: args.status === "in_progress" && !match.startedAt ? Date.now() : match.startedAt,
            completedAt: args.status === "completed" && !match.completedAt ? Date.now() : match.completedAt,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Ajoute une action de veto (ban/pick de map)
 */
export const addVeto = mutation({
    args: {
        matchId: v.id("matches"),
        teamId: v.id("teams"),
        action: v.union(v.literal("ban"), v.literal("pick")),
        mapName: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        // Vérifie que l'équipe participe au match
        if (match.team1Id !== args.teamId && match.team2Id !== args.teamId) {
            throw new Error("Cette équipe ne participe pas à ce match");
        }

        // Compte les vetos existants pour déterminer l'ordre
        const existingVetos = await ctx.db
            .query("matchVeto")
            .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
            .collect();

        const vetoId = await ctx.db.insert("matchVeto", {
            matchId: args.matchId,
            teamId: args.teamId,
            action: args.action,
            mapName: args.mapName,
            order: existingVetos.length + 1,
            createdAt: Date.now(),
        });

        return vetoId;
    },
});

/**
 * Crée un game dans un match (pour BO3/BO5)
 */
export const createGame = mutation({
    args: {
        matchId: v.id("matches"),
        gameNumber: v.number(),
        mapName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const gameId = await ctx.db.insert("matchGames", {
            matchId: args.matchId,
            gameNumber: args.gameNumber,
            mapName: args.mapName,
            scoreTeam1: 0,
            scoreTeam2: 0,
            status: "pending",
        });

        return gameId;
    },
});

/**
 * Met à jour le score d'un game
 */
export const updateGameScore = mutation({
    args: {
        gameId: v.id("matchGames"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
        winnerId: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        await ctx.db.patch(args.gameId, {
            scoreTeam1: args.scoreTeam1,
            scoreTeam2: args.scoreTeam2,
            winnerId: args.winnerId,
            status: args.winnerId ? "completed" : "in_progress",
            completedAt: args.winnerId ? Date.now() : undefined,
        });

        return args.gameId;
    },
});

/**
 * Crée un match dans un tournoi
 */
export const createMatch = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        matchNumber: v.number(),
        round: v.number(),
        team1Id: v.optional(v.id("teams")),
        team2Id: v.optional(v.id("teams")),
        isLosersBracket: v.optional(v.boolean()),
        bestOf: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut créer des matchs");
        }

        const matchId = await ctx.db.insert("matches", {
            tournamentId: args.tournamentId,
            matchNumber: args.matchNumber,
            round: args.round,
            team1Id: args.team1Id,
            team2Id: args.team2Id,
            scoreTeam1: 0,
            scoreTeam2: 0,
            status: "pending",
            isLosersBracket: args.isLosersBracket ?? false,
            bestOf: args.bestOf ?? 1,
            currentGame: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return matchId;
    },
});

/**
 * Supprime tous les matchs d'un tournoi
 */
export const deleteAllByTournament = mutation({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut supprimer les matchs");
        }

        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        for (const match of matches) {
            await ctx.db.delete(match._id);
        }

        return { deletedCount: matches.length };
    },
});

/**
 * Met à jour les équipes d'un match (pour la progression)
 */
export const updateTeams = mutation({
    args: {
        matchId: v.id("matches"),
        team1Id: v.optional(v.id("teams")),
        team2Id: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const updateData: { team1Id?: typeof args.team1Id; team2Id?: typeof args.team2Id; updatedAt: number } = {
            updatedAt: Date.now(),
        };

        if (args.team1Id !== undefined) {
            updateData.team1Id = args.team1Id;
        }
        if (args.team2Id !== undefined) {
            updateData.team2Id = args.team2Id;
        }

        await ctx.db.patch(args.matchId, updateData);

        return args.matchId;
    },
});

/**
 * Batch create matches pour générer un bracket complet
 */
export const batchCreate = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        matches: v.array(v.object({
            matchNumber: v.number(),
            round: v.number(),
            team1Id: v.optional(v.id("teams")),
            team2Id: v.optional(v.id("teams")),
            isLosersBracket: v.optional(v.boolean()),
            bestOf: v.optional(v.number()),
            status: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const tournament = await ctx.db.get(args.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut créer des matchs");
        }

        const createdIds = [];
        const now = Date.now();

        for (const matchData of args.matches) {
            const matchId = await ctx.db.insert("matches", {
                tournamentId: args.tournamentId,
                matchNumber: matchData.matchNumber,
                round: matchData.round,
                team1Id: matchData.team1Id,
                team2Id: matchData.team2Id,
                scoreTeam1: 0,
                scoreTeam2: 0,
                status: (matchData.status as "pending" | "ready" | "in_progress" | "completed" | "disputed") || "pending",
                isLosersBracket: matchData.isLosersBracket ?? false,
                bestOf: matchData.bestOf ?? 1,
                currentGame: 1,
                createdAt: now,
                updatedAt: now,
            });
            createdIds.push(matchId);
        }

        return { createdCount: createdIds.length, matchIds: createdIds };
    },
});

/**
 * Met à jour le temps planifié d'un match
 */
export const updateScheduledTime = mutation({
    args: {
        matchId: v.id("matches"),
        scheduledTime: v.union(v.number(), v.null()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut planifier les matchs");
        }

        await ctx.db.patch(args.matchId, {
            scheduledTime: args.scheduledTime ?? undefined,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Gère la progression complète d'un match terminé (Single/Double Elimination)
 * Cette mutation atomique gère tous les cas de progression en une seule transaction
 */
export const handleProgression = mutation({
    args: {
        matchId: v.id("matches"),
        winnerId: v.id("teams"),
        loserId: v.optional(v.id("teams")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut modifier la progression");
        }

        // Récupérer tous les matchs du tournoi
        const allMatches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", match.tournamentId))
            .collect();

        const now = Date.now();
        let tournamentCompleted = false;

        if (tournament.format === "double_elimination") {
            // ====== DOUBLE ELIMINATION ======
            const { round, isLosersBracket } = match;

            // Déterminer si c'est un match de Grand Finals (pas de losersBracket flag, round max)
            const isGrandFinal = !isLosersBracket && 
                match.matchNumber === Math.max(...allMatches.filter(m => !m.isLosersBracket).map(m => m.matchNumber));
            const isResetMatch = allMatches.some(m => m.matchNumber > match.matchNumber && !m.isLosersBracket);

            if (isLosersBracket === false && !isGrandFinal) {
                // WINNERS BRACKET - Avance le gagnant + envoie le perdant en Losers
                const winnerBracketMatches = allMatches
                    .filter(m => !m.isLosersBracket && m.round === round)
                    .sort((a, b) => a.matchNumber - b.matchNumber);
                const myIndex = winnerBracketMatches.findIndex(m => m._id === match._id);

                // Avancer le gagnant dans Winners
                const nextWinMatches = allMatches
                    .filter(m => !m.isLosersBracket && m.round === round + 1)
                    .sort((a, b) => a.matchNumber - b.matchNumber);

                if (nextWinMatches.length > 0) {
                    const nextM = nextWinMatches[Math.floor(myIndex / 2)];
                    if (nextM) {
                        const updateField = (myIndex % 2) === 0 ? { team1Id: args.winnerId } : { team2Id: args.winnerId };
                        await ctx.db.patch(nextM._id, { ...updateField, updatedAt: now });
                    }
                }

                // Envoyer le perdant en Losers (s'il y en a un)
                if (args.loserId) {
                    let targetLoserMatches = [];
                    if (round === 1) {
                        targetLoserMatches = allMatches
                            .filter(m => m.isLosersBracket && m.round === 1)
                            .sort((a, b) => a.matchNumber - b.matchNumber);
                    } else {
                        targetLoserMatches = allMatches
                            .filter(m => m.isLosersBracket && m.round === round)
                            .sort((a, b) => a.matchNumber - b.matchNumber);
                    }

                    // Trouver le premier slot vide
                    for (const m of targetLoserMatches) {
                        if (!m.team1Id) {
                            await ctx.db.patch(m._id, { team1Id: args.loserId, updatedAt: now });
                            break;
                        } else if (!m.team2Id) {
                            await ctx.db.patch(m._id, { team2Id: args.loserId, updatedAt: now });
                            break;
                        }
                    }
                }
            } else if (isLosersBracket) {
                // LOSERS BRACKET - Avance le gagnant vers le prochain Losers match ou Grand Finals
                const nextLosMatches = allMatches
                    .filter(m => m.isLosersBracket && m.round === round + 1)
                    .sort((a, b) => a.matchNumber - b.matchNumber);

                if (nextLosMatches.length > 0) {
                    const avail = nextLosMatches.find(m => !m.team1Id || !m.team2Id);
                    if (avail) {
                        const updateField = !avail.team1Id ? { team1Id: args.winnerId } : { team2Id: args.winnerId };
                        await ctx.db.patch(avail._id, { ...updateField, updatedAt: now });
                    }
                } else {
                    // Vers Grand Finals (position 2)
                    const gf = allMatches.find(m => !m.isLosersBracket && 
                        m.round === Math.max(...allMatches.filter(mm => !mm.isLosersBracket).map(mm => mm.round)));
                    if (gf) {
                        await ctx.db.patch(gf._id, { team2Id: args.winnerId, updatedAt: now });
                    }
                }
            } else if (isGrandFinal) {
                // GRAND FINALS
                if (args.winnerId === match.team1Id) {
                    // Winner bracket champ gagne - Tournoi terminé
                    tournamentCompleted = true;
                } else {
                    // Reset nécessaire
                    const resetM = allMatches.find(m => m.matchNumber > match.matchNumber);
                    if (resetM) {
                        await ctx.db.patch(resetM._id, {
                            team1Id: match.team1Id,
                            team2Id: match.team2Id,
                            status: "pending",
                            scoreTeam1: 0,
                            scoreTeam2: 0,
                            updatedAt: now,
                        });
                    } else {
                        tournamentCompleted = true;
                    }
                }
            } else if (isResetMatch) {
                // Reset match terminé - Tournoi complété
                tournamentCompleted = true;
            }
        } else if (tournament.format === "elimination") {
            // ====== SINGLE ELIMINATION ======
            const currentRoundMatches = allMatches
                .filter(m => m.round === match.round)
                .sort((a, b) => a.matchNumber - b.matchNumber);
            const myIndex = currentRoundMatches.findIndex(m => m._id === match._id);

            const nextRoundMatches = allMatches
                .filter(m => m.round === match.round + 1)
                .sort((a, b) => a.matchNumber - b.matchNumber);
            const nextMatch = nextRoundMatches[Math.floor(myIndex / 2)];

            if (nextMatch) {
                const updateField = (myIndex % 2) === 0 ? { team1Id: args.winnerId } : { team2Id: args.winnerId };
                await ctx.db.patch(nextMatch._id, { ...updateField, updatedAt: now });
            } else {
                // Pas de match suivant = finale = tournoi terminé
                tournamentCompleted = true;
            }
        }

        // Marquer le tournoi comme terminé si nécessaire
        if (tournamentCompleted) {
            await ctx.db.patch(tournament._id, {
                status: "completed",
                updatedAt: now,
            });
        }

        return { 
            matchId: args.matchId, 
            tournamentCompleted,
        };
    },
});

/**
 * Résout un conflit de score (Admin)
 * Met à jour les scores et confirme le match
 */
export const resolveScoreConflict = mutation({
    args: {
        matchId: v.id("matches"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut résoudre les conflits");
        }

        await ctx.db.patch(args.matchId, {
            scoreTeam1: args.scoreTeam1,
            scoreTeam2: args.scoreTeam2,
            scoreStatus: "confirmed",
            status: "completed",
            scoreTeam1Reported: args.scoreTeam1,
            scoreTeam2Reported: args.scoreTeam2,
            reportedByTeam1: true,
            reportedByTeam2: true,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Réinitialise un match (Admin)
 * Efface les scores et remet le match en attente
 */
export const resetMatch = mutation({
    args: {
        matchId: v.id("matches"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut réinitialiser les matchs");
        }

        await ctx.db.patch(args.matchId, {
            scoreTeam1: 0,
            scoreTeam2: 0,
            scoreStatus: "pending",
            status: "pending",
            scoreTeam1Reported: undefined,
            scoreTeam2Reported: undefined,
            reportedByTeam1: false,
            reportedByTeam2: false,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});

/**
 * Modifie le score d'un match (Admin)
 */
export const adminEditScore = mutation({
    args: {
        matchId: v.id("matches"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            throw new Error("Match non trouvé");
        }

        const tournament = await ctx.db.get(match.tournamentId);
        if (!tournament) {
            throw new Error("Tournoi non trouvé");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
            .first();

        if (!user || tournament.organizerId !== user._id) {
            throw new Error("Seul l'organisateur peut modifier les scores");
        }

        await ctx.db.patch(args.matchId, {
            scoreTeam1: args.scoreTeam1,
            scoreTeam2: args.scoreTeam2,
            scoreStatus: "confirmed",
            status: "completed",
            scoreTeam1Reported: args.scoreTeam1,
            scoreTeam2Reported: args.scoreTeam2,
            reportedByTeam1: true,
            reportedByTeam2: true,
            updatedAt: Date.now(),
        });

        return args.matchId;
    },
});
