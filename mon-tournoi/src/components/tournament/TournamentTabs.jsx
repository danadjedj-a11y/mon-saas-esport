export default function TournamentTabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex gap-3 mb-8 border-b-4 border-fluky-secondary overflow-x-auto pb-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`px-6 py-4 cursor-pointer text-base font-display transition-all duration-300 whitespace-nowrap rounded-t-lg uppercase tracking-wide ${
            activeTab === tab.id
              ? 'bg-fluky-primary text-white border-2 border-fluky-secondary border-b-4 border-b-fluky-secondary font-bold'
              : 'bg-transparent text-fluky-text border-2 border-transparent hover:bg-fluky-primary/30 hover:border-fluky-secondary'
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
