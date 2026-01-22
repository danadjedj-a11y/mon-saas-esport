/**
 * Mock de supabaseClient pour les tests Jest
 * Évite les erreurs import.meta.env dans l'environnement de test
 */

// Mock du client Supabase avec des méthodes chainables
const createChainableMock = (resolveValue = { data: null, error: null }) => {
  const chainable = {
    select: jest.fn(() => chainable),
    insert: jest.fn(() => chainable),
    update: jest.fn(() => chainable),
    delete: jest.fn(() => chainable),
    upsert: jest.fn(() => chainable),
    eq: jest.fn(() => chainable),
    neq: jest.fn(() => chainable),
    gt: jest.fn(() => chainable),
    gte: jest.fn(() => chainable),
    lt: jest.fn(() => chainable),
    lte: jest.fn(() => chainable),
    like: jest.fn(() => chainable),
    ilike: jest.fn(() => chainable),
    is: jest.fn(() => chainable),
    in: jest.fn(() => chainable),
    contains: jest.fn(() => chainable),
    containedBy: jest.fn(() => chainable),
    range: jest.fn(() => chainable),
    order: jest.fn(() => chainable),
    limit: jest.fn(() => chainable),
    single: jest.fn(() => Promise.resolve(resolveValue)),
    maybeSingle: jest.fn(() => Promise.resolve(resolveValue)),
    then: (resolve) => resolve(resolveValue)
  };
  return chainable;
};

export const supabase = {
  from: jest.fn(() => createChainableMock()),
  
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
    signInWithOAuth: jest.fn(() => Promise.resolve({ data: null, error: null })),
    signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
    resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
    updateUser: jest.fn(() => Promise.resolve({ data: null, error: null }))
  },

  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
      download: jest.fn(() => Promise.resolve({ data: null, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://mock-url.com/file' } })),
      remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      list: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  },

  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      })),
      subscribe: jest.fn()
    })),
    subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED'))
  })),

  removeChannel: jest.fn(() => Promise.resolve()),

  rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
};

// Helper pour configurer les réponses mockées
export const mockSupabaseResponse = (table, data, error = null) => {
  supabase.from.mockImplementation((tableName) => {
    if (tableName === table) {
      return createChainableMock({ data, error });
    }
    return createChainableMock();
  });
};

// Reset tous les mocks
export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
};

export default { supabase, mockSupabaseResponse, resetSupabaseMocks };
