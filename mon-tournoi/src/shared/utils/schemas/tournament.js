import { z } from 'zod';

// Schéma de base commun (sans superRefine) pour pouvoir utiliser .omit()
const tournamentBaseSchema = z.object({
  game: z
    .enum(['Valorant', 'League of Legends', 'CS2', 'Rocket League', 'FC 24'], {
      errorMap: () => ({ message: 'Jeu invalide' }),
    }),
  
  format: z
    .enum(['elimination', 'double_elimination', 'round_robin', 'swiss'], {
      errorMap: () => ({ message: 'Format invalide' }),
    }),
  
  best_of: z
    .union([z.number(), z.string()])
    .transform(val => typeof val === 'string' ? parseInt(val) : val)
    .refine(val => Number.isInteger(val) && val >= 1 && val <= 7, {
      message: 'Best-of doit être un nombre entier entre 1 et 7',
    }),
  
  maps_pool: z
    .string()
    .max(500, 'Le pool de cartes ne peut pas dépasser 500 caractères')
    .transform(val => {
      if (!val.trim()) return null;
      const maps = val.split(',').map(m => m.trim()).filter(m => m.length > 0);
      return maps.length > 0 ? maps : null;
    })
    .nullable()
    .optional(),
  
  rules: z
    .string()
    .max(5000, 'Le règlement ne peut pas dépasser 5000 caractères')
    .transform(val => val.trim() || null)
    .nullable()
    .optional(),
  
  max_participants: z
    .string()
    .transform(val => {
      if (!val.trim()) return null;
      const num = parseInt(val);
      if (isNaN(num)) return null;
      return num;
    })
    .refine(val => val === null || (val >= 2 && val <= 1000), {
      message: 'Le nombre maximum de participants doit être entre 2 et 1000',
    })
    .nullable()
    .optional(),
  
  registration_deadline: z
    .string()
    .transform(val => {
      if (!val || !val.trim()) return null;
      const [datePart, timePart] = val.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);
      return localDate.toISOString();
    })
    .nullable()
    .optional(),
});

/**
 * Schéma de validation Zod pour la création/modification de tournoi
 */
export const tournamentSchema = tournamentBaseSchema.extend({
  name: z
    .string()
    .min(1, 'Le nom du tournoi est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim()
    .refine(val => !/[<>]/.test(val), 'Le nom ne peut pas contenir de caractères < ou >'),
  
  start_date: z
    .string()
    .min(1, 'La date de début est requise')
    .refine(val => {
      if (!val) return false;
      const [datePart, timePart] = val.split('T');
      if (!datePart || !timePart) return false;
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);
      const now = new Date();
      // Laisser un délai de 1 heure minimum
      return localDate > new Date(now.getTime() + 60 * 60 * 1000);
    }, {
      message: 'La date de début doit être au moins 1 heure dans le futur',
    })
    .transform(val => {
      if (!val) return null;
      const [datePart, timePart] = val.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);
      return localDate.toISOString();
    }),
}).superRefine((data, ctx) => {
  // Vérifier que la deadline d'inscription est avant la date de début
  if (data.registration_deadline && data.start_date) {
    const regDeadline = new Date(data.registration_deadline);
    const startDate = new Date(data.start_date);
    if (regDeadline >= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date limite d\'inscription doit être avant la date de début',
        path: ['registration_deadline'],
      });
    }
  }
});

// Template schema (sans validation de relation start_date/registration_deadline)
export const templateSchema = tournamentBaseSchema.extend({
  template_name: z
    .string()
    .min(1, 'Le nom du template est requis')
    .max(100, 'Le nom du template ne peut pas dépasser 100 caractères')
    .trim(),
  start_date: z
    .string()
    .transform(val => {
      if (!val || !val.trim()) return null;
      const [datePart, timePart] = val.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);
      return localDate.toISOString();
    })
    .nullable()
    .optional(),
});
