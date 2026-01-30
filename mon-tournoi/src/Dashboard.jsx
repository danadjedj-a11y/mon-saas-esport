import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '@clerk/clerk-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  
  // Query Convex pour obtenir le profil utilisateur avec son rôle
  const currentUser = useQuery(api.users.current);

  useEffect(() => {
    // Réinitialiser le flag à chaque montage du composant
    hasRedirected.current = false;

    const redirectUser = () => {
      // Attendre que Clerk soit chargé
      if (!isUserLoaded) return;
      
      // Si pas d'utilisateur Clerk, ne rien faire
      if (!clerkUser) return;

      // Attendre que la query Convex soit résolue
      if (currentUser === undefined) return;

      // Éviter les redirections multiples
      if (hasRedirected.current) return;

      hasRedirected.current = true;

      try {
        const role = currentUser?.role || 'player';
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
  }, [clerkUser, isUserLoaded, currentUser, navigate]);

  // Cette page ne devrait jamais être visible car elle redirige immédiatement
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-pulse">
          <img src="/Logo.png" alt="Fluky Boys" className="w-full h-full object-contain" />
        </div>
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
        <p className="font-body text-text-secondary">Redirection en cours...</p>
      </div>
    </div>
  );
}
