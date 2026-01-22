import { useState } from 'react';
import clsx from 'clsx';

/**
 * Composant Tabs réutilisable
 * 
 * Usage:
 * <Tabs tabs={[{ id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> }]} />
 */
const Tabs = ({
  tabs,
  defaultTab,
  onChange,
  variant = 'default',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  const tabStyles = {
    default: {
      container: 'border-b border-white/10 overflow-visible',
      tab: 'px-6 py-3 font-body text-base transition-all duration-200 border-b-2 relative top-[1px]',
      active: 'border-violet-500 text-cyan-400 bg-transparent',
      inactive: 'border-transparent text-gray-400 hover:text-white hover:border-violet-500/50 bg-transparent',
    },
    pills: {
      container: 'bg-black/30 p-1 rounded-lg',
      tab: 'px-4 py-2 font-body text-sm transition-all duration-200 rounded-md',
      active: 'bg-violet-600 text-white',
      inactive: 'text-gray-400 hover:text-white hover:bg-white/5',
    },
  };

  const styles = tabStyles[variant] || tabStyles.default;

  return (
    <div className={className}>
      {/* Tabs Header */}
      <div className={clsx('flex gap-2', styles.container)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={clsx(
              styles.tab,
              activeTab === tab.id ? styles.active : styles.inactive,
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className="ml-2 px-2 py-0.5 bg-cyan-600 text-white text-xs rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabs Content */}
      <div className="mt-6">
        {activeTabData?.content}
      </div>
    </div>
  );
};

export default Tabs;
