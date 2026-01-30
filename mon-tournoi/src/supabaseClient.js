/**
 * SUPABASE CLIENT STUB - Pour migration progressive
 * 
 * Ce fichier remplace l'ancien supabaseClient.js
 * Il fournit un stub qui affiche des avertissements
 * quand des composants non migrés essaient d'utiliser Supabase.
 * 
 * OBJECTIF: Éviter les erreurs d'import tout en identifiant
 * les composants qui doivent encore être migrés vers Convex.
 */

// Créer un proxy qui affiche des avertissements
const createWarningProxy = (path = 'supabase') => {
    return new Proxy(() => {
        console.warn(`⚠️ [MIGRATION] Appel Supabase détecté: ${path}() - Ce composant doit être migré vers Convex`);
        return createWarningProxy(`${path}.result`);
    }, {
        get: (target, prop) => {
            if (prop === 'then' || prop === 'catch' || prop === 'finally') {
                // Pour les promesses, retourner des méthodes qui fonctionnent
                return (cb) => Promise.resolve({ data: null, error: { message: 'Supabase désactivé - Utilisez Convex' } });
            }
            if (prop === 'data') {
                return { session: null, user: null, subscription: { unsubscribe: () => { } } };
            }
            console.warn(`⚠️ [MIGRATION] Accès Supabase: ${path}.${String(prop)} - Migrer vers Convex`);
            return createWarningProxy(`${path}.${String(prop)}`);
        },
        apply: (target, thisArg, args) => {
            console.warn(`⚠️ [MIGRATION] Appel Supabase: ${path}() - Ce composant doit être migré vers Convex`);
            return createWarningProxy(`${path}.result`);
        }
    });
};

// Export du stub Supabase
export const supabase = createWarningProxy('supabase');

// Pour les imports qui utilisent createClient directement
export const createClient = () => {
    console.warn('⚠️ [MIGRATION] createClient appelé - Supabase est désactivé, utilisez Convex');
    return supabase;
};

// Mock pour auth qui retourne toujours null (Clerk gère l'auth maintenant)
supabase.auth = {
    getSession: async () => {
        console.warn('⚠️ [MIGRATION] supabase.auth.getSession() appelé - Utilisez useUser() de Clerk');
        return { data: { session: null }, error: null };
    },
    getUser: async () => {
        console.warn('⚠️ [MIGRATION] supabase.auth.getUser() appelé - Utilisez useUser() de Clerk');
        return { data: { user: null }, error: null };
    },
    onAuthStateChange: (callback) => {
        console.warn('⚠️ [MIGRATION] supabase.auth.onAuthStateChange() appelé - Utilisez useUser() de Clerk');
        return { data: { subscription: { unsubscribe: () => { } } } };
    },
    signInWithPassword: async () => {
        console.warn('⚠️ [MIGRATION] supabase.auth.signInWithPassword() appelé - Utilisez <SignIn /> de Clerk');
        return { data: { session: null }, error: { message: 'Utilisez Clerk pour la connexion' } };
    },
    signUp: async () => {
        console.warn('⚠️ [MIGRATION] supabase.auth.signUp() appelé - Utilisez <SignUp /> de Clerk');
        return { data: { user: null }, error: { message: 'Utilisez Clerk pour l\'inscription' } };
    },
    signOut: async () => {
        console.warn('⚠️ [MIGRATION] supabase.auth.signOut() appelé - Utilisez signOut() de Clerk');
        return { error: null };
    },
};

// Mock pour les tables (from)
supabase.from = (table) => {
    console.warn(`⚠️ [MIGRATION] supabase.from('${table}') appelé - Utilisez useQuery/useMutation de Convex`);
    return {
        select: () => ({
            eq: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }),
            in: () => ({ data: [], error: null }),
            order: () => ({ data: [], error: null }),
            limit: () => ({ data: [], error: null }),
            single: () => ({ data: null, error: null }),
            data: [],
            error: null,
        }),
        insert: async () => {
            console.warn(`⚠️ [MIGRATION] supabase.from('${table}').insert() appelé - Utilisez useMutation de Convex`);
            return { data: null, error: { message: 'Utilisez Convex pour les mutations' } };
        },
        update: async () => {
            console.warn(`⚠️ [MIGRATION] supabase.from('${table}').update() appelé - Utilisez useMutation de Convex`);
            return { data: null, error: { message: 'Utilisez Convex pour les mutations' } };
        },
        delete: async () => {
            console.warn(`⚠️ [MIGRATION] supabase.from('${table}').delete() appelé - Utilisez useMutation de Convex`);
            return { data: null, error: { message: 'Utilisez Convex pour les mutations' } };
        },
        upsert: async () => {
            console.warn(`⚠️ [MIGRATION] supabase.from('${table}').upsert() appelé - Utilisez useMutation de Convex`);
            return { data: null, error: { message: 'Utilisez Convex pour les mutations' } };
        },
    };
};

// Mock pour storage
supabase.storage = {
    from: (bucket) => {
        console.warn(`⚠️ [MIGRATION] supabase.storage.from('${bucket}') appelé - Configurer un service de stockage`);
        return {
            upload: async () => ({ data: null, error: { message: 'Storage désactivé' } }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
            remove: async () => ({ data: null, error: null }),
        };
    },
};

// Message initial lors du chargement
console.log('🔄 [MIGRATION] supabaseClient.js chargé en mode stub - Les appels Supabase seront ignorés');
console.log('📖 [MIGRATION] Consultez MIGRATION_GUIDE.md pour migrer les composants vers Convex');