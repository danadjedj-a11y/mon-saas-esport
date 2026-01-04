import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getBadgeRarityColor, getRarityLabel, getCategoryLabel } from '../utils/badges';

export default function BadgeDisplay({ userId, session, compact = false }) {
  const [badges, setBadges] = useState([]);
  const [userLevel, setUserLevel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchBadges();
      fetchUserLevel();
    }
  }, [userId]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      setBadges(data || []);
    } catch (err) {
      console.error('Erreur chargement badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLevel = async () => {
    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserLevel(data || { level: 1, xp: 0, total_xp: 0 });
    } catch (err) {
      console.error('Erreur chargement niveau:', err);
      setUserLevel({ level: 1, xp: 0, total_xp: 0 });
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#F8F6F2',
        fontFamily: "'Protest Riot', sans-serif"
      }}>
        Chargement...
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {userLevel && (
          <div style={{
            background: 'rgba(3, 9, 19, 0.8)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '2px solid #FF36A3',
            fontFamily: "'Shadows Into Light', cursive",
            color: '#FF36A3',
            fontSize: '0.9rem'
          }}>
            Niveau {userLevel.level}
          </div>
        )}
        {badges.slice(0, 5).map((ub) => (
          <div
            key={ub.id}
            title={`${ub.badges.name} - ${ub.badges.description}`}
            style={{
              fontSize: '1.5rem',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {ub.badges.icon}
          </div>
        ))}
        {badges.length > 5 && (
          <span style={{
            color: '#FF36A3',
            fontFamily: "'Protest Riot', sans-serif",
            fontSize: '0.85rem'
          }}>
            +{badges.length - 5}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(3, 9, 19, 0.95)',
      padding: '30px',
      borderRadius: '15px',
      border: '2px solid #FF36A3',
      boxShadow: '0 4px 12px rgba(193, 4, 104, 0.3)'
    }}>
      {/* Niveau et XP */}
      {userLevel && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#FF36A3',
            fontFamily: "'Shadows Into Light', cursive",
            fontSize: '1.5rem'
          }}>
            Niveau {userLevel.level}
          </h3>
          <div style={{
            background: 'rgba(3, 9, 19, 0.8)',
            padding: '15px',
            borderRadius: '10px',
            border: '2px solid #C10468'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontFamily: "'Protest Riot', sans-serif",
              color: '#F8F6F2'
            }}>
              <span>XP Total: {userLevel.total_xp}</span>
              <span>XP Actuel: {userLevel.xp}</span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: 'rgba(3, 9, 19, 0.5)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #FF36A3'
            }}>
              <div style={{
              width: `${Math.min(100, (userLevel.xp / (Math.pow(userLevel.level, 2) * 100 - Math.pow(userLevel.level - 1, 2) * 100)) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #C10468, #FF36A3)',
              transition: 'width 0.3s'
            }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des badges */}
      <h3 style={{
        margin: '0 0 20px 0',
        color: '#FF36A3',
        fontFamily: "'Shadows Into Light', cursive",
        fontSize: '1.5rem'
      }}>
        Badges ({badges.length})
      </h3>

      {badges.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {badges.map((ub) => {
            const badge = ub.badges;
            const rarityColor = getBadgeRarityColor(badge.rarity);
            
            return (
              <div
                key={ub.id}
                style={{
                  background: 'rgba(3, 9, 19, 0.8)',
                  padding: '15px',
                  borderRadius: '10px',
                  border: `2px solid ${rarityColor}`,
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${rarityColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                  {badge.icon}
                </div>
                <h4 style={{
                  margin: '0 0 5px 0',
                  color: '#F8F6F2',
                  fontFamily: "'Shadows Into Light', cursive",
                  fontSize: '1.1rem'
                }}>
                  {badge.name}
                </h4>
                <p style={{
                  margin: '0 0 10px 0',
                  color: '#F8F6F2',
                  fontSize: '0.85rem',
                  fontFamily: "'Protest Riot', sans-serif",
                  opacity: 0.8
                }}>
                  {badge.description}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '0.75rem',
                  fontFamily: "'Protest Riot', sans-serif"
                }}>
                  <span style={{ color: rarityColor }}>
                    {getRarityLabel(badge.rarity)}
                  </span>
                  <span style={{ color: '#FF36A3' }}>
                    {getCategoryLabel(badge.category)}
                  </span>
                </div>
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.7rem',
                  color: '#F8F6F2',
                  fontFamily: "'Protest Riot', sans-serif",
                  opacity: 0.6
                }}>
                  Obtenu le {new Date(ub.earned_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#F8F6F2',
          fontFamily: "'Protest Riot', sans-serif"
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎯</div>
          <p>Aucun badge obtenu pour le moment</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '5px' }}>
            Participez à des tournois pour débloquer vos premiers badges !
          </p>
        </div>
      )}
    </div>
  );
}

