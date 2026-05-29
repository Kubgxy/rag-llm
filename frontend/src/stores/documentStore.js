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

  setUploadResult: ({ fileName, fileSize, summary, nodes, edges }) => {
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

    return set((state) => {
      // 🔧 Fix: Append document instead of replacing
      const exists = state.documents.some(doc => doc.name === fileName)
      const updatedDocs = exists
        ? state.documents
        : [...state.documents, { name: fileName, size: fileSize || 0, uploadedAt: new Date() }]

      return {
        documents: updatedDocs,
        summary: processedSummary,
        mindmapNodes: nodes || [],
        mindmapEdges: edges || [],
        actionResults: [],
        selectedActionResultId: null,
        isUploading: false,
        uploadError: null,
      }
    })
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
        createdAt: result.created_at || result.createdAt || Date.now(),
      }
      return {
        actionResults: [item, ...state.actionResults],
        selectedActionResultId: item.id,
      }
    }),

  setActionResults: (results) =>
    set((state) => {
      const t = useLanguageStore.getState().t
      const items = results.map((result) => {
        let title = result.action_type
        if (result.action_type === 'slides') title = t('knowledgeActionSlides')
        else if (result.action_type === 'infographic') title = t('knowledgeActionInfographic')
        else if (result.action_type === 'mindmap') title = t('knowledgeActionMindmap')
        else if (result.action_type === 'chart') title = t('knowledgeActionChart')

        return {
          id: result.id || `action-${result.action_type}-${Date.now()}-${Math.random()}`,
          actionType: result.action_type,
          title: title,
          answer: result.answer,
          modelName: result.model_name || null,
          citations: result.citations || [],
          createdAt: result.created_at || result.createdAt || Date.now(),
        }
      })

      const selectedId = items.length > 0 ? items[0].id : null;
      return {
        actionResults: items,
        selectedActionResultId: state.selectedActionResultId || selectedId
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
    storage: {
      getItem: (name) => {
        try {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str) : null
        } catch (e) {
          console.error("Zustand getItem error:", e)
          return null
        }
      },
      setItem: (name, newValue) => {
        try {
          localStorage.setItem(name, JSON.stringify(newValue))
        } catch (e) {
          console.error("Zustand setItem error (Quota exceeded):", e)
          // 🔧 ถ้าโควต้าเต็ม ให้ลบตัวที่บล็อกอยู่ทิ้งเพื่อให้ระบบเดินต่อได้ทันที
          if (e.name === 'QuotaExceededError' || e.code === 22) {
            try {
              localStorage.removeItem(name)
            } catch (innerEx) {}
          }
        }
      },
      removeItem: (name) => {
        try {
          localStorage.removeItem(name)
        } catch (e) {}
      }
    },
    partialize: (state) => ({
      documents: state.documents,
      summary: state.summary,
      mindmapNodes: state.mindmapNodes,
      mindmapEdges: state.mindmapEdges,
      // 🔧 Exclude actionResults จาก localStorage เพื่อป้องกัน QuotaExceededError จากรูป Base64 ขนาดใหญ่
      selectedActionResultId: state.selectedActionResultId,
      webSearchQuery: state.webSearchQuery,
      webSearchResults: state.webSearchResults,
      selectedWebSourceUrls: state.selectedWebSourceUrls,
      importedWebSources: state.importedWebSources,
    }),
  }
))
