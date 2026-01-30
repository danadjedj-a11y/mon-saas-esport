import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from '../utils/toast';

export default function TemplateSelector({ session, onSelectTemplate, currentValues }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  // Convex query for templates - gets public templates and user's own templates
  const templates = useQuery(
    api.templates.list,
    session?.user?.id ? { userId: session.user.id } : "skip"
  ) || [];
  
  const incrementUsage = useMutation(api.templates.incrementUsage);
  const loading = session?.user?.id && templates === undefined;

  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template._id);
    
    // Appliquer les valeurs du template
    const templateData = {
      name: currentValues?.name || '', // Garder le nom saisi par l'utilisateur
      game: template.game || currentValues?.game || '',
      format: template.format || currentValues?.format || 'elimination',
      maxParticipants: template.maxParticipants || currentValues?.maxParticipants || null,
      bestOf: template.bestOf || currentValues?.bestOf || 1,
      checkInWindowMinutes: template.checkInWindowMinutes || currentValues?.checkInWindowMinutes || 15,
      registrationDeadline: template.registrationDeadline || currentValues?.registrationDeadline || null,
      startDate: template.startDate || currentValues?.startDate || null,
      rules: template.rules || currentValues?.rules || '',
      prizePool: template.prizePool || currentValues?.prizePool || null,
      entryFee: template.entryFee || currentValues?.entryFee || null,
      mapsPool: template.mapsPool || currentValues?.mapsPool || null
    };

    onSelectTemplate(templateData);

    // Incrémenter le compteur d'utilisation
    if (template._id) {
      incrementUsage({ templateId: template._id })
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
            key={template._id}
            onClick={() => handleSelectTemplate(template)}
            style={{
              background: selectedTemplateId === template._id 
                ? 'rgba(139, 92, 246, 0.3)' 
                : 'rgba(3, 9, 19, 0.9)',
              padding: '15px',
              borderRadius: '10px',
              border: selectedTemplateId === template._id 
                ? '2px solid #06B6D4' 
                : '2px solid #8B5CF6',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedTemplateId !== template._id) {
                e.currentTarget.style.borderColor = '#06B6D4';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplateId !== template._id) {
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
              {template.isPublic && (
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
              {template.maxParticipants && <span>👥 {template.maxParticipants}</span>}
              {template.bestOf > 1 && <span>🎯 Bo{template.bestOf}</span>}
            </div>
            
            {template.usageCount > 0 && (
              <div style={{
                marginTop: '10px',
                fontSize: '0.7rem',
                color: '#FFFFFF',
                fontFamily: "'Protest Riot', sans-serif",
                opacity: 0.6
              }}>
                Utilisé {template.usageCount} fois
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

