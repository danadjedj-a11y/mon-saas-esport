// Fichier: src/JoinButton.jsx
import React, { useState, useEffect } from 'react';

// On reçoit 'supabase' et 'session' depuis le parent (App.jsx) pour faire simple
const JoinButton = ({ tournamentId, supabase, session }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Vérifier si le joueur est déjà inscrit
  useEffect(() => {
    const checkRegistration = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .eq('tournament_id', tournamentId)
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Erreur vérification:', error);
        } else {
          // Si on trouve une ligne, c'est qu'il est inscrit
          setIsRegistered(data.length > 0);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRegistration();
  }, [supabase, session, tournamentId]);

  // 2. Action : Rejoindre le tournoi
  const handleJoinTournament = async () => {
    if (!session?.user) {
      alert("Tu dois être connecté pour participer !");
      return;
    }

    try {
      const { error } = await supabase.from('participants').insert([
        {
          tournament_id: tournamentId,
          user_id: session.user.id,
          // On utilise l'email ou le début de l'email comme pseudo par défaut
          name: session.user.email.split('@')[0], 
        },
      ]);

      if (error) {
        console.error('Erreur inscription:', error);
        alert("Erreur lors de l'inscription. Vérifie ta connexion.");
      } else {
        setIsRegistered(true);
        alert("Bienvenue dans le tournoi ! 🎮");
        // Optionnel : recharger la page pour voir son nom apparaître
        window.location.reload(); 
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // 3. Affichage (Design)
  if (loading) return <button className="btn-secondary" disabled>Chargement...</button>;

  if (!session) return <p style={{color: '#888'}}>Connecte-toi pour participer</p>;

  if (isRegistered) {
    return (
      <button disabled style={{ backgroundColor: '#2a9d8f', cursor: 'default', opacity: 0.7 }}>
        ✅ Déjà inscrit
      </button>
    );
  }

  return (
    <button onClick={handleJoinTournament} style={{ backgroundColor: '#e76f51' }}>
      ⚔️ Rejoindre le Tournoi
    </button>
  );
};

export default JoinButton;