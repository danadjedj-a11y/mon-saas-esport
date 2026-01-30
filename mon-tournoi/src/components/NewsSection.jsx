/**
 * NEWS SECTION - Version simplifiée (Migration)
 * 
 * Affiche un état vide pendant la migration vers Convex
 */

import { useState } from 'react';
import { Modal, Card, Badge } from '../shared/components/ui';

export default function NewsSection() {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Actualités mock pour la migration
  const articles = [
    {
      id: 1,
      title: "🚀 Migration vers Convex en cours !",
      content: "Nous migrons notre infrastructure vers Convex pour une meilleure performance et un temps réel amélioré. Restez à l'écoute !",
      published_at: new Date().toISOString(),
      image_url: null
    },
    {
      id: 2,
      title: "✨ Nouvelles fonctionnalités à venir",
      content: "Avec Convex, attendez-vous à des mises à jour en temps réel pour les matchs, les scores et le chat !",
      published_at: new Date().toISOString(),
      image_url: null
    }
  ];

  const openArticle = (article) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  const getExcerpt = (content, maxLength = 150) => {
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;
  };

  if (articles.length === 0) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-4xl mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            📰 Actualités
          </h2>
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl">Aucune actualité pour le moment</p>
            <p className="text-sm mt-2 text-gray-500">Revenez bientôt pour découvrir les dernières nouvelles !</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-12 bg-gradient-to-b from-transparent to-dark-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-4xl mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 drop-shadow-glow">
            📰 Actualités
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Card
                key={article.id}
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-glow-violet glass-card border-violet-500/20 overflow-hidden"
                onClick={() => openArticle(article)}
              >
                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display text-xl text-white mb-3 group-hover:text-violet-400 transition-colors">
                    {article.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {getExcerpt(article.content)}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(article.published_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>

                    <button className="text-cyan-400 text-sm hover:text-violet-400 transition-colors flex items-center gap-2">
                      Lire plus
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={selectedArticle.title}
          size="large"
        >
          <div className="space-y-6">
            {/* Content */}
            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
              <p>{selectedArticle.content}</p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
