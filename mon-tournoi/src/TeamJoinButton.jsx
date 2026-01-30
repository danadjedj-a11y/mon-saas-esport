import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from './utils/toast';
import { getPlatformForGame, getRequiredPlatformName } from './utils/gamePlatforms';

export default function TeamJoinButton({ tournamentId, session, onJoinSuccess, tournament }) {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(false);

  // Queries Convex - équipes dont je suis capitaine
  const myTeams = useQuery(
    api.teams.listByCaptain, 
    session?.user?.convexId ? { userId: session.user.convexId } : "skip"
  ) || [];

  const registrations = useQuery(
    api.tournamentRegistrations.listByTournament,
    tournamentId ? { tournamentId } : "skip"
  );

  const tournamentData = useQuery(
    api.tournaments.getById,
    tournamentId ? { tournamentId } : "skip"
  );

  // Mutations Convex
  const registerTeam = useMutation(api.tournamentRegistrationsMutations.register);

  // Sélectionner la première équipe par défaut
  useEffect(() => {
    if (myTeams && myTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(myTeams[0]._id);
    }
  }, [myTeams, selectedTeamId]);

  // Vérifier l'état d'inscription
  const myTeamIds = myTeams?.map(t => t._id) || [];
  const isJoined = registrations?.some(r => myTeamIds.includes(r.teamId));
  
  // Vérifier si les inscriptions sont ouvertes
  const tournamentInfo = tournamentData || tournament;
  const canRegister = tournamentInfo?.status === 'draft';
  const registrationMessage = !canRegister 
    ? 'Les inscriptions sont fermées (tournoi en cours ou terminé).' 
    : '';

  // Calculer les places disponibles
  const currentCount = registrations?.length || 0;
  const maxParticipants = tournamentInfo?.maxTeams;
  const isFull = maxParticipants && currentCount >= maxParticipants;

  const handleJoin = async () => {
    if (!canRegister) {
      toast.warning(registrationMessage);
      return;
    }

    if (!selectedTeamId) {
      toast.warning('Veuillez sélectionner une équipe.');
      return;
    }

    // Vérifier si le joueur a le compte gaming requis pour ce jeu
    const game = tournamentInfo?.game;
    if (game) {
      const requiredPlatform = getPlatformForGame(game);
      if (requiredPlatform) {
        const platformName = getRequiredPlatformName(game);
        // Note: Vérification complète pourrait être ajoutée côté Convex
      }
    }

    setLoading(true);
    
    try {
      if (isFull) {
        toast.warning('Le tournoi est complet.');
        return;
      }

      // Inscription via Convex
      await registerTeam({
        tournamentId: tournamentId,
        teamId: selectedTeamId,
      });

      toast.success('Votre équipe a été inscrite au tournoi !');
      if (onJoinSuccess) onJoinSuccess();
    } catch (error) {
      console.error('Erreur inscription:', error);
      if (error.message.includes('déjà inscrite')) {
        toast.warning('Votre équipe est déjà inscrite à ce tournoi.');
      } else if (error.message.includes('complet')) {
        toast.warning('Le tournoi est complet.');
      } else if (error.message.includes('fermées')) {
        toast.warning('Les inscriptions sont fermées.');
      } else {
        toast.error('Erreur lors de l\'inscription : ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Rendu conditionnel
  if (isJoined) {
    return (
      <button 
        disabled 
        style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', opacity: 0.8 }}
      >
        ✅ Ton équipe est inscrite
      </button>
    );
  }

  if (!canRegister) {
    return (
      <button 
        disabled 
        style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', opacity: 0.6 }}
      >
        ❌ {registrationMessage}
      </button>
    );
  }

  if (!myTeams || myTeams.length === 0) {
    return (
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
        Tu dois <a href="/create-team" style={{ color: '#3498db' }}>créer une équipe</a> pour t'inscrire.
      </div>
    );
  }

  // Afficher le compteur d'inscriptions
  const displayCount = maxParticipants ? (
    <small style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginTop: '5px' }}>
      Places disponibles : {maxParticipants - currentCount}/{maxParticipants}
      {isFull && ' (COMPLET)'}
    </small>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select 
          value={selectedTeamId} 
          onChange={(e) => setSelectedTeamId(e.target.value)}
          style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px' }}
        >
          {myTeams.map(team => (
            <option key={team._id} value={team._id}>
              Inscrire : {team.name} [{team.tag}]
            </option>
          ))}
        </select>

        <button 
          onClick={handleJoin} 
          disabled={loading || isFull}
          style={{ 
            padding: '10px 20px', 
            background: isFull ? '#7f8c8d' : '#8e44ad', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: isFull ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: isFull ? 0.6 : 1
          }}
        >
          {loading ? '...' : isFull ? 'Complet' : 'Valider'}
        </button>
      </div>
      {displayCount}
    </div>
  );
}
