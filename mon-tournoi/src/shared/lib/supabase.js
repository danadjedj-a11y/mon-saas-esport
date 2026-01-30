/**
 * CONVEX QUERY UTILITIES - Remplacement de shared/lib/supabase.js
 * 
 * Utilitaires pour les opérations Convex avec gestion d'erreurs
 * et patterns similaires à l'ancien wrapper Supabase.
 * 
 * NOTE: La plupart de ces fonctions sont remplacées par les mutations Convex
 * qui gèrent déjà les erreurs et les retries automatiquement.
 */

/**
 * @typedef {Object} QueryResult
 * @property {any} data - The query result data
 * @property {Error|null} error - Any error that occurred
 * @property {boolean} success - Whether the query succeeded
 */

/**
 * Execute une mutation Convex avec gestion d'erreurs cohérente
 * 
 * @param {Function} mutationFn - Fonction mutation Convex
 * @param {Object} args - Arguments de la mutation
 * @returns {Promise<QueryResult>}
 * 
 * @example
 * const result = await safeMutation(createTeam, { name: 'MyTeam', tag: 'MT' });
 * if (result.success) {
 *   console.log('Created:', result.data);
 * }
 */
export async function safeMutation(mutationFn, args = {}) {
    try {
        const data = await mutationFn(args);
        return { data, error: null, success: true };
    } catch (error) {
        console.error('[Convex] Erreur mutation:', error);
        return { data: null, error, success: false };
    }
}

/**
 * Helper: Attendre un délai
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute une mutation avec retry automatique
 * 
 * @param {Function} mutationFn - Fonction mutation Convex
 * @param {Object} args - Arguments de la mutation
 * @param {Object} options - Options (retries, retryDelay)
 */
export async function safeMutationWithRetry(mutationFn, args = {}, options = {}) {
    const { retries = 2, retryDelay = 500 } = options;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const data = await mutationFn(args);
            return { data, error: null, success: true };
        } catch (error) {
            lastError = error;
            console.warn(`[Convex] Tentative ${attempt + 1}/${retries + 1} échouée:`, error.message);

            if (attempt < retries) {
                await sleep(retryDelay * (attempt + 1));
            }
        }
    }

    return { data: null, error: lastError, success: false };
}

/**
 * Batch mutations helper
 * Exécute plusieurs mutations en parallèle
 * 
 * @param {Array<{fn: Function, args: Object}>} mutations - Array de mutations
 */
export async function batchMutations(mutations) {
    const results = await Promise.allSettled(
        mutations.map(({ fn, args }) => fn(args))
    );

    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    return {
        success: failed.length === 0,
        successCount: successful.length,
        failedCount: failed.length,
        results: results.map(r =>
            r.status === 'fulfilled'
                ? { data: r.value, error: null, success: true }
                : { data: null, error: r.reason, success: false }
        ),
    };
}

/**
 * LEGACY EXPORTS - Pour compatibilité
 * Ces fonctions affichent un warning car elles utilisaient Supabase
 */
export async function safeQuery(queryFn, options = {}) {
    console.warn('[MIGRATION] safeQuery est déprécié. Utilisez useQuery de Convex.');
    return { data: null, error: new Error('Migrez vers Convex'), success: false };
}

export async function safeSelect(table, query, filters, options) {
    console.warn(`[MIGRATION] safeSelect("${table}") est déprécié. Utilisez useQuery(api.${table}.list).`);
    return { data: [], error: null, success: true };
}

export async function safeInsert(table, data, options) {
    console.warn(`[MIGRATION] safeInsert("${table}") est déprécié. Utilisez useMutation(api.${table}Mutations.create).`);
    return { data: null, error: new Error('Migrez vers Convex'), success: false };
}

export async function safeUpdate(table, data, filters, options) {
    console.warn(`[MIGRATION] safeUpdate("${table}") est déprécié. Utilisez useMutation(api.${table}Mutations.update).`);
    return { data: null, error: new Error('Migrez vers Convex'), success: false };
}

export async function safeDelete(table, filters, options) {
    console.warn(`[MIGRATION] safeDelete("${table}") est déprécié. Utilisez useMutation(api.${table}Mutations.remove).`);
    return { data: null, error: new Error('Migrez vers Convex'), success: false };
}

export async function safeUpsert(table, data, onConflict, options) {
    console.warn(`[MIGRATION] safeUpsert("${table}") est déprécié. Utilisez useMutation(api.${table}Mutations.upsert).`);
    return { data: null, error: new Error('Migrez vers Convex'), success: false };
}

export async function batchUpdate(table, updates, idField) {
    console.warn(`[MIGRATION] batchUpdate("${table}") est déprécié. Utilisez batchMutations.`);
    return { success: false, successCount: 0, failedCount: updates.length, errors: [] };
}

export async function withRollback(operations) {
    console.warn('[MIGRATION] withRollback est déprécié. Gérez les erreurs dans vos mutations Convex.');
    return { success: false, data: null, error: new Error('Migrez vers Convex') };
}

export default {
    mutation: safeMutation,
    mutationWithRetry: safeMutationWithRetry,
    batch: batchMutations,
    // Legacy (deprecated)
    query: safeQuery,
    select: safeSelect,
    insert: safeInsert,
    update: safeUpdate,
    delete: safeDelete,
    upsert: safeUpsert,
    batchUpdate,
    withRollback,
};
