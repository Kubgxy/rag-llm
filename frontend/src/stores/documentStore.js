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

    return set((state) => {
      // 1. Determine the document name
      const docName = fileName || 'Document'
      const sectionId = `summary-${docName.replace(/\s+/g, '_')}`

      const lang = useLanguageStore.getState().lang
      const docTitle = lang === 'th'
        ? `📄 สรุปเนื้อหาจากเอกสาร: ${docName}`
        : `📄 Document Summary: ${docName}`

      // 2. Format the new summary section
      let newSections = []
      if (typeof summary === 'string') {
        newSections = [{
          id: sectionId,
          title: docTitle,
          content: summary,
          type: 'overview',
          icon: '📄',
          order: state.summary?.sections?.length || 0
        }]
      } else if (summary && Array.isArray(summary.sections)) {
        newSections = summary.sections.map((s, idx) => ({
          ...s,
          id: s.id || `${sectionId}-${idx}`,
          title: s.title || docTitle,
        }))
      } else if (summary && summary.content) {
        newSections = [{
          id: sectionId,
          title: summary.title || docTitle,
          content: summary.content,
          type: summary.type || 'overview',
          icon: summary.icon || '📄',
          order: state.summary?.sections?.length || 0
        }]
      }

      // 3. Get existing sections
      let existingSections = []
      if (state.summary) {
        if (typeof state.summary === 'string') {
          existingSections = [{
            id: 'section-default',
            title: t('knowledgeTabSummary'),
            content: state.summary,
            type: 'overview',
            icon: '📋',
            order: 0
          }]
        } else if (Array.isArray(state.summary.sections)) {
          existingSections = [...state.summary.sections]
        }
      }

      // 4. Merge: If section with same ID exists, update it. Otherwise append.
      const mergedSections = [...existingSections]
      newSections.forEach(newSec => {
        const index = mergedSections.findIndex(s => s.id === newSec.id)
        if (index !== -1) {
          mergedSections[index] = { ...mergedSections[index], ...newSec }
        } else {
          mergedSections.push(newSec)
        }
      })

      // 5. Recalculate word count
      const totalWordCount = mergedSections.reduce((sum, s) => {
        const words = (s.content || '').trim().split(/\s+/).length
        return sum + (s.content ? words : 0)
      }, 0)

      const processedSummary = {
        sections: mergedSections,
        metadata: {
          wordCount: totalWordCount,
          createdAt: Date.now()
        }
      }

      // 🔧 Fix: Append document instead of replacing
      const exists = state.documents.some(doc => doc.name === fileName)
      const updatedDocs = exists
        ? state.documents
        : [...state.documents, { name: fileName, size: fileSize || 0, uploadedAt: new Date() }]

      return {
        documents: updatedDocs,
        summary: processedSummary,
        mindmapNodes: nodes || state.mindmapNodes || [],
        mindmapEdges: edges || state.mindmapEdges || [],
        actionResults: state.actionResults || [],
        selectedActionResultId: state.selectedActionResultId,
        isUploading: false,
        uploadError: null,
      }
    })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  // For updating summary structure programmatically
  updateSummary: (summaryData) => set((state) => {
    // If incoming summary has sections, merge them
    if (summaryData && Array.isArray(summaryData.sections)) {
      let existingSections = []
      if (state.summary) {
        if (typeof state.summary === 'string') {
          existingSections = [{
            id: 'section-default',
            title: 'สรุปเนื้อหา',
            content: state.summary,
            type: 'overview',
            icon: '📋',
            order: 0
          }]
        } else if (Array.isArray(state.summary.sections)) {
          existingSections = [...state.summary.sections]
        }
      }

      const mergedSections = [...existingSections]
      summaryData.sections.forEach(newSec => {
        const index = mergedSections.findIndex(s => s.id === newSec.id)
        if (index !== -1) {
          mergedSections[index] = { ...mergedSections[index], ...newSec }
        } else {
          mergedSections.push(newSec)
        }
      })

      const totalWordCount = mergedSections.reduce((sum, s) => {
        const words = (s.content || '').trim().split(/\s+/).length
        return sum + (s.content ? words : 0)
      }, 0)

      return {
        summary: {
          sections: mergedSections,
          metadata: {
            wordCount: totalWordCount,
            createdAt: Date.now()
          }
        }
      }
    }

    // Default replacement if not mergeable
    return { summary: summaryData }
  }),

  // For updating mindmap structure programmatically
  updateMindmap: (nodes, edges) => set({
    mindmapNodes: nodes,
    mindmapEdges: edges
  }),

  addActionResult: (result) =>
    set((state) => {
      const t = useLanguageStore.getState().t
      const item = {
        id: result.id || `action-${Date.now()}-${Math.random()}`,
        actionType: result.actionType || result.action_type,
        title: result.title || (
          (result.action_type === 'slides' || result.actionType === 'slides') ? t('knowledgeActionSlides') :
          (result.action_type === 'infographic' || result.actionType === 'infographic') ? t('knowledgeActionInfographic') :
          (result.action_type === 'mindmap' || result.actionType === 'mindmap') ? t('knowledgeActionMindmap') :
          (result.action_type === 'chart' || result.actionType === 'chart') ? t('knowledgeActionChart') : 
          (result.actionType || result.action_type)
        ),
        answer: result.answer,
        modelName: result.modelName || result.model_name || null,
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
        let title = result.title || result.action_type
        if (!result.title) {
          if (result.action_type === 'slides') title = t('knowledgeActionSlides')
          else if (result.action_type === 'infographic') title = t('knowledgeActionInfographic')
          else if (result.action_type === 'mindmap') title = t('knowledgeActionMindmap')
          else if (result.action_type === 'chart') title = t('knowledgeActionChart')
        }

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
