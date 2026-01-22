import { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../../shared/components/ui';
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
      if (context.tournament.logo_url) {
        setLogoPreview(context.tournament.logo_url);
      }
      if (context.tournament.banner_url) {
        setBannerPreview(context.tournament.banner_url);
      }
      setLoading(false);
    } else {
      fetchTournament();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.tournament, tournamentId]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('logo_url, banner_url')
        .eq('id', tournamentId)
        .single();

      if (error) throw error;
      if (data.logo_url) setLogoPreview(data.logo_url);
      if (data.banner_url) setBannerPreview(data.banner_url);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const uploadFile = async (file, path) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tournamentId}/${path}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('tournament-assets')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('tournament-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = {};

      if (logoFile) {
        const logoUrl = await uploadFile(logoFile, 'logo');
        updates.logo_url = logoUrl;
      }

      if (bannerFile) {
        const bannerUrl = await uploadFile(bannerFile, 'banner');
        updates.banner_url = bannerUrl;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('tournaments')
          .update(updates)
          .eq('id', tournamentId);

        if (error) throw error;
        
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
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-display font-bold text-white">
          Apparence
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 space-y-8">
          
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
                <Button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="bg-cyan hover:bg-cyan/90 text-white"
                >
                  Choisir une image
                </Button>
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => bannerInputRef.current?.click()}
                  className="border border-white/20 text-gray-400 hover:text-white"
                >
                  Choisir une image
                </Button>
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
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            disabled={saving || (!logoFile && !bannerFile)}
            className="bg-cyan hover:bg-cyan/90 text-white px-6"
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
          </Button>
        </div>
      </form>
    </div>
  );
}
