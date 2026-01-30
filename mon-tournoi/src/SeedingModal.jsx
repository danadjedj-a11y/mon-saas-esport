import React, { useState, useEffect, useCallback } from 'react';
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from './utils/toast';

export default function SeedingModal({ isOpen, onClose, participants, tournamentId, onSave }) {
  const [seededTeams, setSeededTeams] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Mutation Convex
  const updateSeed = useMutation(api.tournamentRegistrationsMutations.updateSeed);

  const loadSeeding = useCallback(() => {
    if (!participants || participants.length === 0) return;

    // Trier par seed existant ou par ordre d'inscription
    const sorted = [...participants]
      .filter(p => p.teamId || p.team_id) // Support des deux formats
      .sort((a, b) => {
        const seedA = a.seed ?? a.seed_order ?? 999;
        const seedB = b.seed ?? b.seed_order ?? 999;
        return seedA - seedB;
      })
      .map((p, index) => ({
        ...p,
        seed_order: p.seed ?? p.seed_order ?? index + 1
      }));

    setSeededTeams(sorted);
  }, [participants]);

  useEffect(() => {
    if (isOpen && participants) {
      loadSeeding();
    }
  }, [isOpen, participants, loadSeeding]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newTeams = [...seededTeams];
    const draggedTeam = newTeams[draggedIndex];
    
    // Retirer l'élément de sa position actuelle
    newTeams.splice(draggedIndex, 1);
    
    // Insérer à la nouvelle position
    newTeams.splice(dropIndex, 0, draggedTeam);
    
    // Mettre à jour les seed_order
    const updated = newTeams.map((team, index) => ({
      ...team,
      seed_order: index + 1
    }));
    
    setSeededTeams(updated);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const saveSeeding = async () => {
    try {
      // Sauvegarder l'ordre via Convex
      for (let i = 0; i < seededTeams.length; i++) {
        const team = seededTeams[i];
        const registrationId = team._id || team.id;
        
        if (registrationId) {
          await updateSeed({
            registrationId,
            seed: i + 1
          });
        }
      }

      if (onSave) onSave();
      toast.success('Seeding sauvegardé ! Les équipes seront placées dans cet ordre lors de la génération.');
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde seeding:', error);
      toast.error('Erreur lors de la sauvegarde du seeding : ' + error.message);
    }
  };

  const resetSeeding = () => {
    const reset = participants
      .map((p, index) => ({ ...p, seed_order: index + 1 }))
      .sort((a, b) => (a.seed_order || 999) - (b.seed_order || 999));
    setSeededTeams(reset);
  };

  if (!isOpen) return null;

  const getTeamLogo = (team) => 
    team?.teams?.logo_url || `https://ui-avatars.com/api/?name=${team?.teams?.tag || '?'}&background=random&size=64`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '2px solid #8e44ad',
        boxShadow: '0 10px 40px rgba(142, 68, 173, 0.3)'
      }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#8e44ad', fontSize: '1.8rem' }}>🎯 God Mode - Seeding</h2>
            <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.9rem' }}>
              Réorganise les équipes par drag & drop. L'ordre définira leur placement dans l'arbre.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #555',
              color: '#888',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* INFO BOX */}
        <div style={{
          background: '#2a2a2a',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #f1c40f'
        }}>
          <p style={{ margin: 0, color: '#f1c40f', fontSize: '0.9rem' }}>
            💡 <strong>Astuce :</strong> Le seed #1 sera placé en haut de l'arbre, le seed #2 en bas. 
            Les seeds pairs se rencontrent en finale si tout se passe bien.
          </p>
        </div>

        {/* LISTE DES ÉQUIPES */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '1.1rem' }}>
            Ordre de Seeding ({seededTeams.length} équipes)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {seededTeams.map((team, index) => (
              <div
                key={team.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: draggedIndex === index ? '#8e44ad' : '#252525',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  cursor: 'move',
                  transition: 'all 0.2s',
                  opacity: draggedIndex === index ? 0.5 : 1,
                  transform: draggedIndex === index ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {/* NUMÉRO DE SEED */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: index === 0 ? 'linear-gradient(135deg, #f1c40f, #e67e22)' : 
                             index === 1 ? 'linear-gradient(135deg, #95a5a6, #7f8c8d)' :
                             index === 2 ? 'linear-gradient(135deg, #cd7f32, #8b4513)' : '#444',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: index < 3 ? '0 0 10px rgba(241, 196, 15, 0.5)' : 'none'
                }}>
                  {index + 1}
                </div>

                {/* LOGO */}
                <img
                  src={getTeamLogo(team)}
                  alt=""
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '2px solid #555',
                    flexShrink: 0
                  }}
                />

                {/* INFOS ÉQUIPE */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>
                    {team.teams?.name || 'Équipe inconnue'}
                  </div>
                  <div style={{ color: '#00d4ff', fontSize: '0.85rem', marginTop: '2px' }}>
                    [{team.teams?.tag || '?'}]
                  </div>
                </div>

                {/* ICÔNE DRAG */}
                <div style={{ color: '#666', fontSize: '1.5rem', cursor: 'grab' }}>
                  ☰
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOUTONS */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={resetSeeding}
            style={{
              padding: '12px 20px',
              background: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Réinitialiser
          </button>
          <button
            onClick={saveSeeding}
            style={{
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #8e44ad, #3498db)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(142, 68, 173, 0.4)'
            }}
          >
            💾 Sauvegarder le Seeding
          </button>
        </div>
      </div>
    </div>
  );
}

