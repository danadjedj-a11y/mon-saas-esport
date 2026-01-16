import React, { useState } from 'react';
import StarRating from './StarRating';

/**
 * Formulaire d'ajout de commentaire
 */
export default function CommentForm({ onSubmit }) {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(content, rating);
      setContent('');
      setRating(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="mb-4">
        <label className="block mb-2 text-text font-heading">
          Votre note (optionnel)
        </label>
        <StarRating
          rating={rating}
          hoveredRating={hoveredRating}
          onRate={setRating}
          onHover={setHoveredRating}
          onLeave={() => setHoveredRating(0)}
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Partagez votre expérience..."
        rows={4}
        maxLength={1000}
        className="w-full p-3 bg-background/80 border-2 border-secondary text-text rounded-lg font-heading resize-y transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      />
      <div className="flex justify-between items-center mt-3">
        <span className="text-sm text-text/70 font-heading">
          {content.length}/1000 caractères
        </span>
        <button
          type="submit"
          className="bg-secondary text-text border-2 border-primary px-5 py-2.5 rounded-lg cursor-pointer font-body text-base transition-all duration-300 hover:bg-primary hover:-translate-y-0.5"
        >
          Publier
        </button>
      </div>
    </form>
  );
}
