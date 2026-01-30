/**
 * MUTATIONS POUR LE SYSTÈME SUISSE
 * Gestion des scores et rounds pour le format tournoi Swiss
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Types pour les scores suisses (stockés dans un array JSON dans le tournoi)
interface SwissScore {
    teamId: string;
    wins: number;
    losses: number;
    draws: number;
    buchholzScore: number;
    opponents: string[];
}

/**
 * Initialise les scores suisses pour un tournoi
 */
export const initializeScores = mutation({
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
            throw new Error("Seul l'organisateur peut initialiser les scores");
        }

        // Récupérer toutes les inscriptions confirmées
        const registrations = await ctx.db
            .query("tournamentRegistrations")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "confirmed"),
                    q.eq(q.field("status"), "checked_in")
                )
            )
            .collect();

        // Créer les scores initiaux
        const swissScores: SwissScore[] = registrations
            .filter(r => r.teamId)
            .map(r => ({
                teamId: r.teamId as string,
                wins: 0,
                losses: 0,
                draws: 0,
                buchholzScore: 0,
                opponents: [],
            }));

        // Stocker dans les métadonnées du tournoi (on utilise un champ flexible)
        // Note: On stocke dans un document séparé pour éviter les conflits
        
        // Vérifier si un document de scores existe déjà
        const existingScores = await ctx.db
            .query("swissScores")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Supprimer les anciens scores
        for (const score of existingScores) {
            await ctx.db.delete(score._id);
        }

        // Créer les nouveaux scores
        for (const score of swissScores) {
            await ctx.db.insert("swissScores", {
                tournamentId: args.tournamentId,
                teamId: score.teamId as Id<"teams">,
                wins: score.wins,
                losses: score.losses,
                draws: score.draws,
                buchholzScore: score.buchholzScore,
                opponents: score.opponents,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        return { initialized: swissScores.length };
    },
});

/**
 * Récupère les scores suisses d'un tournoi
 */
export const getScores = query({
    args: {
        tournamentId: v.id("tournaments"),
    },
    handler: async (ctx, args) => {
        const scores = await ctx.db
            .query("swissScores")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Trier par wins desc, puis buchholz desc
        return scores.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.buchholzScore - a.buchholzScore;
        });
    },
});

/**
 * Met à jour les scores après un match Swiss
 */
export const updateScoresAfterMatch = mutation({
    args: {
        tournamentId: v.id("tournaments"),
        team1Id: v.id("teams"),
        team2Id: v.id("teams"),
        scoreTeam1: v.number(),
        scoreTeam2: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Non authentifié");
        }

        // Récupérer les scores des deux équipes
        const team1Score = await ctx.db
            .query("swissScores")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("teamId"), args.team1Id))
            .first();

        const team2Score = await ctx.db
            .query("swissScores")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .filter((q) => q.eq(q.field("teamId"), args.team2Id))
            .first();

        if (!team1Score || !team2Score) {
            throw new Error("Scores Swiss non trouvés pour une ou les deux équipes");
        }

        const now = Date.now();

        // Mettre à jour les stats selon le résultat
        if (args.scoreTeam1 > args.scoreTeam2) {
            await ctx.db.patch(team1Score._id, {
                wins: team1Score.wins + 1,
                opponents: [...team1Score.opponents, args.team2Id as string],
                updatedAt: now,
            });
            await ctx.db.patch(team2Score._id, {
                losses: team2Score.losses + 1,
                opponents: [...team2Score.opponents, args.team1Id as string],
                updatedAt: now,
            });
        } else if (args.scoreTeam2 > args.scoreTeam1) {
            await ctx.db.patch(team1Score._id, {
                losses: team1Score.losses + 1,
                opponents: [...team1Score.opponents, args.team2Id as string],
                updatedAt: now,
            });
            await ctx.db.patch(team2Score._id, {
                wins: team2Score.wins + 1,
                opponents: [...team2Score.opponents, args.team1Id as string],
                updatedAt: now,
            });
        } else {
            // Match nul
            await ctx.db.patch(team1Score._id, {
                draws: team1Score.draws + 1,
                opponents: [...team1Score.opponents, args.team2Id as string],
                updatedAt: now,
            });
            await ctx.db.patch(team2Score._id, {
                draws: team2Score.draws + 1,
                opponents: [...team2Score.opponents, args.team1Id as string],
                updatedAt: now,
            });
        }

        // Recalculer les scores Buchholz pour tout le monde
        await recalculateBuchholz(ctx, args.tournamentId);

        return { success: true };
    },
});

/**
 * Génère le prochain round Swiss
 */
