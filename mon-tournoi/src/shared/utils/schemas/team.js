import { z } from 'zod';

/**
 * Schéma de validation Zod pour la création/modification d'équipe
 */
export const teamSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom de l\'équipe est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim()
    .refine(val => !/[<>]/.test(val), 'Le nom ne peut pas contenir de caractères < ou >'),
  
  tag: z
    .string()
    .min(2, 'Le tag doit contenir au moins 2 caractères')
    .max(5, 'Le tag ne peut pas dépasser 5 caractères')
    .transform(val => val.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .refine(val => val.length >= 2 && val.length <= 5, {
      message: 'Le tag doit contenir entre 2 et 5 caractères alphanumériques',
    }),
});

export default teamSchema;
