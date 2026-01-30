/**
 * CREATE TOURNAMENT - Version Simplifiée
 * 
 * Formulaire simple pour créer un tournoi rapidement.
 * Les options avancées sont disponibles dans les paramètres du tournoi après création.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';
import { GlassCard, GradientButton } from './shared/components/ui';
import { Trophy, Gamepad2, Users, Calendar, ArrowLeft, Sparkles, Settings } from 'lucide-react';

export default function CreateTournament() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();

  // Données Convex
  const convexUser = useQuery(api.users.getCurrent);
  const createTournamentMutation = useMutation(api.tournamentsMutations.create);

  // Form data - seulement les champs essentiels
  const [formData, setFormData] = useState({
    name: '',
    game: 'Valorant',
    format: 'elimination',
    date: '',
    maxParticipants: 32,
    teamSize: 5,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const gameOptions = [
    { value: 'Valorant', label: 'Valorant' },
    { value: 'League of Legends', label: 'League of Legends' },
    { value: 'CS2', label: 'Counter-Strike 2' },
    { value: 'Rocket League', label: 'Rocket League' },
    { value: 'FC 25', label: 'FC 25' },
    { value: 'Fortnite', label: 'Fortnite' },
    { value: 'Apex Legends', label: 'Apex Legends' },
    { value: 'Overwatch 2', label: 'Overwatch 2' },
    { value: 'Other', label: 'Autre' },
  ];

  const formatOptions = [
    { value: 'elimination', label: '🏆 Élimination Directe' },
    { value: 'double_elimination', label: '⚔️ Double Élimination' },
    { value: 'round_robin', label: '🔄 Round Robin' },
    { value: 'swiss', label: '🇨🇭 Système Suisse' },
  ];

  const teamSizePresets = [
    { value: 1, label: '1v1 (Solo)' },
    { value: 2, label: '2v2 (Duo)' },
    { value: 3, label: '3v3 (Trio)' },
    { value: 5, label: '5v5 (Standard)' },
    { value: 6, label: '6v6' },
  ];

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!formData.date) {
      newErrors.date = 'La date est requise';
    } else if (new Date(formData.date) < new Date()) {
      newErrors.date = 'La date doit être dans le futur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    if (!isSignedIn || !convexUser) {
      toast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);

    try {
      const tournamentId = await createTournamentMutation({
        name: formData.name.trim(),
        game: formData.game,
        format: formData.format,
        maxTeams: parseInt(formData.maxParticipants) || 32,
        teamSize: parseInt(formData.teamSize) || 5,
        startDate: new Date(formData.date).getTime(),
      });

      toast.success('Tournoi créé ! Vous pouvez maintenant le configurer.');
      navigate(`/organizer/tournament/${tournamentId}/settings/general`);
    } catch (err) {
      console.error('Erreur création:', err);
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // Chargement
  if (!isLoaded || convexUser === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#00F5FF]/30 border-t-[#00F5FF] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/organizer/dashboard')}
            className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
              <Trophy className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Créer un Tournoi</h1>
              <p className="text-[#94A3B8]">Configuration rapide • Options avancées disponibles après</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <GlassCard className="space-y-6">
            {/* Nom du tournoi */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] mb-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Nom du tournoi *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: Weekly Cup #1"
                maxLength={100}
                className={`w-full px-4 py-3 rounded-lg bg-[rgba(5,5,10,0.6)] border ${
                  errors.name ? 'border-red-500' : 'border-white/10'
                } text-white placeholder-[#64748B] focus:outline-none focus:border-violet-500 transition-colors`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            {/* Jeu et Format sur la même ligne */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] mb-2">
                  <Gamepad2 className="w-4 h-4 text-cyan-400" />
                  Jeu
                </label>
                <select
                  value={formData.game}
                  onChange={(e) => updateField('game', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(5,5,10,0.6)] border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {gameOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => updateField('format', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(5,5,10,0.6)] border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {formatOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] mb-2">
                <Calendar className="w-4 h-4 text-pink-400" />
                Date de début *
              </label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg bg-[rgba(5,5,10,0.6)] border ${
                  errors.date ? 'border-red-500' : 'border-white/10'
                } text-white focus:outline-none focus:border-violet-500 transition-colors`}
              />
              {errors.date && <p className="mt-1 text-sm text-red-400">{errors.date}</p>}
            </div>

            {/* Participants et Taille équipe */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] mb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Max équipes
                </label>
                <input
                  type="number"
                  min={2}
                  max={256}
                  value={formData.maxParticipants}
                  onChange={(e) => updateField('maxParticipants', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(5,5,10,0.6)] border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">
                  Taille d'équipe
                </label>
                <select
                  value={formData.teamSize}
                  onChange={(e) => updateField('teamSize', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(5,5,10,0.6)] border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {teamSizePresets.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Settings className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#94A3B8]">
                <p className="text-violet-300 font-medium mb-1">Options avancées</p>
                <p>
                  Règles, description, cashprize, map pool, sponsors... 
                  Tous ces paramètres sont configurables après la création dans les réglages du tournoi.
                </p>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/organizer/dashboard')}
                className="flex-1 px-6 py-3 rounded-lg border border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
              >
                Annuler
              </button>
              <GradientButton
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Créer le tournoi
                  </span>
                )}
              </GradientButton>
            </div>
          </GlassCard>
        </form>
      </div>
    </DashboardLayout>
  );
}