export const generateNextRound = mutation({
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
            throw new Error("Seul l'organisateur peut générer le prochain round");
        }

        // Récupérer tous les matchs du tournoi
        const allMatches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        // Trouver le dernier round
        const maxRound = allMatches.length > 0
            ? Math.max(...allMatches.map(m => m.round))
            : 0;

        // Vérifier que tous les matchs du dernier round sont terminés
        const lastRoundMatches = allMatches.filter(m => m.round === maxRound);
        const allCompleted = lastRoundMatches.length === 0 || lastRoundMatches.every(m => m.status === "completed");

        if (!allCompleted) {
            throw new Error("Tous les matchs du round actuel doivent être terminés");
        }

        // Récupérer les scores suisses
        const swissScores = await ctx.db
            .query("swissScores")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
            .collect();

        if (swissScores.length === 0) {
            throw new Error("Scores Swiss non initialisés. Appelez initializeScores d'abord.");
        }

        // Calculer le nombre total de rounds nécessaires
        const numTeams = swissScores.length;
        const totalRounds = Math.ceil(Math.log2(numTeams));

        if (maxRound >= totalRounds) {
            // Tournoi terminé
            await ctx.db.patch(tournament._id, {
                status: "completed",
                updatedAt: Date.now(),
            });
            return { completed: true, message: "Tournoi Swiss terminé !" };
        }

        // Générer les paires pour le prochain round (algorithme Swiss)
        const pairs = swissPairing(swissScores, allMatches);

        if (pairs.length === 0) {
            throw new Error("Impossible de générer des paires. Vérifiez les scores.");
        }

        // Créer les matchs
        const nextRound = maxRound + 1;
        let matchNum = allMatches.length > 0
            ? Math.max(...allMatches.map(m => m.matchNumber)) + 1
            : 1;

        const now = Date.now();

        for (const [team1Id, team2Id] of pairs) {
            await ctx.db.insert("matches", {
                tournamentId: args.tournamentId,
                matchNumber: matchNum++,
                round: nextRound,
                team1Id: team1Id as Id<"teams">,
                team2Id: team2Id as Id<"teams">,
                scoreTeam1: 0,
                scoreTeam2: 0,
                status: "pending",
                isLosersBracket: false,
                bestOf: 1,
                currentGame: 1,
                createdAt: now,
                updatedAt: now,
            });
        }

        return {
            completed: false,
            round: nextRound,
            matchesCreated: pairs.length,
        };
    },
});

// ============================================
// FONCTIONS UTILITAIRES (privées)
// ============================================

/**
 * Algorithme de pairing Swiss
 * Apparie les équipes par score similaire, en évitant les matchs déjà joués
 */
function swissPairing(
    swissScores: Array<{
        _id: Id<"swissScores">;
        teamId: Id<"teams">;
        wins: number;
        losses: number;
        draws: number;
        buchholzScore: number;
        opponents: string[];
    }>,
    allMatches: Array<{
        team1Id?: Id<"teams">;
        team2Id?: Id<"teams">;
    }>
): Array<[Id<"teams">, Id<"teams">]> {
    // Fonction pour calculer le score de tri
    const getScore = (s: typeof swissScores[0]) => s.wins * 1000 + s.buchholzScore;

    // Fonction pour vérifier si deux équipes ont déjà joué
    const havePlayedTogether = (t1: Id<"teams">, t2: Id<"teams">): boolean => {
        return allMatches.some(m =>
            (m.team1Id === t1 && m.team2Id === t2) ||
            (m.team1Id === t2 && m.team2Id === t1)
        );
    };

    // Trier par score
    const sorted = [...swissScores].sort((a, b) => getScore(b) - getScore(a));

    const pairs: Array<[Id<"teams">, Id<"teams">]> = [];
    const used = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
        const teamIdStr = sorted[i].teamId as string;
        if (used.has(teamIdStr)) continue;

        const team1 = sorted[i];
        let bestOpponent: typeof team1 | null = null;
        let bestScoreDiff = Infinity;

        // Chercher le meilleur adversaire
        for (let j = i + 1; j < sorted.length; j++) {
            const t2IdStr = sorted[j].teamId as string;
            if (used.has(t2IdStr)) continue;
            if (havePlayedTogether(team1.teamId, sorted[j].teamId)) continue;

            const scoreDiff = Math.abs(getScore(team1) - getScore(sorted[j]));
            if (scoreDiff < bestScoreDiff) {
                bestScoreDiff = scoreDiff;
                bestOpponent = sorted[j];
            }
        }

        if (bestOpponent) {
            pairs.push([team1.teamId, bestOpponent.teamId]);
            used.add(teamIdStr);
            used.add(bestOpponent.teamId as string);
        }
        // Si pas d'adversaire trouvé, l'équipe reçoit un BYE (pas de match)
    }

    return pairs;
}

/**
 * Recalcule les scores Buchholz pour tout le tournoi
 */
async function recalculateBuchholz(
    ctx: { db: any },
    tournamentId: Id<"tournaments">
): Promise<void> {
    const scores = await ctx.db
        .query("swissScores")
        .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
        .collect();

    // Créer une map pour accès rapide (type explicite)
    const scoresMap = new Map<string, { wins: number }>(
        scores.map((s: any) => [s.teamId as string, { wins: s.wins as number }])
    );

    // Pour chaque équipe, calculer le Buchholz (somme des wins des adversaires)
    for (const score of scores) {
        let buchholz = 0;
        for (const oppId of score.opponents) {
            const oppScore = scoresMap.get(oppId);
            if (oppScore) {
                buchholz += oppScore.wins;
            }
        }

        await ctx.db.patch(score._id, {
            buchholzScore: buchholz,
            updatedAt: Date.now(),
        });
    }
}
