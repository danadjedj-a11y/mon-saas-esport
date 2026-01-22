import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { toast } from '../../../utils/toast';

const WIDGET_TYPES = [
  {
    id: 'tournament',
    name: 'Widget de Tournoi',
    description: 'Affichez le résumé de votre tournoi: informations, inscriptions, matchs.',
    icon: '🏆',
  },
  {
    id: 'calendar',
    name: 'Widget de Calendrier',
    description: 'Affichez les matchs de votre tournoi avec leur date et heure avec ce widget.',
    icon: '📅',
  },
  {
    id: 'phase',
    name: 'Widget de Phase',
    description: 'Arbre, groupes: affichez une phase de votre tournoi avec ce widget.',
    icon: '🏗️',
  },
  {
    id: 'registration',
    name: "Widget d'Inscription",
    description: "Bouton intelligent pour votre site, passerelle vers le processus d'inscription.",
    icon: '📝',
  },
];

export default function Widgets() {
  const { id: tournamentId } = useParams();
  const _context = useOutletContext();
  const _tournament = _context?.tournament;

  const [selectedWidget, setSelectedWidget] = useState(null);
  const [embedCode, setEmbedCode] = useState('');

  const generateEmbedCode = (widgetType) => {
    const baseUrl = window.location.origin;
    
    switch (widgetType) {
      case 'tournament':
        return `<iframe src="${baseUrl}/embed/tournament/${tournamentId}" width="100%" height="600" frameborder="0"></iframe>`;
      case 'calendar':
        return `<iframe src="${baseUrl}/embed/tournament/${tournamentId}/calendar" width="100%" height="400" frameborder="0"></iframe>`;
      case 'phase':
        return `<iframe src="${baseUrl}/embed/tournament/${tournamentId}/bracket" width="100%" height="800" frameborder="0"></iframe>`;
      case 'registration':
        return `<a href="${baseUrl}/tournament/${tournamentId}/register" class="tournament-register-btn">S'inscrire au tournoi</a>`;
      default:
        return '';
    }
  };

  const handleSelectWidget = (widget) => {
    setSelectedWidget(widget);
    setEmbedCode(generateEmbedCode(widget.id));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Code copié dans le presse-papier');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-display font-bold text-white mb-6">
        Widgets
      </h1>

      {/* Widget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {WIDGET_TYPES.map((widget) => (
          <div
            key={widget.id}
            onClick={() => handleSelectWidget(widget)}
            className={`bg-[#2a2d3e] rounded-xl border p-6 cursor-pointer transition-all ${
              selectedWidget?.id === widget.id
                ? 'border-cyan bg-cyan/5'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-[#1a1d2e] rounded-xl flex items-center justify-center">
                <span className="text-4xl opacity-60">{widget.icon}</span>
              </div>
            </div>

            {/* Info */}
            <h3 className="text-center font-semibold text-white mb-2">
              {widget.name}
            </h3>
            <p className="text-center text-sm text-cyan">
              {widget.description}
            </p>
          </div>
        ))}
      </div>

      {/* Embed Code Section */}
      {selectedWidget && (
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Code d'intégration - {selectedWidget.name}
          </h2>

          <div className="bg-[#1a1d2e] rounded-lg p-4 font-mono text-sm text-gray-300 mb-4 overflow-x-auto">
            <code>{embedCode}</code>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-cyan hover:bg-cyan/90 text-white rounded-lg transition-colors"
            >
              📋 Copier le code
            </button>
            <button
              onClick={() => toast.info('Aperçu bientôt disponible')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              👁️ Aperçu
            </button>
          </div>

          {/* Preview Area */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Aperçu</h3>
            <div className="bg-[#1a1d2e] rounded-lg p-4 min-h-[200px] flex items-center justify-center">
              <p className="text-gray-500">
                L'aperçu du widget sera affiché ici
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
