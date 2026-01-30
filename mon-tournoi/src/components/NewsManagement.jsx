import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from '../utils/toast';
import { Button, Input, Card, Badge, Modal, WYSIWYGEditor } from '../shared/components/ui';

export default function NewsManagement({ session }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    published: false,
  });

  // Convex queries and mutations
  const articles = useQuery(api.news.list) || [];
  const createArticle = useMutation(api.news.create);
  const updateArticle = useMutation(api.news.update);
  const deleteArticle = useMutation(api.news.delete);
  
  const loading = articles === undefined;

  const openNewArticleModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      imageUrl: '',
      published: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      imageUrl: article.imageUrl || '',
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
      imageUrl: '',
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
      if (editingArticle) {
        // Update existing article
        await updateArticle({
          articleId: editingArticle._id,
          title: formData.title.trim(),
          content: formData.content,
          imageUrl: formData.imageUrl.trim() || undefined,
          published: formData.published,
        });

        toast.success('Article mis à jour avec succès !');
      } else {
        // Create new article
        await createArticle({
          title: formData.title.trim(),
          content: formData.content,
          imageUrl: formData.imageUrl.trim() || undefined,
          published: formData.published,
          authorId: session.user.id,
        });

        toast.success('Article créé avec succès !');
      }

      closeModal();
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Erreur lors de la sauvegarde de l\'article');
    }
  };

  const handleDelete = async (articleId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      await deleteArticle({ articleId });
      toast.success('Article supprimé');
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePublished = async (article) => {
    try {
      const newPublishedState = !article.published;
      await updateArticle({
        articleId: article._id,
        published: newPublishedState,
      });

      toast.success(newPublishedState ? 'Article publié' : 'Article dépublié');
    } catch (error) {
      console.error('Error toggling published status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-6xl mb-4">⏳</div>
        <p className="text-white font-body">Chargement des articles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-3xl text-white">
          📰 Gestion des Actualités
        </h2>
        <Button onClick={openNewArticleModal} variant="primary">
          + Nouvel Article
        </Button>
      </div>

      {articles.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 font-body">Aucun article pour le moment</p>
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
                  <div classNam_id} className="bg-[#030913]/60 backdrop-blur-md border border-white/5">
              <div className="flex gap-4">
                {/* Image */}
                {article.imageUrl && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={article.imageUrl}
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
                      <h3 className="font-display text-xl text-white">
                        {article.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 font-body">
                        Créé le {new Date(article.createdAt).toLocaleDateString('fr-FR')}
                        {article.publishedAt && ` • Publié le ${new Date(article.publishedAt).toLocaleDateString('fr-FR')}`}
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
                    <Button size="sm" variant="outline" onClick={() => handleDelete(article._
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
            value={formData.imageUrl}
            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
          />

          <div>
            <label className="block mb-2 text-white font-body">Contenu de l'article</label>
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
            <label htmlFor="published" className="text-white font-body cursor-pointer">
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
