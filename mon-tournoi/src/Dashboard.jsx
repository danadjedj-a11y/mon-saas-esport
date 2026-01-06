import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { getUserRole } from './utils/userRole';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Réinitialiser le flag à chaque montage du composant
    hasRedirected.current = false;

    const redirectUser = async () => {
      // Si pas de session, ne rien faire (App.jsx gère déjà la redirection vers Auth)
      if (!session?.user) {
        return;
      }

      // Éviter les redirections multiples
      if (hasRedirected.current) {
        return;
      }

      hasRedirected.current = true;

      try {
        const role = await getUserRole(supabase, session.user.id);
        // Toujours rediriger vers player si ce n'est pas organizer
        if (role === 'organizer') {
          navigate('/organizer/dashboard', { replace: true });
        } else {
          // Par défaut : player (même si role est undefined ou autre chose)
          navigate('/player/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du rôle:', error);
        // En cas d'erreur, rediriger vers player par défaut
        navigate('/player/dashboard', { replace: true });
      }
    };

    redirectUser();
  }, [session, navigate]);

  // Cette page ne devrait jamais être visible car elle redirige immédiatement
  return (
    <div className="min-h-screen flex items-center justify-center bg-fluky-bg text-fluky-text">
      <div className="text-center">
        <div className="text-5xl mb-5">⏳</div>
        <p className="font-body text-xl text-fluky-secondary">Redirection en cours...</p>
      </div>
    </div>
  );
}
