import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Default categories
const DEFAULT_CATEGORIES = {
  work: { id: 'work', name: 'งาน', color: '#3b82f6', icon: '💼' },
  personal: { id: 'personal', name: 'ส่วนตัว', color: '#8b5cf6', icon: '👤' },
  research: { id: 'research', name: 'วิจัย', color: '#06b6d4', icon: '🔬' },
}

export const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      selectedCategoryId: null, // for filtering in Landing Page

      // Create a new category
      createCategory: (name, color, icon) => {
        const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        set((state) => ({
          categories: {
            ...state.categories,
            [id]: { id, name, color, icon }
          }
        }))
        return id
      },

      // Update existing category
      updateCategory: (id, updates) =>
        set((state) => {
          if (!state.categories[id]) return state
          return {
            categories: {
              ...state.categories,
              [id]: { ...state.categories[id], ...updates }
            }
          }
        }),

      // Delete a category
      deleteCategory: (id) =>
        set((state) => {
          // Don't allow deleting default categories
          if (['work', 'personal', 'research'].includes(id)) {
            console.warn('Cannot delete default categories')
            return state
          }

          const newCategories = { ...state.categories }
          delete newCategories[id]
          return { categories: newCategories }
        }),

      // Set selected category for filtering
      setSelectedCategory: (categoryId) => set({ selectedCategoryId: categoryId }),

      // Clear category filter
      clearCategoryFilter: () => set({ selectedCategoryId: null }),
    }),
    {
      name: 'rag-categories',
    }
  )
)
