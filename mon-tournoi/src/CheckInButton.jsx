import React, { useState, useEffect } from 'react';
import { toast } from './utils/toast';

const CheckInButton = ({ tournamentId, supabase, session, tournament }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [myParticipant, setMyParticipant] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [checkInWindowOpen, setCheckInWindowOpen] = useState(false);
  const [checkInExpired, setCheckInExpired] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Mettre à jour le compte à rebours chaque seconde
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [session, tournamentId, tournament]);

  // Réécouter les changements de participants en temps réel pour mettre à jour le check-in
  useEffect(() => {
    if (!tournamentId || !session?.user) return;

    const channel = supabase
      .channel(`checkin-updates-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          // Si c'est notre participant qui a été mis à jour
          if (myParticipant && payload.new.team_id === myParticipant.team_id) {
            setMyParticipant(payload.new);
            setIsCheckedIn(payload.new.checked_in || false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, session, myParticipant?.team_id]);

  const updateCountdown = () => {
    // Si pas de date de début, on permet le check-in sans restriction
    if (!tournament?.start_date) {
      setCheckInWindowOpen(true); // Permettre le check-in si pas de date
      setTimeRemaining(null);
      setCheckInExpired(false);
      return;
    }

    const now = new Date();
    const startDate = new Date(tournament.start_date);
    
    // La fenêtre de check-in s'ouvre (check_in_window_minutes) minutes avant le début
    const checkInWindowMinutes = tournament.check_in_window_minutes || 15;
    const windowStart = new Date(startDate.getTime() - checkInWindowMinutes * 60 * 1000);
    const deadline = startDate; // La deadline est la date de début du tournoi
    
    if (now < windowStart) {
      // Fenêtre pas encore ouverte
      const diff = windowStart - now;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining({ type: 'opens_in', minutes, seconds });
      setCheckInWindowOpen(false);
      setCheckInExpired(false);
    } else if (now >= windowStart && now < deadline) {
      // Fenêtre ouverte
      const diff = deadline - now;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining({ type: 'closes_in', minutes, seconds });
      setCheckInWindowOpen(true);
      setCheckInExpired(false);
    } else {
      // Fenêtre fermée
      setTimeRemaining(null);
      setCheckInWindowOpen(false);
      setCheckInExpired(true);
    }
  };

  const checkStatus = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    // Chercher toutes les équipes où l'utilisateur est capitaine ou membre
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);
    
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id);

    const allTeamIds = [
      ...(captainTeams?.map(t => t.id) || []),
      ...(memberTeams?.map(tm => tm.team_id) || [])
    ];
    const uniqueTeamIds = [...new Set(allTeamIds)];

    if (uniqueTeamIds.length > 0) {
      const { data: participantData } = await supabase
        .from('participants')
        .select('checked_in, disqualified, team_id')
        .eq('tournament_id', tournamentId)
        .in('team_id', uniqueTeamIds)
        .maybeSingle();
      
      if (participantData) {
        setMyParticipant(participantData);
        setIsParticipant(true);
        setIsCheckedIn(participantData.checked_in);
      }
    }

    updateCountdown();
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!confirm("Confirmes-tu ta présence pour le tournoi ?")) return;

    if (!myParticipant?.team_id) {
      toast.error("Erreur: Impossible de trouver votre équipe.");
      return;
    }

    // Faire l'update dans la base de données
    const { error } = await supabase
      .from('participants')
      .update({ checked_in: true, disqualified: false })
      .eq('tournament_id', tournamentId)
      .eq('team_id', myParticipant.team_id);

    if (error) {
      toast.error("Erreur check-in : " + error.message);
      console.error("Erreur check-in:", error);
      return;
    }

    // Mettre à jour le state local immédiatement pour un feedback instantané
    setIsCheckedIn(true);
    setMyParticipant(prev => prev ? { ...prev, checked_in: true, disqualified: false } : prev);
    
    // Recharger depuis la DB pour confirmer (avec un petit délai pour laisser la DB se synchroniser)
    setTimeout(async () => {
      await checkStatus();
    }, 200);
    
    toast.success("Présence validée ! Prêt pour le combat. ⚔️");
  };

  if (loading) return null;
  
  // Si le joueur n'est pas inscrit, on ne montre pas ce bouton
  if (!isParticipant) return null;

  // Si disqualifié
  if (myParticipant?.disqualified) {
    return (
      <div style={{ 
        padding: '10px 15px', 
        background: '#e74c3c', 
        color: 'white', 
        borderRadius: '5px', 
        display: 'inline-block', 
        fontWeight: 'bold',
        border: '2px solid #c0392b'
      }}>
        ❌ Disqualifié (Check-in manqué)
      </div>
    );
  }

  // Si déjà check-in (vérifier aussi myParticipant pour éviter les problèmes de state)
  if (isCheckedIn || myParticipant?.checked_in) {
    return (
      <div style={{ 
        padding: '10px 15px', 
        background: '#2ecc71', 
        color: 'white', 
        borderRadius: '5px', 
        display: 'inline-block', 
        fontWeight: 'bold',
        border: '2px solid #27ae60'
      }}>
        ✅ Présence Validée
      </div>
    );
  }

  // Si la fenêtre de check-in est expirée (uniquement si date définie)
  if (checkInExpired && tournament?.start_date) {
    return (
      <div style={{ 
        padding: '10px 15px', 
        background: '#95a5a6', 
        color: 'white', 
        borderRadius: '5px', 
        display: 'inline-block', 
        fontWeight: 'bold'
      }}>
        ⏰ Check-in fermé
      </div>
    );
  }

  // Si la fenêtre n'est pas encore ouverte (afficher le compte à rebours)
  if (!checkInWindowOpen && timeRemaining?.type === 'opens_in') {
    return (
      <div style={{ 
        padding: '10px 15px', 
        background: '#34495e', 
        color: 'white', 
        borderRadius: '5px', 
        display: 'inline-block',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.85rem', marginBottom: '5px' }}>
          ⏳ Check-in ouvre dans :
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          {timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')}
        </div>
      </div>
    );
  }

  // Fenêtre de check-in ouverte (ou pas de date = toujours ouvert)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
      <button 
        onClick={handleCheckIn} 
        style={{ 
          background: '#f1c40f', 
          color: '#2c3e50', 
          fontWeight: 'bold', 
          padding: '12px 24px', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer',
          fontSize: '1rem',
          boxShadow: '0 4px 15px rgba(241, 196, 15, 0.4)',
          animation: 'pulse 2s infinite'
        }}
      >
        👋 Valider ma présence (Check-in)
      </button>
      
      {timeRemaining?.type === 'closes_in' && (
        <div style={{ 
          fontSize: '0.85rem', 
          color: '#f1c40f',
          fontWeight: 'bold'
        }}>
          ⏰ Fermeture dans : {timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')}
        </div>
      )}
      
      {!tournament?.start_date && (
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#aaa',
          fontStyle: 'italic'
        }}>
          ℹ️ Aucune date définie - Check-in toujours disponible
        </div>
      )}
    </div>
  );
};

export default CheckInButton;
