import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { GradientButton, Input, Select, Modal, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

const FIELD_TYPES = [
  { id: 'address', icon: '📍', label: 'Adresse', type: 'text' },
  { id: 'checkbox', icon: '☑️', label: 'Case à cocher', type: 'checkbox' },
  { id: 'birthdate', icon: '👤', label: 'Date de naissance', type: 'date' },
  { id: 'discord', icon: '💬', label: 'Discord ID', type: 'text' },
  { id: 'fullname', icon: '🪪', label: 'Nom complet', type: 'text' },
  { id: 'optin', icon: '📝', label: 'Opt-in', type: 'checkbox' },
  { id: 'country', icon: '🌍', label: 'Pays', type: 'select' },
  { id: 'text', icon: '📝', label: 'Texte libre', type: 'text' },
  { id: 'url', icon: '🔗', label: 'URL', type: 'url' },
  { id: 'number', icon: '🔢', label: 'Nombre', type: 'number' },
];

export default function SettingsCustomFields() {
  const { id: tournamentId } = useParams();
  const [activeTab, setActiveTab] = useState('team');
  const [fields, setFields] = useState({ team: [], player: [] });
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [newField, setNewField] = useState({
    field_name: '',
    field_type: '',
    required: false,
    target: 'team',
  });

  useEffect(() => {
    // TODO: Implement Convex query for tournament_custom_fields when table is added
    // For now, just set loading to false
    setLoading(false);
  }, [tournamentId]);

  // Note: tournament_custom_fields table needs to be added to Convex schema

  const handleSelectType = (fieldType) => {
    setNewField({
      field_name: fieldType.label,
      field_type: fieldType.type,
      field_preset: fieldType.id,
      required: false,
      target: activeTab,
    });
    setShowTypeSelector(false);
    setShowFieldModal(true);
  };

  const handleSaveField = async () => {
    if (!newField.field_name.trim()) {
      toast.error('Le nom du champ est requis');
      return;
    }

    try {
      // TODO: Implement Convex mutation for tournament_custom_fields
      // This requires adding tournament_custom_fields table to Convex schema
      toast.info('Fonctionnalité en cours de migration vers Convex');
      setShowFieldModal(false);
      setEditingField(null);
      setNewField({ field_name: '', field_type: '', required: false, target: 'team' });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!confirm('Supprimer ce champ personnalisé ?')) return;

    try {
      // TODO: Implement Convex mutation for deleting tournament_custom_fields
      toast.info('Fonctionnalité en cours de migration vers Convex');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setNewField({
      field_name: field.field_name,
      field_type: field.field_type,
      required: field.required,
      target: field.target || 'team',
    });
    setShowFieldModal(true);
  };

  const tabs = [
    { id: 'team', label: "Champs d'équipe" },
    { id: 'player', label: 'Champs de joueur' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader
        title="Champs personnalisés"
        subtitle="Créez des champs personnalisés pour votre tournoi"
        gradient={true}
      />

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-8 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors relative ${activeTab === tab.id
              ? 'text-cyan'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <GlassCard className="p-6">
        {/* Info box */}
        <div variant="primary">
          <p className="text-sm text-gray-300">
            Les <strong>champs personnalisés</strong> vous permettent d'obtenir davantage d'informations
            sur vos participants, telles que l'id en jeu, les informations personnelles, etc.
            Consultez le <span className="text-cyan cursor-pointer">guide des champs personnalisés</span> pour plus d'informations.
          </p>
        </div>

        {/* Liste des champs */}
        {fields[activeTab].length > 0 ? (
          <div className="space-y-3 mb-6">
            {fields[activeTab].map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between bg-[#1a1d2e] rounded-lg p-4 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {FIELD_TYPES.find(t => t.type === field.field_type)?.icon || '📝'}
                  </span>
                  <div>
                    <p className="font-medium text-white">{field.field_name}</p>
                    <p className="text-sm text-gray-500">
                      {field.field_type}
                      {field.required && ' • Requis'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditField(field)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Aucun champ personnalisé défini pour les {activeTab === 'team' ? 'équipes' : 'joueurs'}.
          </p>
        )}

        {/* Add button */}
        <div className="flex justify-end">
          <GradientButton
            onClick={() => setShowTypeSelector(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            + Ajouter
          </GradientButton>
        </div>
      </GlassCard>

      {/* Type Selector Modal */}
      <Modal
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        title="Choisir le Type de Champ Personnalisé"
        size="lg"
      >
        <div className="p-4">
          {/* Warning box */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-yellow-400 mb-2">
              ⚠️ À propos des "Champs Personnalisés"
            </h4>
            <p className="text-sm text-gray-300">
              Vous pouvez choisir d'ajouter des "custom fields" obligatoires ou facultatifs
              qui seront à renseigner par les participants au moment de l'inscription au tournoi.
              Conformément à la législation applicable et à notre Politique de protection des données,
              vous êtes autorisé à ne collecter que les données personnelles qui sont strictement
              nécessaires au bon déroulement du tournoi.
            </p>
          </div>

          {/* Type grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {FIELD_TYPES.map((fieldType) => (
              <button
                key={fieldType.id}
                onClick={() => handleSelectType(fieldType)}
                className="flex flex-col items-center gap-2 p-4 bg-[#1a1d2e] hover:bg-white/5 
                           rounded-xl border border-white/10 hover:border-cyan/50 transition-all"
              >
                <span className="text-3xl">{fieldType.icon}</span>
                <span className="text-sm text-gray-300 text-center">{fieldType.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Field Edit Modal */}
      <Modal
        isOpen={showFieldModal}
        onClose={() => {
          setShowFieldModal(false);
          setEditingField(null);
        }}
        title={editingField ? 'Modifier le champ' : 'Nouveau champ personnalisé'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom du champ
            </label>
            <Input
              value={newField.field_name}
              onChange={(e) => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
              placeholder="Ex: Pseudo in-game"
              className="bg-[#1a1d2e] border-white/10"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newField.required}
                onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                className="w-4 h-4 accent-cyan rounded"
              />
              <span className="text-white">Champ obligatoire</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <GradientButton
              variant="ghost"
              onClick={() => {
                setShowFieldModal(false);
                setEditingField(null);
              }}
            >
              Annuler
            </GradientButton>
            <GradientButton
              onClick={handleSaveField}
              variant="primary"
            >
              {editingField ? 'Modifier' : 'Ajouter'}
            </GradientButton>
          </div>
        </div>
      </Modal>
    </div >
  );
}
