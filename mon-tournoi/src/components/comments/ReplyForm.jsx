import React, { useState } from 'react';

/**
 * Formulaire de réponse à un commentaire
 */
export default function ReplyForm({ onSubmit }) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim() && onSubmit) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-primary/20">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Écrivez votre réponse..."
        rows={2}
        maxLength={500}
        className="w-full p-2.5 bg-background/80 border-2 border-secondary text-text rounded-lg font-heading mb-2.5 focus:border-primary focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="bg-secondary text-text border-2 border-primary px-4 py-2 rounded-lg cursor-pointer font-heading hover:bg-primary transition-colors"
      >
        Publier la réponse
      </button>
    </div>
  );
}
