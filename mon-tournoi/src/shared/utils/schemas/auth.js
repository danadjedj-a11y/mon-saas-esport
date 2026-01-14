import { z } from 'zod';

/**
 * Schéma de validation Zod pour l'authentification (login)
 * Pour le login, on accepte n'importe quel mot de passe (Supabase gère la validation)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
});

/**
 * Schéma de validation Zod pour l'inscription (signup)
 * Pour l'inscription, on applique des règles de mot de passe plus strictes
 */
export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide')
    .toLowerCase()
    .trim()
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères')
    .refine(
      (val) => val.length >= 6,
      { message: 'Le mot de passe doit contenir au moins 6 caractères' }
    ),
});

export default { loginSchema, signupSchema };
