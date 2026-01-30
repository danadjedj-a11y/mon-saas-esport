/**
 * AUTH STORE - Version Clerk + Convex
 * 
 * Store global d'authentification utilisant Clerk au lieu de Supabase
 * Synchronisé avec Convex pour les données utilisateur
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store d'authentification global avec Zustand
 * Simplifié pour Clerk - la session est gérée par Clerk directement
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // État synchronisé avec Convex
      convexUser: null,
      userRole: 'player',
      loading: true,
      initialized: false,

      // Actions
      setConvexUser: (convexUser) => {
        set({
          convexUser,
          userRole: convexUser?.role || 'player',
          loading: false,
          initialized: true
        });
      },

      setUserRole: (role) => {
        set({ userRole: role });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      /**
       * Initialiser - Appelé quand les données Convex sont chargées
       */
      initialize: (convexUser) => {
        set({
          convexUser,
          userRole: convexUser?.role || 'player',
          loading: false,
          initialized: true
        });
      },

      /**
       * Mettre à jour le rôle utilisateur
       */
      updateUserRole: (role) => {
        set({ userRole: role });
      },

      /**
       * Réinitialiser l'état (déconnexion ou cleanup)
       */
      reset: () => {
        set({
          convexUser: null,
          userRole: 'player',
          loading: false,
          initialized: false
        });
      },
    }),
    {
      name: 'auth-storage-v2', // Nouvelle clé pour éviter conflits
      partialize: (state) => ({
        // Ne persister que le rôle
        userRole: state.userRole
      }),
    }
  )
);

export default useAuthStore;
