import React, { useState, useEffect } from 'react';
import { notifyMatchUpcoming } from './notificationUtils';

export default function SchedulingModal({ isOpen, onClose, match, supabase, onSave }) {
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && match) {
      // Charger la date/heure planifiée existante si elle existe
      if (match.scheduled_at) {
        const date = new Date(match.scheduled_at);
        // Formater pour datetime-local (YYYY-MM-DDTHH:mm)
        // On doit ajuster pour l'heure locale
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        // Pas de date planifiée
        setScheduledDateTime('');
      }
    }
  }, [isOpen, match]);

  const handleSave = async () => {
    if (!match) return;

    setLoading(true);
    try {
      let scheduledAtISO = null;
      
      if (scheduledDateTime) {
        // Construire la date/heure complète depuis datetime-local
        const [datePart, timePart] = scheduledDateTime.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Créer la date en heure locale
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        scheduledAtISO = localDate.toISOString();
      }

      // Mettre à jour le match
      const { error } = await supabase
        .from('matches')
        .update({ scheduled_at: scheduledAtISO })
        .eq('id', match.id);

      if (error) throw error;

      // Créer des notifications pour les équipes si le match a des équipes assignées
      if (scheduledAtISO && match.player1_id && match.player2_id) {
        await notifyMatchUpcoming(match.id, match.player1_id, match.player2_id, scheduledAtISO);
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      alert('Erreur lors de la planification : ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!match) return;
    if (!confirm('Supprimer la planification de ce match ?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ scheduled_at: null })
        .eq('id', match.id);

      if (error) throw error;

      if (onSave) onSave();
      onClose();
    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !match) return null;

  // Obtenir les noms des équipes (depuis match enrichi)
  const team1Name = match.p1_name || 'Équipe 1';
  const team2Name = match.p2_name || 'Équipe 2';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#2a2a2a',
        padding: '30px',
        borderRadius: '12px',
        width: '500px',
        maxWidth: '90vw',
        border: '1px solid #444'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#00d4ff' }}>
          📅 Planifier le Match
        </h2>

        <div style={{ marginBottom: '20px', padding: '15px', background: '#1a1a1a', borderRadius: '8px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px' }}>
            Match #{match.match_number} - Round {match.round_number}
          </div>
          <div style={{ color: '#aaa' }}>
            {team1Name} <span style={{ color: '#666' }}>vs</span> {team2Name}
          </div>
          {match.bracket_type && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: match.bracket_type === 'winners' ? '#4ade80' : '#e74c3c' }}>
              {match.bracket_type === 'winners' ? '🏆 Winners Bracket' : '💀 Losers Bracket'}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Date et Heure
          </label>
          <input
            type="datetime-local"
            value={scheduledDateTime}
            onChange={(e) => setScheduledDateTime(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#111',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '5px',
              fontSize: '1rem'
            }}
          />
        </div>

        {match.scheduled_at && (
          <div style={{
            marginBottom: '20px',
            padding: '10px',
            background: '#1a3a1a',
            borderRadius: '5px',
            border: '1px solid #27ae60',
            fontSize: '0.9rem',
            color: '#4ade80'
          }}>
            📅 Déjà planifié le {new Date(match.scheduled_at).toLocaleString('fr-FR', {
              dateStyle: 'full',
              timeStyle: 'short'
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {match.scheduled_at && (
            <button
              onClick={handleClear}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ Supprimer
            </button>
          )}
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !scheduledDateTime}
            style={{
              padding: '10px 20px',
              background: scheduledDateTime ? '#4ade80' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: (loading || !scheduledDateTime) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳...' : '✅ Planifier'}
          </button>
        </div>
      </div>
    </div>
  );
}

