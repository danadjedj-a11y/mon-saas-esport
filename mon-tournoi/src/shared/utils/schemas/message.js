import { z } from 'zod';

/**
 * Schéma de validation Zod pour les messages de chat
 */
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Le message ne peut pas être vide')
    .max(500, 'Le message ne peut pas dépasser 500 caractères')
    .trim()
    .refine(
      (val) => val.trim().length > 0,
      { message: 'Le message ne peut pas être vide' }
    ),
});

export default messageSchema;
