import React, { useState, useEffect } from 'react';

const CheckInButton = ({ tournamentId, supabase, session }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [session, tournamentId]);

  const checkStatus = async () => {
    if (!session?.user) return setLoading(false);

    // On vérifie si le joueur est inscrit ET s'il a check-in
    const { data } = await supabase
      .from('participants')
      .select('checked_in')
      .eq('tournament_id', tournamentId)
      .eq('user_id', session.user.id)
      .single();

    if (data) {
      setIsParticipant(true);
      setIsCheckedIn(data.checked_in);
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!confirm("Confirmes-tu ta présence pour le tournoi ?")) return;

    const { error } = await supabase
      .from('participants')
      .update({ checked_in: true })
      .eq('tournament_id', tournamentId)
      .eq('user_id', session.user.id);

    if (error) {
      alert("Erreur check-in : " + error.message);
    } else {
      setIsCheckedIn(true);
      alert("Présence validée ! Prêt pour le combat. ⚔️");
    }
  };

  if (loading) return null;
  
  // Si le joueur n'est pas inscrit, on ne montre pas ce bouton (le bouton JoinButton s'en occupe)
  if (!isParticipant) return null;

  if (isCheckedIn) {
    return (
      <div style={{ padding: '10px', background: '#2ecc71', color: 'white', borderRadius: '5px', display: 'inline-block', fontWeight: 'bold' }}>
        ✅ Présence Validée
      </div>
    );
  }

  return (
    <button 
      onClick={handleCheckIn} 
      style={{ 
        background: '#f1c40f', 
        color: '#2c3e50', 
        fontWeight: 'bold', 
        padding: '10px 20px', 
        border: 'none', 
        borderRadius: '5px', 
        cursor: 'pointer',
        animation: 'pulse 2s infinite' // Petit effet visuel
      }}
    >
      👋 Valider ma présence (Check-in)
    </button>
  );
};

export default CheckInButton;