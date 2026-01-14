import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store UI global
 * Gère les modales, toasts, thème, sidebar, etc.
 */
const useUIStore = create(
  persist(
    (set, get) => ({
      // Thème
      theme: 'dark', // 'dark' | 'light'
      
      // Sidebar
      sidebarOpen: true,
      sidebarMobileOpen: false,
      
      // Modales
      modals: {
        // Exemple: modaleName: { isOpen: boolean, data: any }
      },
      
      // Toasts (géré ici pour meilleure gestion globale)
      toasts: [],
      
      // Loading global (pour overlay)
      globalLoading: false,
      
      // Actions
      
      /**
       * Changer le thème
       */
      setTheme: (theme) => {
        set({ theme });
        // Appliquer le thème au document
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
      
      /**
       * Toggle thème
       */
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
      },
      
      /**
       * Toggle sidebar (desktop)
       */
      toggleSidebar: () => {
        set({ sidebarOpen: !get().sidebarOpen });
      },
      
      /**
       * Ouvrir/Fermer sidebar (desktop)
       */
      setSidebarOpen: (isOpen) => {
        set({ sidebarOpen: isOpen });
      },
      
      /**
       * Toggle sidebar mobile
       */
      toggleSidebarMobile: () => {
        set({ sidebarMobileOpen: !get().sidebarMobileOpen });
      },
      
      /**
       * Fermer sidebar mobile
       */
      closeSidebarMobile: () => {
        set({ sidebarMobileOpen: false });
      },
      
      /**
       * Ouvrir une modale
       */
      openModal: (modalName, data = null) => {
        const { modals } = get();
        set({ 
          modals: { 
            ...modals, 
            [modalName]: { isOpen: true, data } 
          } 
        });
      },
      
      /**
       * Fermer une modale
       */
      closeModal: (modalName) => {
        const { modals } = get();
        set({ 
          modals: { 
            ...modals, 
            [modalName]: { isOpen: false, data: null } 
          } 
        });
      },
      
      /**
       * Ajouter un toast
       */
      addToast: (toast) => {
        const { toasts } = get();
        const id = Date.now() + Math.random();
        set({ 
          toasts: [...toasts, { ...toast, id }] 
        });
        
        // Auto-remove après 5 secondes
        setTimeout(() => {
          get().removeToast(id);
        }, toast.duration || 5000);
        
        return id;
      },
      
      /**
       * Supprimer un toast
       */
      removeToast: (toastId) => {
        const { toasts } = get();
        set({ toasts: toasts.filter(t => t.id !== toastId) });
      },
      
      /**
       * Activer/désactiver le loading global
       */
      setGlobalLoading: (loading) => {
        set({ globalLoading: loading });
      },
      
      /**
       * Réinitialiser le store
       */
      reset: () => {
        set({ 
          modals: {},
          toasts: [],
          globalLoading: false,
          sidebarMobileOpen: false,
        });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ 
        // Persister uniquement thème et sidebar
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useUIStore;
