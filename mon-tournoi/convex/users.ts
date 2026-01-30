/**
 * QUERIES POUR LES UTILISATEURS
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Récupère l'utilisateur actuellement connecté
 */
export const getCurrent = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        // Cherche l'utilisateur dans la DB par email
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .first();

        return user;
    },
});

/**
 * Récupère un utilisateur par ID
 */
export const getById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);

        if (!user) {
            return null;
        }

        // Récupère les stats
        const stats = await ctx.db
            .query("userStats")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        return {
            ...user,
            stats: stats || null,
        };
    },
});

/**
 * Récupère un utilisateur par username
 */
export const getByUsername = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        return user;
    },
});

/**
 * Recherche d'utilisateurs par username (pour invitations)
 */
export const search = query({
    args: {
        query: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const users = await ctx.db
            .query("users")
            .collect();

        const searchQuery = args.query.toLowerCase();
        const filtered = users.filter(u =>
            u.username.toLowerCase().includes(searchQuery) ||
            u.email.toLowerCase().includes(searchQuery)
        );

        return filtered.slice(0, args.limit ?? 20);
    },
});

/**
 * Récupère les statistiques d'un utilisateur
 */
export const getStats = query({
    args: { userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        // Si pas d'ID fourni, utiliser l'utilisateur connecté
        let userId = args.userId;

        if (!userId) {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) return null;

            const user = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", identity.email!))
                .first();

            if (!user) return null;
            userId = user._id;
        }

        // Récupérer les stats de base
        const stats = await ctx.db
            .query("userStats")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        // Récupérer les équipes de l'utilisateur
        const teamMembers = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const teamIds = teamMembers.map(tm => tm.teamId);

        // Compter les matchs joués par ces équipes
        let totalMatches = 0;
        let wins = 0;
        let losses = 0;
        let draws = 0;

        for (const teamId of teamIds) {
            const matchesAsTeam1 = await ctx.db
                .query("matches")
                .withIndex("by_team1", (q) => q.eq("team1Id", teamId))
                .filter((q) => q.eq(q.field("status"), "completed"))
                .collect();

            const matchesAsTeam2 = await ctx.db
                .query("matches")
                .withIndex("by_team2", (q) => q.eq("team2Id", teamId))
                .filter((q) => q.eq(q.field("status"), "completed"))
                .collect();

            [...matchesAsTeam1, ...matchesAsTeam2].forEach(match => {
                totalMatches++;
                const isTeam1 = match.team1Id === teamId;
                const myScore = isTeam1 ? match.score1 : match.score2;
                const opponentScore = isTeam1 ? match.score2 : match.score1;

                if (myScore !== undefined && opponentScore !== undefined) {
                    if (myScore > opponentScore) wins++;
                    else if (myScore < opponentScore) losses++;
                    else draws++;
                }
            });
        }

        const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100) : 0;

        return {
            ...stats,
            totalMatches,
            wins,
            losses,
            draws,
            winRate: winRate.toFixed(1),
            teamsCount: teamIds.length,
        };
    },
});

/**
 * Récupère le profil public d'un utilisateur
 */
export const getPublicProfile = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);

        if (!user || user.isPrivate) {
            return null;
        }

        // Stats
        const stats = await ctx.db
            .query("userStats")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        // Équipes
        const teamMembers = await ctx.db
            .query("teamMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const teams = await Promise.all(
            teamMembers.map(async (tm) => {
                return await ctx.db.get(tm.teamId);
            })
        );

        return {
            _id: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            bannerUrl: user.bannerUrl,
            bio: user.bio,
            createdAt: user.createdAt,
            stats,
            teams: teams.filter(Boolean),
        };
    },
});

/**
 * Récupère les badges d'un utilisateur
 * Pour l'instant retourne un tableau vide, sera enrichi plus tard
 */
export const getBadges = query({
    args: { userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        // TODO: Implémenter le système de badges
        // Pour l'instant, retourner des badges par défaut basés sur les stats

        let userId = args.userId;

        if (!userId) {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) return [];

            const user = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", identity.email!))
                .first();

            if (!user) return [];
            userId = user._id;
        }

        // Récupérer les stats pour déterminer les badges
        const stats = await ctx.db
            .query("userStats")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const badges = [];

        // Badge débutant
        badges.push({
            id: 'newcomer',
            name: 'Nouveau venu',
            icon: '🌟',
            description: 'Bienvenue sur la plateforme !',
            unlockedAt: stats?.updatedAt || Date.now(),
        });

        // Badge basé sur les tournois
        if (stats?.tournamentsPlayed && stats.tournamentsPlayed >= 1) {
            badges.push({
                id: 'first_tournament',
                name: 'Premier tournoi',
                icon: '🏆',
                description: 'Participer à votre premier tournoi',
                unlockedAt: stats.updatedAt,
            });
        }

        if (stats?.tournamentsWon && stats.tournamentsWon >= 1) {
            badges.push({
                id: 'first_win',
                name: 'Première victoire',
                icon: '🥇',
                description: 'Gagner votre premier tournoi',
                unlockedAt: stats.updatedAt,
            });
        }

        // Badge basé sur le taux de victoire
        if (stats?.winRate && stats.winRate >= 60 && (stats?.matchesPlayed ?? 0) >= 10) {
            badges.push({
                id: 'high_winrate',
                name: 'Champion',
                icon: '🔥',
                description: 'Maintenir un taux de victoire de 60%+ sur 10+ matchs',
                unlockedAt: stats.updatedAt,
            });
        }

        return badges;
    },
});
