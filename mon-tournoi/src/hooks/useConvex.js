/**
 * HOOKS CONVEX PERSONNALISÉS
 * 
 * Hooks réutilisables pour l'application avec Convex
 */

import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook qui synchronise l'utilisateur Clerk avec Convex
 * et retourne l'utilisateur Convex avec son rôle
 */
export function useConvexUser() {
    const { user: clerkUser, isSignedIn, isLoaded } = useUser();
    const convexUser = useQuery(api.users.getCurrent);
    const upsertUser = useMutation(api.usersMutations.upsert);

    // Synchroniser l'utilisateur Clerk avec Convex
    useEffect(() => {
        if (isSignedIn && clerkUser && convexUser === null) {
            upsertUser({
                email: clerkUser.primaryEmailAddress?.emailAddress || "",
                username: clerkUser.username || clerkUser.firstName || "User",
                avatarUrl: clerkUser.imageUrl,
            }).catch((err) => {
                console.error("❌ Erreur sync utilisateur:", err);
            });
        }
    }, [isSignedIn, clerkUser, convexUser, upsertUser]);

    return {
        isLoaded: isLoaded && convexUser !== undefined,
        isLoading: !isLoaded || (isSignedIn && convexUser === undefined),
        isSignedIn,
        clerkUser,
        convexUser,
        role: convexUser?.role || 'player',
        isOrganizer: convexUser?.role === 'organizer',
        isPlayer: convexUser?.role === 'player',
        userId: convexUser?._id,
    };
}

/**
 * Hook pour récupérer les tournois publics
 */
export function useTournaments(limit = 50) {
    const tournaments = useQuery(api.tournaments.listPublic, { limit });

    return {
        tournaments: tournaments || [],
        isLoading: tournaments === undefined,
    };
}

/**
 * Hook pour récupérer un tournoi par ID
 */
export function useTournament(tournamentId) {
    const tournament = useQuery(
        api.tournaments.getById,
        tournamentId ? { tournamentId } : "skip"
    );

    return {
        tournament,
        isLoading: tournament === undefined,
    };
}

/**
 * Hook pour récupérer les équipes d'un utilisateur
 */
export function useUserTeams(userId) {
    const teams = useQuery(
        api.teams.listByUser,
        userId ? { userId } : "skip"
    );

    return {
        teams: teams || [],
        isLoading: teams === undefined,
    };
}

/**
 * Hook pour récupérer les notifications
 */
export function useNotifications() {
    const { userId } = useConvexUser();
    const notifications = useQuery(
        api.notifications.listByUser,
        userId ? { userId, unreadOnly: false } : "skip"
    );
    const unreadCount = useQuery(
        api.notifications.countUnread,
        userId ? { userId } : "skip"
    );
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    return {
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        isLoading: notifications === undefined,
        markAsRead,
        markAllAsRead,
    };
}

/**
 * Hook pour créer un tournoi
 */
export function useCreateTournament() {
    const createTournament = useMutation(api.tournamentsMutations.create);

    return {
        createTournament,
    };
}

/**
 * Hook pour créer une équipe
 */
export function useCreateTeam() {
    const createTeam = useMutation(api.teamsMutations.create);

    return {
        createTeam,
    };
}

/**
 * Hook pour l'inscription à un tournoi
 */
export function useRegistration(tournamentId) {
    const { userId } = useConvexUser();
    const isRegistered = useQuery(
        api.registrations.isRegistered,
        tournamentId && userId ? { tournamentId, teamId: undefined } : "skip"
    );
    const register = useMutation(api.registrationsMutations.register);
    const unregister = useMutation(api.registrationsMutations.unregister);
    const checkIn = useMutation(api.registrationsMutations.checkIn);

    return {
        isRegistered: isRegistered || false,
        register,
        unregister,
        checkIn,
    };
}

/**
 * Hook pour le chat d'un match
 */
export function useMatchChat(matchId) {
    const messages = useQuery(
        api.chat.listByMatch,
        matchId ? { matchId, limit: 100 } : "skip"
    );
    const sendMessage = useMutation(api.chat.send);

    return {
        messages: messages || [],
        isLoading: messages === undefined,
        sendMessage,
    };
}
