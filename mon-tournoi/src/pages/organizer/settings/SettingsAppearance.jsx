import { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { GradientButton, Input, Select, Modal, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function SettingsAppearance() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (context?.tournament) {
      if (context.tournament.logoUrl) {
        setLogoPreview(context.tournament.logoUrl);
      }
      if (context.tournament.bannerUrl) {
        setBannerPreview(context.tournament.bannerUrl);
      }
      setLoading(false);
    }
  }, [context?.tournament]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Le logo ne doit pas dépasser 2MB');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error('Format accepté : PNG ou JPG');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'arrière-plan ne doit pas dépasser 5MB");
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error('Format accepté : PNG ou JPG');
        return;
      }
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const updateTournament = useMutation(api.tournamentsMutations.update);

  // Note: File upload to Convex storage would need to be implemented
  // For now, we'll use URL-based approach or external storage
  const uploadFile = async (file, path) => {
    // TODO: Implement Convex file storage or use external service
    // For now, return a placeholder or use an external upload service
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = {};

      if (logoFile) {
        const logoUrl = await uploadFile(logoFile, 'logo');
        updates.logoUrl = logoUrl;
      }

      if (bannerFile) {
        const bannerUrl = await uploadFile(bannerFile, 'banner');
        updates.bannerUrl = bannerUrl;
      }

      if (Object.keys(updates).length > 0) {
        await updateTournament({
          tournamentId: context?.tournament?._id,
          ...updates,
        });

        if (context?.refreshTournament) {
          context.refreshTournament();
        }

        toast.success('Apparence mise à jour');
        setLogoFile(null);
        setBannerFile(null);
      } else {
        toast.info('Aucune modification à sauvegarder');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader
        title="Apparence"
        subtitle="Personnalisez le logo et l'arrière-plan de votre tournoi"
        gradient={true}
      />

      <form onSubmit={handleSubmit}>
        <GlassCard className="p-6 space-y-8">

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Logo
              <span className="text-gray-500 text-xs ml-2">(Min. 256x256px, PNG ou JPG)</span>
            </label>

            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-[#1a1d2e] border border-white/10">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <GradientButton
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  variant="primary"
                >
                  Choisir une image
                </GradientButton>
              </div>
            </div>
          </div>

          {/* Banner / Arrière-plan */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Arrière-plan
              <span className="text-gray-500 text-xs ml-2">(Upgrade de tournoi nécessaire)</span>
            </label>

            <div className="space-y-3">
              {bannerPreview && (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-[#1a1d2e] border border-white/10">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleBannerChange}
                  className="hidden"
                />
                <GradientButton
                  type="button"
                  variant="secondary"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  Choisir une image
                </GradientButton>
              </div>
            </div>
          </div>

          {/* Couleurs (premium) */}
          <div className="opacity-50">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Couleurs personnalisées
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                Premium
              </span>
            </label>
            <p className="text-gray-500 text-sm">
              Personnalisez les couleurs de votre page tournoi avec un abonnement premium.
            </p>
          </div>
        </GlassCard>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <GradientButton
            type="submit"
            disabled={saving || (!logoFile && !bannerFile)}
            variant="primary"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Sauvegarde...
              </>
            ) : (
              <>
                <span className="mr-2">✏️</span>
                Mettre à jour
              </>
            )}
          </GradientButton>
        </div>
      </form>
    </div>
  );
}
