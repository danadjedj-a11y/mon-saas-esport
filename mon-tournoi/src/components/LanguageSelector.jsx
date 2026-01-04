import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: '2px solid #FF36A3',
          color: '#F8F6F2',
          padding: '8px 15px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: "'Protest Riot', sans-serif",
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(193, 4, 104, 0.3)';
          e.currentTarget.style.borderColor = '#C10468';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#FF36A3';
        }}
      >
        <span>{currentLanguage.flag}</span>
        <span>{currentLanguage.name}</span>
        <span style={{ fontSize: '0.7rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '10px',
            background: 'rgba(3, 9, 19, 0.95)',
            border: '2px solid #FF36A3',
            borderRadius: '8px',
            padding: '10px 0',
            minWidth: '150px',
            boxShadow: '0 8px 24px rgba(193, 4, 104, 0.4)',
            zIndex: 1000
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              style={{
                width: '100%',
                background: i18n.language === lang.code ? 'rgba(193, 4, 104, 0.3)' : 'transparent',
                border: 'none',
                color: '#F8F6F2',
                padding: '10px 20px',
                cursor: 'pointer',
                fontFamily: "'Protest Riot', sans-serif",
                fontSize: '0.9rem',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (i18n.language !== lang.code) {
                  e.currentTarget.style.background = 'rgba(255, 54, 163, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (i18n.language !== lang.code) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {i18n.language === lang.code && (
                <span style={{ marginLeft: 'auto', color: '#FF36A3' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fermer le dropdown si on clique en dehors */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

