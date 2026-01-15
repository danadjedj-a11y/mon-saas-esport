import { useEffect } from 'react';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../supabaseClient';
import { toast } from '../../utils/toast';
import analytics from '../../utils/analytics';
import monitoring from '../../utils/monitoring';

/**
 * Hook personnalisé pour la gestion de l'authentification
 * Abstraction complète de la logique auth avec le store Zustand
 */
export const useAuth = () => {
  const {
    session,
    user,
    userRole,
    loading,
    setSession,
    setUserRole,
    setLoading,
    updateUserRole,
    signOut: storeSignOut,
    initialize,
  } = useAuthStore();

  /**
   * Initialiser l'authentification au montage
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * Écouter les changements d'authentification de Supabase
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 [useAuth] Auth State Change:', event, session?.user?.email || 'No user');

        if (event === 'SIGNED_IN' && session?.user) {
          setSession(session);
          
          // Mettre à jour le rôle de manière non-bloquante
          updateUserRole(session.user.id).catch(err => {
            console.error('❌ [useAuth] Erreur updateUserRole:', err);
          });
          
          // Monitoring
          try {
            monitoring.setUser({
              id: session.user.id,
              email: session.user.email,
              username: session.user.user_metadata?.username,
            });
          } catch (err) {
            console.warn('Erreur monitoring:', err);
          }
          
          analytics.trackEvent('user_logged_in');
          toast.success('✅ Connexion réussie !');
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUserRole(null);
          monitoring.setUser(null);
          analytics.trackEvent('user_logged_out');
          toast.info('👋 Vous avez été déconnecté');
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSession(session);
          updateUserRole(session.user.id).catch(err => {
            console.error('❌ [useAuth] Erreur updateUserRole (refresh):', err);
          });
        } else if (event === 'USER_UPDATED' && session?.user) {
          setSession(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUserRole, updateUserRole]);

  /**
   * Connexion avec email/password
   */
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erreur connexion:', error);
      toast.error('Erreur de connexion: ' + error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inscription avec email/password
   */
  const signUp = async (email, password, username) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      toast.success('✅ Inscription réussie ! Vérifiez votre email.');
      return { data, error: null };
    } catch (error) {
      console.error('Erreur inscription:', error);
      toast.error('Erreur d\'inscription: ' + error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Déconnexion
   */
  const signOut = async () => {
    try {
      await storeSignOut();
      return { error: null };
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      toast.error('Erreur de déconnexion');
      return { error };
    }
  };

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  const isAuthenticated = !!session && !!user;

  /**
   * Vérifier si l'utilisateur est organisateur
   */
  const isOrganizer = userRole === 'organizer';

  /**
   * Vérifier si l'utilisateur est admin
   */
  const isAdmin = userRole === 'admin';

  return {
    // État
    session,
    user,
    userRole,
    loading,
    isAuthenticated,
    isOrganizer,
    isAdmin,
    
    // Actions
    signIn,
    signUp,
    signOut,
    updateUserRole: () => updateUserRole(user?.id),
  };
};

export default useAuth;
