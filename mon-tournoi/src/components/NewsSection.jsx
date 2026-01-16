import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Modal, Card, Badge } from '../shared/components/ui';
import { toast } from '../utils/toast';
import { sanitizeHTML, stripHTML } from '../utils/sanitize';

export default function NewsSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Erreur lors du chargement des actualités');
    } finally {
      setLoading(false);
    }
  };

  const openArticle = (article) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  const getExcerpt = (content, maxLength = 150) => {
    // Strip HTML tags safely using stripHTML utility
    const text = stripHTML(content);
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-4xl text-white mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            📰 Actualités
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="glass-card border-violet-500/30 p-6 animate-pulse"
              >
                <div className="h-48 bg-white/5 rounded-lg mb-4"></div>
                <div className="h-6 bg-white/5 rounded mb-2"></div>
                <div className="h-4 bg-white/5 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
                {/* Image */}
                {article.image_url && (
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300/1a1a1a/8B5CF6?text=News';
                      }}
                    />
                  </div>
                )}
                
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
                      {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR', {
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
            {/* Image */}
            {selectedArticle.image_url && (
              <div className="w-full max-h-96 overflow-hidden rounded-lg">
                <img
                  src={selectedArticle.image_url}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x400/1a1a1a/8B5CF6?text=News';
                  }}
                />
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-400 border-b border-violet-500/20 pb-4">
              <span>
                📅 {new Date(selectedArticle.published_at || selectedArticle.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            {/* Content */}
            <div 
              className="prose prose-invert max-w-none text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedArticle.content) }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
