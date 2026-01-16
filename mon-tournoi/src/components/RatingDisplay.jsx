import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function RatingDisplay({ tournamentId }) {
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const fetchRating = async () => {
    try {
      const { data, error } = await supabase.rpc('get_tournament_rating', {
        p_tournament_id: tournamentId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setRating(data[0]);
      } else {
        setRating({ average_rating: 0, total_ratings: 0 });
      }
    } catch (err) {
      console.error('Erreur chargement note:', err);
      setRating({ average_rating: 0, total_ratings: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif", fontSize: '0.9rem' }}>
          Chargement...
        </span>
      </div>
    );
  }

  if (!rating || rating.total_ratings === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#8B5CF6', fontFamily: "'Protest Riot', sans-serif", fontSize: '0.9rem' }}>
          Aucune note
        </span>
      </div>
    );
  }

  const fullStars = Math.floor(rating.average_rating);
  const hasHalfStar = rating.average_rating % 1 >= 0.5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          if (star <= fullStars) {
            return (
              <span key={star} style={{ color: '#F8EC54', fontSize: '1.2rem' }}>
                ⭐
              </span>
            );
          } else if (star === fullStars + 1 && hasHalfStar) {
            return (
              <span key={star} style={{ color: '#F8EC54', fontSize: '1.2rem', opacity: 0.5 }}>
                ⭐
              </span>
            );
          } else {
            return (
              <span key={star} style={{ color: '#8B5CF6', fontSize: '1.2rem', opacity: 0.3 }}>
                ⭐
              </span>
            );
          }
        })}
      </div>
      <span style={{
        color: '#F8F6F2',
        fontFamily: "'Protest Riot', sans-serif",
        fontSize: '0.9rem',
        fontWeight: 'bold'
      }}>
        {rating.average_rating.toFixed(1)}
      </span>
      <span style={{
        color: '#8B5CF6',
        fontFamily: "'Protest Riot', sans-serif",
        fontSize: '0.85rem',
        opacity: 0.8
      }}>
        ({rating.total_ratings} {rating.total_ratings > 1 ? 'avis' : 'avis'})
      </span>
    </div>
  );
}

