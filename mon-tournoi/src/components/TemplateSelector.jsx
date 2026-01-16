import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';

export default function TemplateSelector({ session, onSelectTemplate, currentValues }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchTemplates = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer les templates publics et ceux de l'utilisateur
      const { data, error } = await supabase
        .from('tournament_templates')
        .select('*')
        .or(`is_public.eq.true,owner_id.eq.${session.user.id}`)
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
    } catch (err) {
      console.error('Erreur chargement templates:', err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    
    // Appliquer les valeurs du template
    const templateData = {
      name: currentValues?.name || '', // Garder le nom saisi par l'utilisateur
      game: template.game || currentValues?.game || '',
      format: template.format || currentValues?.format || 'elimination',
      max_participants: template.max_participants || currentValues?.max_participants || null,
      best_of: template.best_of || currentValues?.best_of || 1,
      check_in_window_minutes: template.check_in_window_minutes || currentValues?.check_in_window_minutes || 15,
      registration_deadline: template.registration_deadline || currentValues?.registration_deadline || null,
      start_date: template.start_date || currentValues?.start_date || null,
      rules: template.rules || currentValues?.rules || '',
      prize_pool: template.prize_pool || currentValues?.prize_pool || null,
      entry_fee: template.entry_fee || currentValues?.entry_fee || null,
      maps_pool: template.maps_pool || currentValues?.maps_pool || null
    };

    onSelectTemplate(templateData);

    // Incrémenter le compteur d'utilisation
    if (template.id) {
      supabase.rpc('increment_template_usage', { p_template_id: template.id })
        .catch(err => console.error('Erreur incrémentation usage:', err));
    }

    toast.success(`Template "${template.name}" appliqué !`);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#FFFFFF',
        fontFamily: "'Protest Riot', sans-serif"
      }}>
        Chargement des templates...
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#FFFFFF',
        fontFamily: "'Protest Riot', sans-serif"
      }}>
        Aucun template disponible
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(3, 9, 19, 0.8)',
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid #8B5CF6',
      marginBottom: '20px'
    }}>
      <h3 style={{
        margin: '0 0 15px 0',
        color: '#06B6D4',
        fontFamily: "'Shadows Into Light', cursive",
        fontSize: '1.3rem'
      }}>
        📋 Templates de Tournois
      </h3>
      <p style={{
        margin: '0 0 15px 0',
        color: '#FFFFFF',
        fontSize: '0.9rem',
        fontFamily: "'Protest Riot', sans-serif"
      }}>
        Sélectionnez un template pour pré-remplir le formulaire
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            style={{
              background: selectedTemplateId === template.id 
                ? 'rgba(139, 92, 246, 0.3)' 
                : 'rgba(3, 9, 19, 0.9)',
              padding: '15px',
              borderRadius: '10px',
              border: selectedTemplateId === template.id 
                ? '2px solid #06B6D4' 
                : '2px solid #8B5CF6',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedTemplateId !== template.id) {
                e.currentTarget.style.borderColor = '#06B6D4';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplateId !== template.id) {
                e.currentTarget.style.borderColor = '#8B5CF6';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'start',
              marginBottom: '10px'
            }}>
              <h4 style={{
                margin: 0,
                color: '#FFFFFF',
                fontFamily: "'Shadows Into Light', cursive",
                fontSize: '1.1rem',
                flex: 1
              }}>
                {template.name}
              </h4>
              {template.is_public && (
                <span style={{
                  fontSize: '0.7rem',
                  color: '#06B6D4',
                  marginLeft: '10px'
                }}>
                  🌐
                </span>
              )}
            </div>
            
            {template.description && (
              <p style={{
                margin: '0 0 10px 0',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontFamily: "'Protest Riot', sans-serif",
                opacity: 0.8
              }}>
                {template.description}
              </p>
            )}
            
            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              fontSize: '0.75rem',
              color: '#06B6D4',
              fontFamily: "'Protest Riot', sans-serif"
            }}>
              {template.game && <span>🎮 {template.game}</span>}
              {template.format && <span>📊 {template.format}</span>}
              {template.max_participants && <span>👥 {template.max_participants}</span>}
              {template.best_of > 1 && <span>🎯 Bo{template.best_of}</span>}
            </div>
            
            {template.usage_count > 0 && (
              <div style={{
                marginTop: '10px',
                fontSize: '0.7rem',
                color: '#FFFFFF',
                fontFamily: "'Protest Riot', sans-serif",
                opacity: 0.6
              }}>
                Utilisé {template.usage_count} fois
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

