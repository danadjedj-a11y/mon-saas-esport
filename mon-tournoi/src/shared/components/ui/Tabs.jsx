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
      container: 'border-b border-white/10',
      tab: 'px-6 py-3 font-body text-base transition-all duration-200 border-b-2 -mb-px',
      active: 'border-fluky-primary text-fluky-secondary',
      inactive: 'border-transparent text-fluky-text/60 hover:text-fluky-text hover:border-fluky-primary/50',
    },
    pills: {
      container: 'bg-black/30 p-1 rounded-lg',
      tab: 'px-4 py-2 font-body text-sm transition-all duration-200 rounded-md',
      active: 'bg-fluky-primary text-white',
      inactive: 'text-fluky-text/60 hover:text-fluky-text hover:bg-white/5',
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
              <span className="ml-2 px-2 py-0.5 bg-fluky-secondary text-white text-xs rounded-full">
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
