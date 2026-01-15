import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from '../utils/toast';
import { Button, Input, Card, Badge, Modal, WYSIWYGEditor } from '../shared/components/ui';

export default function NewsManagement({ session }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    published: false,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const openNewArticleModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      image_url: '',
      published: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      image_url: article.image_url || '',
      published: article.published,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      image_url: '',
      published: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Le titre et le contenu sont requis');
      return;
    }

    try {
      const articleData = {
        title: formData.title.trim(),
        content: formData.content,
        image_url: formData.image_url.trim() || null,
        published: formData.published,
        published_at: formData.published && !editingArticle?.published ? new Date().toISOString() : editingArticle?.published_at,
      };

      if (editingArticle) {
        // Update existing article
        const { error } = await supabase
          .from('news_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast.success('Article mis à jour avec succès !');
      } else {
        // Create new article
        const { error } = await supabase
          .from('news_articles')
          .insert([{
            ...articleData,
            author_id: session.user.id,
          }]);

        if (error) throw error;
        toast.success('Article créé avec succès !');
      }

      closeModal();
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Erreur lors de la sauvegarde de l\'article');
    }
  };

  const handleDelete = async (articleId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase
        .from('news_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      toast.success('Article supprimé');
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePublished = async (article) => {
    try {
      const newPublishedState = !article.published;
      const { error } = await supabase
        .from('news_articles')
        .update({
          published: newPublishedState,
          published_at: newPublishedState && !article.published_at ? new Date().toISOString() : article.published_at,
        })
        .eq('id', article.id);

      if (error) throw error;
      toast.success(newPublishedState ? 'Article publié' : 'Article dépublié');
      fetchArticles();
    } catch (error) {
      console.error('Error toggling published status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-6xl mb-4">⏳</div>
        <p className="text-fluky-text font-body">Chargement des articles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-3xl text-fluky-text">
          📰 Gestion des Actualités
        </h2>
        <Button onClick={openNewArticleModal} variant="primary">
          + Nouvel Article
        </Button>
      </div>

      {articles.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-fluky-text/50 font-body">Aucun article pour le moment</p>
          <Button onClick={openNewArticleModal} variant="secondary" className="mt-4">
            Créer votre premier article
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {articles.map(article => (
            <Card key={article.id} className="bg-[#030913]/60 backdrop-blur-md border border-white/5">
              <div className="flex gap-4">
                {/* Image */}
                {article.image_url && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display text-xl text-fluky-text">
                        {article.title}
                      </h3>
                      <p className="text-xs text-fluky-text/50 mt-1 font-body">
                        Créé le {new Date(article.created_at).toLocaleDateString('fr-FR')}
                        {article.published_at && ` • Publié le ${new Date(article.published_at).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    <Badge className={
                      article.published 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }>
                      {article.published ? '✓ Publié' : 'Brouillon'}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(article)}>
                      ✏️ Modifier
                    </Button>
                    <Button 
                      size="sm" 
                      variant={article.published ? 'outline' : 'primary'}
                      onClick={() => togglePublished(article)}
                    >
                      {article.published ? '📦 Dépublier' : '🚀 Publier'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(article.id)}>
                      🗑️ Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingArticle ? 'Modifier l\'article' : 'Nouvel Article'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Titre de l'article"
            type="text"
            placeholder="Ex: Nouvelle saison de tournois !"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            required
            maxLength={255}
          />

          <Input
            label="URL de l'image (optionnel)"
            type="url"
            placeholder="https://exemple.com/image.jpg"
            value={formData.image_url}
            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
          />

          <div>
            <label className="block mb-2 text-fluky-text font-body">Contenu de l'article</label>
            <WYSIWYGEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Rédigez votre article..."
              minHeight="300px"
              maxHeight="500px"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={e => setFormData({ ...formData, published: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="published" className="text-fluky-text font-body cursor-pointer">
              Publier immédiatement
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              {editingArticle ? 'Mettre à jour' : 'Créer l\'article'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
