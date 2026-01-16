export default function TournamentTabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex gap-3 mb-8 border-b-4 border-cyan-500 overflow-x-auto pb-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`px-6 py-4 cursor-pointer text-base font-display transition-all duration-300 whitespace-nowrap rounded-t-lg uppercase tracking-wide ${
            activeTab === tab.id
              ? 'bg-violet-600 text-white border-2 border-cyan-500 border-b-4 border-b-cyan-500 font-bold'
              : 'bg-transparent text-white border-2 border-transparent hover:bg-violet-500/30 hover:border-cyan-500'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export const defaultTabs = [
  { id: 'overview', label: '📋 Présentation', icon: '📋' },
  { id: 'participants', label: '👥 Participants', icon: '👥' },
  { id: 'bracket', label: '🏆 Arbre / Classement', icon: '🏆' },
  { id: 'schedule', label: '📅 Planning', icon: '📅' },
  { id: 'results', label: '📊 Résultats', icon: '📊' },
  { id: 'comments', label: '💬 Commentaires', icon: '💬' }
];
