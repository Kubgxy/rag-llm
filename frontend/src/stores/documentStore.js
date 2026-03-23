import { create } from 'zustand'

export const useDocumentStore = create((set) => ({
  documents: [],
  // Enhanced summary structure: { sections: [...], metadata: {...} }
  summary: null,
  // Enhanced mindmap with hierarchy: nodes with parentId, level, type
  mindmapNodes: [],
  mindmapEdges: [],
  isUploading: false,
  uploadError: null,
  activeTab: 'summary',

  setUploading: (val) => set({ isUploading: val, uploadError: null }),

  setUploadError: (error) => set({ uploadError: error, isUploading: false }),

  setUploadResult: ({ fileName, summary, nodes, edges }) => {
    // Handle both old format (string) and new format (object)
    const processedSummary = typeof summary === 'string'
      ? {
          sections: [{
            id: 'section-default',
            title: 'สรุปเนื้อหา',
            content: summary,
            type: 'overview',
            icon: '📋',
            order: 0
          }],
          metadata: {
            wordCount: summary.split(/\s+/).length,
            createdAt: Date.now()
          }
        }
      : summary || null

    return set((state) => ({
      documents: [...state.documents, { name: fileName, uploadedAt: new Date() }],
      summary: processedSummary,
      mindmapNodes: nodes || [],
      mindmapEdges: edges || [],
      isUploading: false,
      uploadError: null,
    }))
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  // For updating summary structure programmatically
  updateSummary: (summaryData) => set({ summary: summaryData }),

  // For updating mindmap structure programmatically
  updateMindmap: (nodes, edges) => set({
    mindmapNodes: nodes,
    mindmapEdges: edges
  }),

  clearDocuments: () =>
    set({
      documents: [],
      summary: null,
      mindmapNodes: [],
      mindmapEdges: [],
      uploadError: null,
    }),
}))
