import React from 'react';

/**
 * Carte de statistique réutilisable pour le panneau admin
 * @param {string} title - Titre de la statistique
 * @param {string|number} value - Valeur principale
 * @param {string} subtitle - Sous-titre optionnel
 * @param {string} gradient - Gradient CSS (ex: 'linear-gradient(135deg, #3498db, #2980b9)')
 * @param {string} borderColor - Couleur de bordure
 * @param {boolean} isAlert - Si true, utilise un style d'alerte
 */
export default function AdminStatCard({ 
  title, 
  value, 
  subtitle, 
  gradient,
  borderColor,
  isAlert = false 
}) {
  const baseClasses = "p-5 rounded-lg";
  
  const cardClasses = gradient 
    ? baseClasses
    : `${baseClasses} ${isAlert ? 'bg-red-900/30 border border-red-500' : 'bg-neutral-800 border border-neutral-700'}`;

  const cardStyle = gradient ? {
    background: gradient,
    border: `1px solid ${borderColor || 'transparent'}`,
  } : undefined;

  return (
    <div className={cardClasses} style={cardStyle}>
      <div className={`text-sm mb-2 ${gradient ? 'text-white/80 font-bold' : 'text-neutral-400'}`}>
        {title}
      </div>
      <div className={`text-4xl font-bold ${isAlert ? 'text-red-500' : (gradient ? 'text-white' : 'text-blue-400')}`}>
        {value}
      </div>
      {subtitle && (
        <div className={`text-sm mt-2 ${gradient ? 'text-white/90' : (isAlert ? 'text-red-500' : 'text-green-400')}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
