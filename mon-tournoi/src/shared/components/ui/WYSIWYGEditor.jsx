import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Simple WYSIWYG Editor Component
 * Provides basic rich text editing capabilities without external dependencies
 */
export default function WYSIWYGEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Commencez à écrire...', 
  minHeight = '200px',
  maxHeight = '600px',
  className = '' 
}) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt('Entrez l\'URL du lien:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  const toolbarButtons = [
    { command: 'bold', icon: '𝐁', title: 'Gras (Ctrl+B)' },
    { command: 'italic', icon: '𝐼', title: 'Italique (Ctrl+I)' },
    { command: 'underline', icon: 'U̲', title: 'Souligné (Ctrl+U)' },
    { command: 'strikeThrough', icon: 'S̶', title: 'Barré' },
    { type: 'separator' },
    { command: 'insertUnorderedList', icon: '• Liste', title: 'Liste à puces' },
    { command: 'insertOrderedList', icon: '1. Liste', title: 'Liste numérotée' },
    { type: 'separator' },
    { command: 'justifyLeft', icon: '≡', title: 'Aligner à gauche' },
    { command: 'justifyCenter', icon: '≣', title: 'Centrer' },
    { command: 'justifyRight', icon: '≡', title: 'Aligner à droite' },
    { type: 'separator' },
    { command: 'link', icon: '🔗', title: 'Insérer un lien', onClick: insertLink },
    { command: 'removeFormat', icon: '✕', title: 'Supprimer la mise en forme' },
  ];

  return (
    <div className={`wysiwyg-editor ${className}`}>
      {/* Toolbar */}
      <div className="toolbar bg-[#1a1a1a] border border-white/10 rounded-t-lg p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((button, index) => {
          if (button.type === 'separator') {
            return (
              <div 
                key={`sep-${index}`} 
                className="w-px h-6 bg-white/20 mx-1"
              />
            );
          }
          
          return (
            <button
              key={button.command}
              type="button"
              onClick={() => button.onClick ? button.onClick() : execCommand(button.command)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-fluky-text rounded transition-colors duration-200 text-sm font-body border border-white/5 hover:border-white/20"
              title={button.title}
            >
              {button.icon}
            </button>
          );
        })}
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          editor-content bg-[#030913] text-fluky-text p-4 
          border border-white/10 border-t-0 rounded-b-lg
          focus:outline-none focus:border-fluky-primary/50
          overflow-y-auto font-body
          ${isFocused ? 'border-fluky-primary/50' : ''}
        `}
        style={{
          minHeight,
          maxHeight,
        }}
        data-placeholder={placeholder}
      />

      <style>{`
        .wysiwyg-editor .editor-content:empty:before {
          content: attr(data-placeholder);
          color: rgba(248, 246, 242, 0.3);
          pointer-events: none;
        }
        
        .wysiwyg-editor .editor-content a {
          color: #FF36A3;
          text-decoration: underline;
        }
        
        .wysiwyg-editor .editor-content ul,
        .wysiwyg-editor .editor-content ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .wysiwyg-editor .editor-content li {
          margin-bottom: 0.25rem;
        }
        
        .wysiwyg-editor .editor-content p {
          margin-bottom: 0.5rem;
        }
        
        .wysiwyg-editor .editor-content strong {
          font-weight: bold;
        }
        
        .wysiwyg-editor .editor-content em {
          font-style: italic;
        }
        
        .wysiwyg-editor .editor-content u {
          text-decoration: underline;
        }
        
        .wysiwyg-editor .editor-content h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        .wysiwyg-editor .editor-content h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.75rem;
        }
        
        .wysiwyg-editor .editor-content h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
