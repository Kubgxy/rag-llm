import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useLanguageStore } from './languageStore.js'

export const useDocumentStore = create(
  persist((set) => ({
  documents: [],
  // Enhanced summary structure: { sections: [...], metadata: {...} }
  summary: null,
  // Enhanced mindmap with hierarchy: nodes with parentId, level, type
  mindmapNodes: [],
  mindmapEdges: [],
  // Action generation results shown in knowledge panel
  actionResults: [],
  selectedActionResultId: null,
  isUploading: false,
  uploadError: null,
  activeTab: 'summary',
  // PDF Preview states
  previewPdfFile: null,
  previewPdfPage: null,
  // Web search sources (Step 1: Search & Preview)
  webSearchQuery: '',
  webSearchResults: [],
  selectedWebSourceUrls: [],
  importedWebSources: [],

  setPreviewPdf: (fileName, page = null) => set({ previewPdfFile: fileName, previewPdfPage: page }),
  clearPreviewPdf: () => set({ previewPdfFile: null, previewPdfPage: null }),

  setWebSearchResults: ({ query, results }) =>
    set({
      webSearchQuery: query,
      webSearchResults: results,
      selectedWebSourceUrls: results.map((item) => item.url),
    }),

  toggleWebSourceSelection: (url) =>
    set((state) => {
      const selected = state.selectedWebSourceUrls.includes(url)
      return {
        selectedWebSourceUrls: selected
          ? state.selectedWebSourceUrls.filter((item) => item !== url)
          : [...state.selectedWebSourceUrls, url],
      }
    }),

  setAllWebSourceSelections: (checked) =>
    set((state) => ({
      selectedWebSourceUrls: checked ? state.webSearchResults.map((item) => item.url) : [],
    })),

  addImportedWebSources: (sources) =>
    set((state) => {
      const incoming = Array.isArray(sources) ? sources : []
      const mergedByUrl = new Map()

      state.importedWebSources.forEach((item) => {
        if (item?.url) mergedByUrl.set(item.url, item)
      })
      incoming.forEach((item) => {
        if (item?.url) {
          mergedByUrl.set(item.url, {
            title: item.title || item.url,
            url: item.url,
            snippet: item.snippet || '',
            source: item.source || item.title || item.url,
          })
        }
      })

      return { importedWebSources: Array.from(mergedByUrl.values()) }
    }),

  setUploading: (val) => set({ isUploading: val, uploadError: null }),

  setUploadError: (error) => set({ uploadError: error, isUploading: false }),

  setUploadResult: ({ fileName, summary, nodes, edges }) => {
    const t = useLanguageStore.getState().t
    // Handle both old format (string) and new format (object)
    const processedSummary = typeof summary === 'string'
      ? {
          sections: [{
            id: 'section-default',
            title: t('knowledgeTabSummary'),
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
      // 🔧 Fix: แทนที่เอกสารแทนการ append ทุกครั้ง
      documents: [{ name: fileName, uploadedAt: new Date() }],
      summary: processedSummary,
      mindmapNodes: nodes || [],
      mindmapEdges: edges || [],
      actionResults: [],
      selectedActionResultId: null,
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

  addActionResult: (result) =>
    set((state) => {
      const item = {
        id: result.id || `action-${Date.now()}-${Math.random()}`,
        actionType: result.actionType,
        title: result.title,
        answer: result.answer,
        modelName: result.modelName || null,
        citations: result.citations || [],
        createdAt: result.createdAt || Date.now(),
      }
      return {
        actionResults: [item, ...state.actionResults],
        selectedActionResultId: item.id,
      }
    }),

  setSelectedActionResult: (id) => set({ selectedActionResultId: id }),

  clearActionResults: () => set({ actionResults: [], selectedActionResultId: null }),

  clearDocuments: () =>
    set({
      documents: [],
      summary: null,
      mindmapNodes: [],
      mindmapEdges: [],
      actionResults: [],
      selectedActionResultId: null,
      webSearchQuery: '',
      webSearchResults: [],
      selectedWebSourceUrls: [],
      importedWebSources: [],
      uploadError: null,
    }),
  }),
  {
    name: 'rag-document-storage', // ชื่อ key ใน localStorage
    partialize: (state) => ({
      documents: state.documents,
      summary: state.summary,
      mindmapNodes: state.mindmapNodes,
      mindmapEdges: state.mindmapEdges,
      actionResults: state.actionResults,
      selectedActionResultId: state.selectedActionResultId,
      webSearchQuery: state.webSearchQuery,
      webSearchResults: state.webSearchResults,
      selectedWebSourceUrls: state.selectedWebSourceUrls,
      importedWebSources: state.importedWebSources,
    }), // เก็บได้อย่างไร documents,summary,mindmap
  }
))
