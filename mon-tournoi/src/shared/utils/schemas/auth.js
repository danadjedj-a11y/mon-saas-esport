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
 * + username (pseudonyme) et date de naissance
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
  
  username: z
    .string()
    .min(3, 'Le pseudonyme doit contenir au moins 3 caractères')
    .max(20, 'Le pseudonyme ne peut pas dépasser 20 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le pseudonyme ne peut contenir que des lettres, chiffres, tirets et underscores')
    .trim(),
  
  dateOfBirth: z
    .string()
    .min(1, 'La date de naissance est requise')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      
      // Calculer l'âge exact
      const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      
      return exactAge >= 13;
    }, { message: 'Vous devez avoir au moins 13 ans pour vous inscrire' }),
});

export default { loginSchema, signupSchema };
