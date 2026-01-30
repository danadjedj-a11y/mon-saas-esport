import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function RatingDisplay({ tournamentId }) {
  const rating = useQuery(
    api.gamification.getTournamentRating,
    tournamentId ? { tournamentId } : 'skip'
  );

  if (rating === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#F8F6F2', fontFamily: "'Protest Riot', sans-serif", fontSize: '0.9rem' }}>
          Chargement...
        </span>
      </div>
    );
  }

  if (!rating || rating.totalRatings === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#8B5CF6', fontFamily: "'Protest Riot', sans-serif", fontSize: '0.9rem' }}>
          Aucune note
        </span>
      </div>
    );
  }

  const fullStars = Math.floor(rating.averageRating);
  const hasHalfStar = rating.averageRating % 1 >= 0.5;

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
        {rating.averageRating.toFixed(1)}
      </span>
      <span style={{
        color: '#8B5CF6',
        fontFamily: "'Protest Riot', sans-serif",
        fontSize: '0.85rem',
        opacity: 0.8
      }}>
        ({rating.totalRatings} {rating.totalRatings > 1 ? 'avis' : 'avis'})
      </span>
    </div>
  );
}

