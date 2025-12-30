import React, { useState, useEffect } from 'react';

const JoinButton = ({ tournamentId, supabase, session }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Vérifier si le joueur est déjà inscrit au chargement
  useEffect(() => {
    const checkRegistration = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', session.user.id);

      if (data && data.length > 0) {
        setIsRegistered(true);
      }
      setLoading(false);
    };

    checkRegistration();
  }, [session, tournamentId]);

  // Fonction pour rejoindre
  const handleJoin = async () => {
    if (!session?.user) return alert("Connecte-toi d'abord !");

    // On utilise l'email comme pseudo par défaut (ou une partie de l'email)
    const pseudo = session.user.email.split('@')[0];

    const { error } = await supabase
      .from('participants')
      .insert([
        { 
          tournament_id: tournamentId, 
          user_id: session.user.id,
          name: pseudo 
        }
      ]);

    if (error) {
      alert("Erreur lors de l'inscription : " + error.message);
    } else {
      setIsRegistered(true);
      alert("Tu es inscrit ! 🎉");
      window.location.reload(); // On rafraîchit pour voir son nom dans la liste
    }
  };

  // Affichage conditionnel (Logique visuelle)
  if (loading) return <button disabled>Chargement...</button>;
  
  if (!session) return <p style={{fontSize: '0.9em', color: '#666'}}>Connecte-toi pour participer</p>;

  if (isRegistered) {
    return (
      <button disabled style={{ background: '#4CAF50', opacity: 0.8, cursor: 'default' }}>
        ✅ Déjà inscrit
      </button>
    );
  }

  return (
    <button onClick={handleJoin} style={{ background: '#FF5722', fontWeight: 'bold' }}>
      ⚔️ Rejoindre le Tournoi
    </button>
  );
};

export default JoinButton;