import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabaseClient';
import { getUserRole } from '../utils/userRole';

/**
 * Store d'authentification global avec Zustand
 * Gère la session utilisateur, le rôle, et l'état de chargement
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // État
      session: null,
      user: null,
      userRole: null,
      loading: true,
      initialized: false,

      // Actions
      setSession: (session) => {
        set({ 
          session, 
          user: session?.user || null,
          loading: false 
        });
      },

      setUserRole: (role) => {
        set({ userRole: role });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      /**
       * Initialiser la session au démarrage de l'application
       */
      initialize: async () => {
        const { initialized } = get();
        if (initialized) return;

        set({ loading: true });

        try {
          // Vérifier s'il y a une session persistée
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Erreur lors de la récupération de la session:', error);
            set({ session: null, user: null, userRole: null, loading: false, initialized: true });
            return;
          }

          if (session?.user) {
            // Récupérer le rôle de l'utilisateur
            try {
              const role = await getUserRole(supabase, session.user.id);
              set({ 
                session, 
                user: session.user, 
                userRole: role, 
                loading: false,
                initialized: true 
              });
            } catch (roleError) {
              console.error('Erreur lors de la récupération du rôle:', roleError);
              // Continuer quand même avec un rôle par défaut
              set({ 
                session, 
                user: session.user, 
                userRole: 'player', 
                loading: false,
                initialized: true 
              });
            }
          } else {
            set({ session: null, user: null, userRole: null, loading: false, initialized: true });
          }
        } catch (error) {
          console.error('Erreur lors de l\'initialisation:', error);
          set({ session: null, user: null, userRole: null, loading: false, initialized: true });
        }
      },

      /**
       * Mettre à jour le rôle utilisateur
       */
      updateUserRole: async (userId) => {
        if (!userId) return;
        
        try {
          const role = await getUserRole(supabase, userId);
          set({ userRole: role });
        } catch (error) {
          console.error('Erreur lors de la mise à jour du rôle:', error);
        }
      },

      /**
       * Déconnexion
       */
      signOut: async () => {
        try {
          await supabase.auth.signOut();
          set({ session: null, user: null, userRole: null });
        } catch (error) {
          console.error('Erreur lors de la déconnexion:', error);
          throw error;
        }
      },

      /**
       * Réinitialiser l'état (pour les tests ou cleanup)
       */
      reset: () => {
        set({ session: null, user: null, userRole: null, loading: false, initialized: false });
      },
    }),
    {
      name: 'auth-storage', // Nom de la clé dans localStorage
      partialize: (state) => ({ 
        // Ne persister que session et userRole (pas loading ni initialized)
        session: state.session, 
        userRole: state.userRole 
      }),
    }
  )
);

export default useAuthStore;
