/**
 * USE AUTH HOOK - Version Clerk + Convex
 * 
 * Hook unifié pour l'authentification utilisant Clerk
 * et les données utilisateur depuis Convex
 */

import { useEffect } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import useAuthStore from '../../stores/authStore';
import analytics from '../../utils/analytics';
import monitoring from '../../utils/monitoring';

/**
 * Hook personnalisé pour la gestion de l'authentification
 * Abstraction complète de la logique auth avec Clerk + Convex
 */
export const useAuth = () => {
  // Clerk hooks
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { getToken } = useClerkAuth();

  // Convex user data
  const convexUser = useQuery(api.users.getCurrent);

  // Store Zustand
  const {
    userRole,
    loading: storeLoading,
    setConvexUser,
    setUserRole,
    setLoading,
    reset,
    initialized,
    initialize,
  } = useAuthStore();

  /**
   * Synchroniser Convex user avec le store quand il change
   */
  useEffect(() => {
    if (convexUser !== undefined) {
      setConvexUser(convexUser);

      // Monitoring
      if (convexUser) {
        try {
          monitoring.setUser({
            id: convexUser._id,
            email: convexUser.email,
            username: convexUser.username,
          });
        } catch (err) {
          console.warn('Erreur monitoring:', err);
        }
      }
    }
  }, [convexUser, setConvexUser]);

  /**
   * Tracker les événements d'auth
   */
  useEffect(() => {
    if (isLoaded && isSignedIn && convexUser) {
      analytics.trackEvent('user_session_active');
    }
  }, [isLoaded, isSignedIn, convexUser]);

  /**
   * Déconnexion
   */
  const signOut = async () => {
    try {
      await clerkSignOut();
      reset();
      monitoring.setUser(null);
      analytics.trackEvent('user_logged_out');
      return { error: null };
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      return { error };
    }
  };

  // États dérivés
  const loading = !isLoaded || (isSignedIn && convexUser === undefined);
  const isAuthenticated = isSignedIn && !!convexUser;
  const isOrganizer = convexUser?.role === 'organizer';
  const isAdmin = convexUser?.role === 'admin';

  // Créer un objet session compatible avec l'ancien format
  const session = isAuthenticated ? {
    user: {
      id: convexUser._id,
      email: convexUser.email,
      user_metadata: {
        username: convexUser.username,
        avatar_url: convexUser.avatarUrl,
      },
      created_at: convexUser.createdAt,
    }
  } : null;

  // Objet user compatible
  const user = isAuthenticated ? {
    id: convexUser._id,
    email: convexUser.email,
    username: convexUser.username,
    avatarUrl: convexUser.avatarUrl,
    user_metadata: {
      username: convexUser.username,
      avatar_url: convexUser.avatarUrl,
    },
  } : null;

  return {
    // État - Compatible avec l'ancienne API
    session,
    user,
    userRole: convexUser?.role || 'player',
    loading,
    isAuthenticated,
    isOrganizer,
    isAdmin,

    // Nouvelles propriétés Clerk
    clerkUser,
    convexUser,
    isLoaded,
    isSignedIn,

    // Actions
    signOut,
    getToken,
    updateUserRole: (role) => setUserRole(role),
  };
};

export default useAuth;
