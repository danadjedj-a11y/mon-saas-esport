import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from './utils/toast';

const CheckInButton = ({ tournamentId, session, tournament }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [checkInWindowOpen, setCheckInWindowOpen] = useState(false);
  const [checkInExpired, setCheckInExpired] = useState(false);
  const isMountedRef = useRef(true);

  // Queries Convex
  const registrations = useQuery(
    api.tournamentRegistrations.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );

  const myTeams = useQuery(
    api.teams.listByUser,
    session?.user?.convexId ? { userId: session.user.convexId } : "skip"
  ) || [];

  // Mutation Convex
  const toggleCheckIn = useMutation(api.tournamentRegistrationsMutations.toggleCheckIn);

  // Cleanup au démontage du composant
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Trouver mon inscription
  const myTeamIds = myTeams?.map(t => t._id) || [];
  const myRegistration = registrations?.find(r => 
    r.teamId && myTeamIds.includes(r.teamId)
  );
  
  const isParticipant = !!myRegistration;
  const isCheckedIn = myRegistration?.status === 'checked_in';
  const isDisqualified = myRegistration?.status === 'disqualified';

  // Mémoriser updateCountdown avec useCallback
  const updateCountdown = useCallback(() => {
    // Si pas de date de début, on permet le check-in sans restriction
    if (!tournament?.startDate) {
      setCheckInWindowOpen(true);
      setTimeRemaining(null);
      setCheckInExpired(false);
      return;
    }

    const now = new Date();
    const startDate = new Date(tournament.startDate);
    
    const checkInWindowMinutes = tournament.checkInWindowMinutes || 15;
    const windowStart = new Date(startDate.getTime() - checkInWindowMinutes * 60 * 1000);
    const deadline = startDate;
    
    if (now < windowStart) {
      const diff = windowStart - now;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining({ type: 'opens_in', minutes, seconds });
      setCheckInWindowOpen(false);
      setCheckInExpired(false);
    } else if (now >= windowStart && now < deadline) {
      const diff = deadline - now;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining({ type: 'closes_in', minutes, seconds });
      setCheckInWindowOpen(true);
      setCheckInExpired(false);
    } else {
      setTimeRemaining(null);
      setCheckInWindowOpen(false);
      setCheckInExpired(true);
    }
  }, [tournament]);

  useEffect(() => {
    isMountedRef.current = true;
    updateCountdown();
    
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        updateCountdown();
      }
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [updateCountdown]);

  const handleCheckIn = async () => {
    if (!confirm("Confirmes-tu ta présence pour le tournoi ?")) return;

    if (!myRegistration) {
      toast.error("Erreur: Impossible de trouver votre inscription.");
      return;
    }

    try {
      await toggleCheckIn({
        registrationId: myRegistration._id,
        checkedIn: true,
      });
      
      toast.success("Présence validée ! Prêt pour le combat. ⚔️");
    } catch (error) {
      toast.error("Erreur check-in : " + error.message);
      console.error("Erreur check-in:", error);
    }
  };

  // Si pas d'inscription ou chargement en cours
  if (!registrations || !isParticipant) return null;

  // Si disqualifié
  if (isDisqualified) {
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

  // Si déjà check-in
  if (isCheckedIn) {
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
  if (checkInExpired && tournament?.startDate) {
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
      
      {!tournament?.startDate && (
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
