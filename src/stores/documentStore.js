import { create } from 'zustand'

export const useDocumentStore = create((set) => ({
  documents: [],
  summary: '',
  mindmapNodes: [],
  mindmapEdges: [],
  isUploading: false,
  uploadError: null,
  activeTab: 'summary',

  setUploading: (val) => set({ isUploading: val, uploadError: null }),

  setUploadError: (error) => set({ uploadError: error, isUploading: false }),

  setUploadResult: ({ fileName, summary, nodes, edges }) =>
    set((state) => ({
      documents: [...state.documents, { name: fileName, uploadedAt: new Date() }],
      summary,
      mindmapNodes: nodes,
      mindmapEdges: edges,
      isUploading: false,
      uploadError: null,
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearDocuments: () =>
    set({
      documents: [],
      summary: '',
      mindmapNodes: [],
      mindmapEdges: [],
      uploadError: null,
    }),
}))
