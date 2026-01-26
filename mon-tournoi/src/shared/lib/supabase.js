/**
 * Supabase Query Wrapper
 * Provides consistent error handling and type-safe database operations
 */

import { supabase } from '../supabaseClient';

/**
 * @typedef {Object} QueryResult
 * @property {any} data - The query result data
 * @property {Error|null} error - Any error that occurred
 * @property {boolean} success - Whether the query succeeded
 */

/**
 * @typedef {Object} QueryOptions
 * @property {number} [retries=1] - Number of retry attempts
 * @property {number} [retryDelay=500] - Delay between retries in ms
 * @property {boolean} [throwOnError=false] - Whether to throw errors
 */

const DEFAULT_OPTIONS = {
    retries: 1,
    retryDelay: 500,
    throwOnError: false,
};

/**
 * Execute a Supabase query with consistent error handling
 * @param {Function} queryFn - Function that returns a Supabase query
 * @param {QueryOptions} options - Query options
 * @returns {Promise<QueryResult>}
 */
export async function safeQuery(queryFn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError = null;

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
        try {
            const { data, error } = await queryFn();

            if (error) {
                lastError = error;

                // Don't retry on authentication errors
                if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
                    break;
                }

                // Retry on network or timeout errors
                if (attempt < opts.retries) {
                    await sleep(opts.retryDelay * (attempt + 1));
                    continue;
                }
            }

            if (!error) {
                return { data, error: null, success: true };
            }
        } catch (err) {
            lastError = err;

            if (attempt < opts.retries) {
                await sleep(opts.retryDelay * (attempt + 1));
                continue;
            }
        }
    }

    if (opts.throwOnError && lastError) {
        throw lastError;
    }

    return { data: null, error: lastError, success: false };
}

/**
 * Safe SELECT query
 */
export async function safeSelect(table, query = '*', filters = {}, options = {}) {
    return safeQuery(async () => {
        let q = supabase.from(table).select(query);

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                q = q.eq(key, value);
            }
        });

        return q;
    }, options);
}

/**
 * Safe INSERT query
 */
export async function safeInsert(table, data, options = {}) {
    return safeQuery(async () => {
        return supabase.from(table).insert(data).select();
    }, options);
}

/**
 * Safe UPDATE query
 */
export async function safeUpdate(table, data, filters, options = {}) {
    return safeQuery(async () => {
        let q = supabase.from(table).update(data);

        Object.entries(filters).forEach(([key, value]) => {
            q = q.eq(key, value);
        });

        return q.select();
    }, options);
}

/**
 * Safe DELETE query
 */
export async function safeDelete(table, filters, options = {}) {
    return safeQuery(async () => {
        let q = supabase.from(table).delete();

        Object.entries(filters).forEach(([key, value]) => {
            q = q.eq(key, value);
        });

        return q;
    }, options);
}

/**
 * Safe UPSERT query
 */
export async function safeUpsert(table, data, onConflict, options = {}) {
    return safeQuery(async () => {
        return supabase.from(table).upsert(data, { onConflict }).select();
    }, options);
}

/**
 * Batch update helper - updates multiple records efficiently
 * @param {string} table - Table name
 * @param {Array<{id: string, data: object}>} updates - Array of updates
 * @param {string} idField - Field name for ID (default: 'id')
 */
export async function batchUpdate(table, updates, idField = 'id') {
    const results = await Promise.all(
        updates.map(({ id, data }) =>
            safeUpdate(table, data, { [idField]: id })
        )
    );

    const failed = results.filter(r => !r.success);

    return {
        success: failed.length === 0,
        successCount: results.length - failed.length,
        failedCount: failed.length,
        errors: failed.map(r => r.error),
    };
}

/**
 * Transaction-like helper for multiple operations
 * Rolls back on error (deletes inserted records)
 */
export async function withRollback(operations) {
    const insertedRecords = [];

    try {
        for (const op of operations) {
            const result = await op.execute();

            if (!result.success) {
                throw result.error;
            }

            if (op.type === 'insert' && result.data) {
                insertedRecords.push({
                    table: op.table,
                    ids: Array.isArray(result.data)
                        ? result.data.map(r => r.id)
                        : [result.data.id],
                });
            }
        }

        return { success: true, data: null, error: null };
    } catch (error) {
        // Rollback: delete inserted records
        for (const record of insertedRecords.reverse()) {
            for (const id of record.ids) {
                await safeDelete(record.table, { id });
            }
        }

        return { success: false, data: null, error };
    }
}

// Utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
    query: safeQuery,
    select: safeSelect,
    insert: safeInsert,
    update: safeUpdate,
    delete: safeDelete,
    upsert: safeUpsert,
    batchUpdate,
    withRollback,
};
