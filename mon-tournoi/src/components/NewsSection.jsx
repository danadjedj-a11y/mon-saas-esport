import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Modal, Card, Badge } from '../shared/components/ui';
import { toast } from '../utils/toast';

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
    const div = document.createElement('div');
    div.innerHTML = content;
    const text = div.textContent || div.innerText || '';
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-4xl text-fluky-text mb-8 text-center">
            📰 Actualités
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="bg-[#030913]/60 backdrop-blur-md border border-white/5 rounded-lg p-6 animate-pulse"
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
          <h2 className="font-display text-4xl text-fluky-text mb-8 text-center">
            📰 Actualités
          </h2>
          <div className="text-center text-fluky-text/50 py-12">
            <p className="text-xl font-body">Aucune actualité pour le moment</p>
            <p className="text-sm mt-2 font-body">Revenez bientôt pour découvrir les dernières nouvelles !</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-12 bg-gradient-to-b from-transparent to-[#030913]/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-4xl text-fluky-text mb-8 text-center"
              style={{ textShadow: '0 0 20px rgba(193, 4, 104, 0.5)' }}>
            📰 Actualités
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Card 
                key={article.id}
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fluky-primary/20 bg-[#030913]/60 backdrop-blur-md border border-white/5 overflow-hidden"
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
                        e.target.src = 'https://via.placeholder.com/400x300/1a1a1a/FF36A3?text=News';
                      }}
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display text-xl text-fluky-text mb-3 group-hover:text-fluky-secondary transition-colors">
                    {article.title}
                  </h3>
                  
                  <p className="text-fluky-text/70 text-sm mb-4 font-body line-clamp-3">
                    {getExcerpt(article.content)}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-fluky-text/50 font-body">
                      {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    
                    <button className="text-fluky-secondary text-sm font-body hover:text-fluky-primary transition-colors flex items-center gap-2">
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
                    e.target.src = 'https://via.placeholder.com/800x400/1a1a1a/FF36A3?text=News';
                  }}
                />
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-fluky-text/70 border-b border-white/10 pb-4">
              <span className="font-body">
                📅 {new Date(selectedArticle.published_at || selectedArticle.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            {/* Content */}
            <div 
              className="prose prose-invert max-w-none text-fluky-text font-body"
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              style={{
                lineHeight: '1.8',
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
