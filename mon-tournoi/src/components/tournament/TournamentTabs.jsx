import clsx from 'clsx';
import { GlassCard } from '../../shared/components/ui';

export default function TournamentTabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex justify-center mb-8">
      <GlassCard className="p-1.5 rounded-full inline-flex flex-wrap justify-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 relative overflow-hidden",
              activeTab === tab.id
                ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-violet-500/50 scale-105 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </GlassCard>
    </div>
  );
}

export const defaultTabs = [
  { id: 'overview', label: '📋 Présentation', icon: '📋' },
  { id: 'participants', label: '👥 Participants', icon: '👥' },
  { id: 'bracket', label: '🏆 Arbre', icon: '🏆' },
  { id: 'schedule', label: '📅 Planning', icon: '📅' },
  { id: 'results', label: '📊 Résultats', icon: '📊' },
  { id: 'comments', label: '💬 Social', icon: '💬' }
];
