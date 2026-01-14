import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from './utils/toast';
import { handleRateLimitError } from './utils/rateLimitHandler';
import { getPlatformForGame, getRequiredPlatformName } from './utils/gamePlatforms';
import { checkUserHasPlatformAccount } from './shared/services/api/gamingAccounts';

export default function TeamJoinButton({ tournamentId, supabase, session, onJoinSuccess, tournament }) {
  const navigate = useNavigate();
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isInWaitlist, setIsInWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [canRegister, setCanRegister] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState('');

  useEffect(() => {
    if (session) {
      fetchTournamentInfo();
      checkRegistration();
      fetchMyTeams();
    }
  }, [session, tournamentId, tournament]);

  // Récupérer les infos du tournoi pour vérifier les limitations
  const fetchTournamentInfo = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('max_participants, registration_deadline, status, game')
      .eq('id', tournamentId)
      .single();
    
    setTournamentInfo(data);
    
    // Vérifier si les inscriptions sont fermées
    if (data) {
      const now = new Date();
      if (data.registration_deadline) {
        const deadline = new Date(data.registration_deadline);
        if (deadline < now) {
          setCanRegister(false);
          setRegistrationMessage('Les inscriptions sont fermées (date limite dépassée).');
          return;
        }
      }
      
      if (data.status !== 'draft') {
        setCanRegister(false);
        setRegistrationMessage('Les inscriptions sont fermées (tournoi en cours ou terminé).');
        return;
      }
      
      setCanRegister(true);
    }
  };

  // Vérifier si une de mes équipes est déjà inscrite ou en liste d'attente
  const checkRegistration = async () => {
    // On récupère toutes les participations de ce tournoi
    const { data: participants } = await supabase
      .from('participants')
      .select('team_id')
      .eq('tournament_id', tournamentId);

    // On récupère mes équipes
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('captain_id', session.user.id);

    if (participants && teams) {
      // Est-ce qu'une de mes équipes est dans la liste des participants ?
      const myTeamIds = teams.map(t => t.id);
      const isAlreadyIn = participants.some(p => myTeamIds.includes(p.team_id));
      setIsJoined(isAlreadyIn);
      
      // Vérifier si une de mes équipes est en liste d'attente
      if (!isAlreadyIn) {
        const { data: waitlistData } = await supabase
          .from('waitlist')
          .select('position, team_id')
          .eq('tournament_id', tournamentId)
          .in('team_id', myTeamIds)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (waitlistData) {
          setIsInWaitlist(true);
          setWaitlistPosition(waitlistData.position);
        } else {
          setIsInWaitlist(false);
          setWaitlistPosition(null);
        }
      } else {
        setIsInWaitlist(false);
        setWaitlistPosition(null);
      }
    }
  };

  const fetchMyTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id);
    
    setMyTeams(data || []);
    if (data && data.length > 0) setSelectedTeamId(data[0].id); // Sélectionner la première par défaut
  };

  // Fonction pour promouvoir automatiquement de la waitlist
  const promoteFromWaitlist = async () => {
    if (!tournamentInfo?.max_participants) return null;

    // Récupérer le nombre actuel de participants
    const { data: participants, count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    const currentCount = count || 0;
    
    if (currentCount < tournamentInfo.max_participants) {
      // Récupérer le premier de la waitlist
      const { data: firstInWaitlist } = await supabase
        .from('waitlist')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (firstInWaitlist) {
        // Promouvoir en participant
        const { error: insertError } = await supabase
          .from('participants')
          .insert([{
            tournament_id: tournamentId,
            team_id: firstInWaitlist.team_id,
            checked_in: false,
            disqualified: false
          }]);

        if (!insertError) {
          // Retirer de la waitlist
          await supabase
            .from('waitlist')
            .delete()
            .eq('id', firstInWaitlist.id);

          // Réorganiser les positions dans la waitlist
          const { data: remainingWaitlist } = await supabase
            .from('waitlist')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('position', { ascending: true });

          if (remainingWaitlist) {
            for (let i = 0; i < remainingWaitlist.length; i++) {
              await supabase
                .from('waitlist')
                .update({ position: i + 1 })
                .eq('id', remainingWaitlist[i].id);
            }
          }

          return firstInWaitlist.team_id;
        }
      }
    }
    
    return null;
  };

  const handleJoin = async () => {
    if (!canRegister) {
      toast.warning(registrationMessage);
      return;
    }

    // Vérifier si le joueur a le compte gaming requis pour ce jeu
    const game = tournament?.game || tournamentInfo?.game;
    if (game) {
      const requiredPlatform = getPlatformForGame(game);
      if (requiredPlatform) {
        const hasAccount = await checkUserHasPlatformAccount(session.user.id, requiredPlatform);
        if (!hasAccount) {
          const platformName = getRequiredPlatformName(game);
          toast.error(
            `⚠️ Compte ${platformName} requis`,
            {
              description: `Pour rejoindre ce tournoi ${game}, vous devez lier votre compte ${platformName}. Allez dans votre profil > Comptes Gaming pour l'ajouter.`,
              action: {
                label: '👤 Aller au profil',
                onClick: () => navigate('/profile'),
              },
            }
          );
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);
    
    try {
      // Vérifier les limitations
      const { data: currentParticipants, count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      const currentCount = count || 0;
      const maxParticipants = tournamentInfo?.max_participants;

      if (maxParticipants && currentCount >= maxParticipants) {
        // Tournoi complet, ajouter à la waitlist
        // Récupérer la position suivante dans la waitlist
        const { data: lastInWaitlist } = await supabase
          .from('waitlist')
          .select('position')
          .eq('tournament_id', tournamentId)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextPosition = lastInWaitlist ? lastInWaitlist.position + 1 : 1;

        const { error: waitlistError } = await supabase
          .from('waitlist')
          .insert([{
            tournament_id: tournamentId,
            team_id: selectedTeamId,
            position: nextPosition
          }]);

        if (waitlistError) {
          if (waitlistError.code === '23505') {
            toast.warning('Votre équipe est déjà en liste d\'attente pour ce tournoi.');
          } else {
            const errorMessage = handleRateLimitError(waitlistError, 'inscriptions');
            toast.error(errorMessage);
          }
        } else {
          setIsInWaitlist(true);
          setWaitlistPosition(nextPosition);
          toast.success(`Votre équipe a été ajoutée à la liste d'attente (position #${nextPosition}). Vous serez automatiquement inscrit si une place se libère.`);
        }
      } else {
        // Il y a de la place, inscription normale
        const { error } = await supabase
          .from('participants')
          .insert([{ 
            tournament_id: tournamentId, 
            team_id: selectedTeamId,
            checked_in: false,
            disqualified: false
          }]);

        if (error) {
          const errorMessage = handleRateLimitError(error, 'inscriptions');
          toast.error(errorMessage);
        } else {
          setIsJoined(true);
          toast.success('Votre équipe a été inscrite au tournoi !');
          if (onJoinSuccess) onJoinSuccess(); // Pour rafraîchir la liste
        }
      }
    } catch (error) {
      const errorMessage = handleRateLimitError(error, 'inscriptions');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isJoined) {
    return <button disabled style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', opacity: 0.8 }}>✅ Ton équipe est inscrite</button>;
  }

  if (isInWaitlist) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button disabled style={{ background: '#f39c12', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', opacity: 0.8 }}>
          ⏳ En liste d'attente (Position #{waitlistPosition})
        </button>
        <small style={{ fontSize: '0.8rem', color: '#aaa' }}>
          Vous serez automatiquement inscrit si une place se libère.
        </small>
      </div>
    );
  }

  if (!canRegister) {
    return (
      <button disabled style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', opacity: 0.6 }}>
        ❌ {registrationMessage}
      </button>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
        Tu dois <a href="/create-team" style={{ color: '#3498db' }}>créer une équipe</a> pour t'inscrire.
      </div>
    );
  }

  // Afficher le compteur d'inscriptions si max_participants est défini
  const displayCount = tournamentInfo?.max_participants ? (
    <small style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginTop: '5px' }}>
      {tournamentInfo.max_participants ? `Places disponibles : ${tournamentInfo.max_participants - (tournament?.participants_count || 0)}/${tournamentInfo.max_participants}` : ''}
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
            <option key={team.id} value={team.id}>Inscrire : {team.name} [{team.tag}]</option>
          ))}
        </select>

        <button 
          onClick={handleJoin} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            background: '#8e44ad', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '...' : 'Valider'}
        </button>
      </div>
      {displayCount}
    </div>
  );
}
