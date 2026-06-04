import { create } from 'zustand'

let elementCounter = 0
const generateId = () => `el_${Date.now().toString(36)}_${++elementCounter}`

const DEFAULT_TEXT_PROPS = {
  content: 'New Text',
  fontSize: 18,
  fontFamily: 'Inter',
  fontWeight: '400',
  fontStyle: 'normal',
  color: '#ffffff',
  textAlign: 'left',
  lineHeight: 1.5,
}

const DEFAULT_HEADING_PROPS = {
  ...DEFAULT_TEXT_PROPS,
  content: 'Heading',
  fontSize: 32,
  fontWeight: '700',
}

const DEFAULT_CAPTION_PROPS = {
  ...DEFAULT_TEXT_PROPS,
  content: 'Caption text',
  fontSize: 12,
  fontWeight: '400',
  color: '#94a3b8',
}

const TEXT_PRESETS = {
  heading: { width: 400, height: 60, props: DEFAULT_HEADING_PROPS },
  body: { width: 350, height: 80, props: DEFAULT_TEXT_PROPS },
  caption: { width: 250, height: 40, props: DEFAULT_CAPTION_PROPS },
}

const DEFAULT_SHAPE_PROPS = {
  fillColor: '#3b82f6',
  strokeColor: '#1e40af',
  strokeWidth: 2,
  fillMode: 'fill', // 'fill', 'stroke', 'both'
  borderRadius: 0,
  opacity: 1,
}

const SHAPE_PRESETS = {
  rect: { width: 150, height: 150, props: { ...DEFAULT_SHAPE_PROPS, shapeType: 'rect' } },
  circle: { width: 150, height: 150, props: { ...DEFAULT_SHAPE_PROPS, shapeType: 'circle', borderRadius: 9999 } },
  triangle: { width: 150, height: 150, props: { ...DEFAULT_SHAPE_PROPS, shapeType: 'triangle' } },
  line: { width: 200, height: 10, props: { ...DEFAULT_SHAPE_PROPS, shapeType: 'line', fillMode: 'stroke' } },
}

const IMAGE_PRESETS = {
  default: { width: 300, height: 200, props: { objectFit: 'cover', borderRadius: 0, opacity: 1 } },
}

const MOCK_CHART_DATA = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 500 },
  { name: 'Apr', value: 280 },
  { name: 'May', value: 590 },
]

const CHART_PRESETS = {
  bar: { width: 400, height: 300, props: { chartType: 'bar', data: MOCK_CHART_DATA, color: '#3b82f6' } },
  line: { width: 400, height: 300, props: { chartType: 'line', data: MOCK_CHART_DATA, color: '#10b981' } },
  area: { width: 400, height: 300, props: { chartType: 'area', data: MOCK_CHART_DATA, color: '#8b5cf6' } },
  pie: { width: 350, height: 350, props: { chartType: 'pie', data: MOCK_CHART_DATA, color: '#f59e0b' } },
}

const useSlideEditorStore = create((set, get) => ({
  // Overlay elements keyed by slideIndex
  elements: {},

  // Currently selected element id
  selectedElementId: null,

  // Active tool panel
  activeTool: null,

  // Slide content overrides (title, description, key_points edits)
  slideOverrides: {},

  // Slide-level settings overrides
  slideSettings: {},

  // --- Undo / Redo & Caching States ---
  activeActionId: null,
  cachedStates: {},
  pastHistory: [],
  futureHistory: [],

  saveToHistory: () => {
    const { elements, slideSettings, slideOverrides, pastHistory } = get()
    const clone = (obj) => JSON.parse(JSON.stringify(obj))
    const nextPast = [
      ...pastHistory,
      {
        elements: clone(elements),
        slideSettings: clone(slideSettings),
        slideOverrides: clone(slideOverrides),
      },
    ].slice(-5) // Limit history to last 5 entries as requested
    
    set({
      pastHistory: nextPast,
      futureHistory: [], // Clear redo stack on new action
    })
  },

  undo: () => {
    const { pastHistory, futureHistory, elements, slideSettings, slideOverrides } = get()
    if (pastHistory.length === 0) return

    const clone = (obj) => JSON.parse(JSON.stringify(obj))
    const previous = pastHistory[pastHistory.length - 1]
    const newPast = pastHistory.slice(0, -1)
    const newFuture = [
      {
        elements: clone(elements),
        slideSettings: clone(slideSettings),
        slideOverrides: clone(slideOverrides),
      },
      ...futureHistory,
    ]

    set({
      elements: previous.elements,
      slideSettings: previous.slideSettings,
      slideOverrides: previous.slideOverrides,
      pastHistory: newPast,
      futureHistory: newFuture,
    })
  },

  redo: () => {
    const { pastHistory, futureHistory, elements, slideSettings, slideOverrides } = get()
    if (futureHistory.length === 0) return

    const clone = (obj) => JSON.parse(JSON.stringify(obj))
    const next = futureHistory[0]
    const newFuture = futureHistory.slice(1)
    const newPast = [
      ...pastHistory,
      {
        elements: clone(elements),
        slideSettings: clone(slideSettings),
        slideOverrides: clone(slideOverrides),
      },
    ]

    set({
      elements: next.elements,
      slideSettings: next.slideSettings,
      slideOverrides: next.slideOverrides,
      pastHistory: newPast,
      futureHistory: newFuture,
    })
  },

  initActionState: (actionId, backendEditorState = null) => {
    const { activeActionId, cachedStates, elements, slideSettings, slideOverrides, pastHistory, futureHistory } = get()
    if (activeActionId === actionId) return

    const clone = (obj) => JSON.parse(JSON.stringify(obj))
    const nextCachedStates = { ...cachedStates }

    // Cache current state before switching
    if (activeActionId) {
      nextCachedStates[activeActionId] = {
        elements: clone(elements),
        slideSettings: clone(slideSettings),
        slideOverrides: clone(slideOverrides),
        pastHistory: clone(pastHistory),
        futureHistory: clone(futureHistory),
      }
    }

    if (nextCachedStates[actionId]) {
      const cached = nextCachedStates[actionId]
      set({
        activeActionId: actionId,
        elements: cached.elements,
        slideSettings: cached.slideSettings,
        slideOverrides: cached.slideOverrides,
        pastHistory: cached.pastHistory,
        futureHistory: cached.futureHistory,
        cachedStates: nextCachedStates,
      })
    } else if (backendEditorState && (backendEditorState.elements || backendEditorState.slideSettings)) {
      set({
        activeActionId: actionId,
        elements: backendEditorState.elements || {},
        slideSettings: backendEditorState.slideSettings || {},
        slideOverrides: backendEditorState.slideOverrides || {},
        pastHistory: [],
        futureHistory: [],
        cachedStates: nextCachedStates,
      })
    } else {
      set({
        activeActionId: actionId,
        elements: {},
        slideSettings: {},
        slideOverrides: {},
        pastHistory: [],
        futureHistory: [],
        cachedStates: nextCachedStates,
      })
    }
  },

  // --- Element Actions ---

  addElement: (slideIndex, type, overrides = {}) => {
    get().saveToHistory()
    let preset = null
    if (type === 'text') preset = TEXT_PRESETS[overrides.preset || 'body']
    if (type === 'shape') preset = SHAPE_PRESETS[overrides.preset || 'rect']
    if (type === 'image') preset = IMAGE_PRESETS[overrides.preset || 'default']
    if (type === 'chart') preset = CHART_PRESETS[overrides.preset || 'bar']
    
    const id = generateId()

    const existingElements = get().elements[slideIndex] || []
    const maxZ = existingElements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0)

    const element = {
      id,
      slideIndex,
      type,
      x: overrides.x ?? 80 + existingElements.length * 20,
      y: overrides.y ?? 80 + existingElements.length * 20,
      width: overrides.width ?? preset?.width ?? 200,
      height: overrides.height ?? preset?.height ?? 100,
      rotation: 0,
      zIndex: maxZ + 1,
      locked: false,
      props: { ...(preset?.props || {}), ...(overrides.props || {}) },
    }

    set((state) => ({
      elements: {
        ...state.elements,
        [slideIndex]: [...(state.elements[slideIndex] || []), element],
      },
      selectedElementId: id,
    }))

    return id
  },

  updateElement: (slideIndex, elementId, updates) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex]
      if (!slideElements) return state

      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        },
      }
    })
  },

  updateElementProps: (slideIndex, elementId, propUpdates) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex]
      if (!slideElements) return state

      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId
              ? { ...el, props: { ...el.props, ...propUpdates } }
              : el
          ),
        },
      }
    })
  },

  removeElement: (slideIndex, elementId) => {
    get().saveToHistory()
    set((state) => ({
      elements: {
        ...state.elements,
        [slideIndex]: (state.elements[slideIndex] || []).filter(
          (el) => el.id !== elementId
        ),
      },
      selectedElementId:
        state.selectedElementId === elementId ? null : state.selectedElementId,
    }))
  },

  selectElement: (elementId) => {
    set({ selectedElementId: elementId })
  },

  duplicateElement: (slideIndex, elementId) => {
    get().saveToHistory()
    const state = get()
    const slideElements = state.elements[slideIndex] || []
    const source = slideElements.find((el) => el.id === elementId)
    if (!source) return

    const maxZ = slideElements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0)
    const newId = generateId()
    const duplicate = {
      ...source,
      id: newId,
      x: source.x + 20,
      y: source.y + 20,
      zIndex: maxZ + 1,
      props: { ...source.props },
    }

    set((state) => ({
      elements: {
        ...state.elements,
        [slideIndex]: [...(state.elements[slideIndex] || []), duplicate],
      },
      selectedElementId: newId,
    }))
  },

  bringToFront: (slideIndex, elementId) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex] || []
      const maxZ = slideElements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0)
      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el
          ),
        },
      }
    })
  },

  sendToBack: (slideIndex, elementId) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex] || []
      const minZ = slideElements.reduce((min, el) => Math.min(min, el.zIndex || 0), Infinity)
      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId ? { ...el, zIndex: Math.max(0, minZ - 1) } : el
          ),
        },
      }
    })
  },

  bringForward: (slideIndex, elementId) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex] || []
      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId ? { ...el, zIndex: (el.zIndex || 0) + 1 } : el
          ),
        },
      }
    })
  },

  sendBackward: (slideIndex, elementId) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex] || []
      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId ? { ...el, zIndex: Math.max(0, (el.zIndex || 0) - 1) } : el
          ),
        },
      }
    })
  },

  alignElement: (slideIndex, elementId, alignment) => {
    get().saveToHistory()
    set((state) => {
      const slideElements = state.elements[slideIndex] || []
      const element = slideElements.find((el) => el.id === elementId)
      if (!element) return state

      const CANVAS_WIDTH = 1280
      const CANVAS_HEIGHT = 720
      let newX = element.x
      let newY = element.y

      switch (alignment) {
        case 'left':
          newX = 0
          break
        case 'center':
          newX = (CANVAS_WIDTH - element.width) / 2
          break
        case 'right':
          newX = CANVAS_WIDTH - element.width
          break
        case 'top':
          newY = 0
          break
        case 'middle':
          newY = (CANVAS_HEIGHT - element.height) / 2
          break
        case 'bottom':
          newY = CANVAS_HEIGHT - element.height
          break
      }

      return {
        elements: {
          ...state.elements,
          [slideIndex]: slideElements.map((el) =>
            el.id === elementId ? { ...el, x: newX, y: newY } : el
          ),
        },
      }
    })
  },

  // --- Tool Panel ---

  setActiveTool: (tool) => {
    set((state) => ({
      activeTool: state.activeTool === tool ? null : tool,
    }))
  },

  // --- Slide Content Overrides ---

  updateSlideOverride: (slideIndex, field, value) => {
    get().saveToHistory()
    set((state) => ({
      slideOverrides: {
        ...state.slideOverrides,
        [slideIndex]: {
          ...(state.slideOverrides[slideIndex] || {}),
          [field]: value,
        },
      },
    }))
  },

  updateSlideKeyPoint: (slideIndex, pointIndex, value) => {
    get().saveToHistory()
    set((state) => {
      const existing = state.slideOverrides[slideIndex]?.key_points
      const currentSlideOverrides = state.slideOverrides[slideIndex] || {}
      const points = existing ? [...existing] : []
      points[pointIndex] = value
      return {
        slideOverrides: {
          ...state.slideOverrides,
          [slideIndex]: {
            ...currentSlideOverrides,
            key_points: points,
          },
        },
      }
    })
  },

  // --- Slide Settings ---

  updateSlideSettings: (slideIndex, settings) => {
    get().saveToHistory()
    set((state) => ({
      slideSettings: {
        ...state.slideSettings,
        [slideIndex]: {
          ...(state.slideSettings[slideIndex] || {}),
          ...settings,
        },
      },
    }))
  },

  importSlideContent: (slideIndex, slide, layoutType) => {
    const existing = get().elements[slideIndex] || []
    if (existing.length > 0) return

    const elementsToImport = []
    const layout = String(layoutType || slide.layout_type || 'hero').toLowerCase()
    const keyPoints = Array.isArray(slide.key_points) ? slide.key_points : []

    const createTextEl = (content, x, y, width, height, overrides = {}) => {
      const id = generateId()
      return {
        id,
        slideIndex,
        type: 'text',
        x,
        y,
        width,
        height,
        rotation: 0,
        zIndex: elementsToImport.length + 1,
        locked: false,
        props: {
          content,
          fontSize: overrides.fontSize || 16,
          fontFamily: overrides.fontFamily || 'Inter',
          fontWeight: overrides.fontWeight || '400',
          fontStyle: overrides.fontStyle || 'normal',
          color: overrides.color || '#ffffff',
          textAlign: overrides.textAlign || 'left',
          lineHeight: overrides.lineHeight || 1.5,
          ...overrides
        }
      }
    }

    const createShapeEl = (shapeType, x, y, width, height, overrides = {}) => {
      const id = generateId()
      return {
        id,
        slideIndex,
        type: 'shape',
        x,
        y,
        width,
        height,
        rotation: 0,
        zIndex: elementsToImport.length + 1,
        locked: false,
        props: {
          shapeType,
          fillColor: 'rgba(30, 41, 59, 0.4)',
          strokeColor: '#3b82f6',
          strokeWidth: 1,
          fillMode: 'fill',
          borderRadius: 12,
          opacity: 0.9,
          ...overrides
        }
      }
    }

    if (layout === 'grid-card') {
      elementsToImport.push(createTextEl(slide.slide_title || 'Slide Title', 80, 50, 1120, 50, { fontSize: 28, fontWeight: '700' }))
      if (slide.slide_description) {
        elementsToImport.push(createTextEl(slide.slide_description, 80, 110, 1120, 40, { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }))
      }
      const count = Math.min(3, keyPoints.length)
      const cardWidth = 350
      const cardHeight = 300
      const spacing = 35
      const startX = 80
      const startY = 180

      for (let i = 0; i < count; i++) {
        const x = startX + i * (cardWidth + spacing)
        elementsToImport.push(createShapeEl('rect', x, startY, cardWidth, cardHeight, {
          fillColor: 'rgba(30, 41, 59, 0.4)',
          strokeColor: 'rgba(148, 163, 184, 0.1)',
          borderRadius: 16
        }))
        elementsToImport.push(createTextEl(`Point ${i + 1}\n\n${keyPoints[i]}`, x + 20, startY + 20, cardWidth - 40, cardHeight - 40, {
          fontSize: 14,
          lineHeight: 1.6
        }))
      }
    } else if (layout === 'timeline') {
      elementsToImport.push(createTextEl(slide.slide_title || 'Slide Title', 80, 50, 1120, 50, { fontSize: 28, fontWeight: '700' }))
      if (slide.slide_description) {
        elementsToImport.push(createTextEl(slide.slide_description, 80, 110, 1120, 40, { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }))
      }
      elementsToImport.push(createShapeEl('line', 120, 280, 1040, 8, {
        strokeColor: '#3b82f6',
        strokeWidth: 4,
        fillMode: 'stroke'
      }))

      const count = Math.min(3, keyPoints.length)
      const startX = 180
      const spacing = 340
      const nodeSize = 24
      const nodeY = 272

      for (let i = 0; i < count; i++) {
        const x = startX + i * spacing
        elementsToImport.push(createShapeEl('circle', x + 50, nodeY, nodeSize, nodeSize, {
          fillColor: '#3b82f6',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          borderRadius: 9999
        }))
        elementsToImport.push(createTextEl(`Step ${i + 1}\n\n${keyPoints[i]}`, x - 30, nodeY + 45, 180, 200, {
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 1.5
        }))
      }
    } else if (layout === 'stat') {
      elementsToImport.push(createTextEl(slide.slide_title || 'Slide Title', 80, 50, 1120, 50, { fontSize: 28, fontWeight: '700' }))
      const count = Math.min(3, keyPoints.length)
      const cardWidth = 350
      const cardHeight = 320
      const spacing = 35
      const startX = 80
      const startY = 160

      for (let i = 0; i < count; i++) {
        const x = startX + i * (cardWidth + spacing)
        const pt = keyPoints[i]
        const numberMatch = pt.match(/(\d+[\d,.]*\s*%?)/)
        const metric = numberMatch ? numberMatch[0] : `0${i + 1}`
        const desc = pt.replace(metric, '').trim()

        elementsToImport.push(createShapeEl('rect', x, startY, cardWidth, cardHeight, {
          fillColor: 'rgba(30, 41, 59, 0.4)',
          strokeColor: 'rgba(59, 130, 246, 0.2)',
          borderRadius: 16
        }))
        elementsToImport.push(createTextEl(metric, x + 20, startY + 20, cardWidth - 40, 70, {
          fontSize: 48,
          fontWeight: '900',
          color: '#3b82f6',
          textAlign: 'center'
        }))
        elementsToImport.push(createTextEl(desc || pt, x + 20, startY + 110, cardWidth - 40, cardHeight - 130, {
          fontSize: 13,
          color: '#cbd5e1',
          textAlign: 'center',
          lineHeight: 1.5
        }))
      }
    } else if (layout === 'split-media') {
      elementsToImport.push(createShapeEl('rect', 80, 100, 460, 440, {
        fillColor: 'rgba(30, 41, 59, 0.4)',
        strokeColor: 'rgba(148, 163, 184, 0.1)',
        borderRadius: 16
      }))
      elementsToImport.push(createTextEl(slide.slide_title || 'Slide Title', 105, 130, 410, 80, {
        fontSize: 26,
        fontWeight: '800'
      }))
      if (slide.slide_description) {
        elementsToImport.push(createTextEl(slide.slide_description, 105, 230, 410, 280, {
          fontSize: 13.5,
          color: '#94a3b8',
          lineHeight: 1.6
        }))
      }

      const count = Math.min(3, keyPoints.length)
      const startX = 600
      const startY = 100
      const cardWidth = 600
      const cardHeight = 120
      const spacingY = 25

      for (let i = 0; i < count; i++) {
        const y = startY + i * (cardHeight + spacingY)
        elementsToImport.push(createShapeEl('rect', startX, y, cardWidth, cardHeight, {
          fillColor: 'rgba(30, 41, 59, 0.2)',
          strokeColor: 'rgba(148, 163, 184, 0.05)',
          borderRadius: 12
        }))
        elementsToImport.push(createShapeEl('circle', startX + 20, y + 55, 10, 10, {
          fillColor: '#3b82f6',
          borderRadius: 9999
        }))
        elementsToImport.push(createTextEl(keyPoints[i], startX + 45, y + 20, cardWidth - 65, cardHeight - 40, {
          fontSize: 13,
          lineHeight: 1.5
        }))
      }
    } else {
      elementsToImport.push(createTextEl(slide.slide_title || 'Slide Title', 80, 50, 1120, 60, { fontSize: 32, fontWeight: '700' }))
      let currentY = 130
      if (slide.slide_description) {
        elementsToImport.push(createTextEl(slide.slide_description, 80, currentY, 1120, 60, { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6 }))
        currentY += 80
      }
      for (let i = 0; i < keyPoints.length; i++) {
        elementsToImport.push(createShapeEl('circle', 85, currentY + 7, 8, 8, {
          fillColor: '#3b82f6',
          borderRadius: 9999
        }))
        elementsToImport.push(createTextEl(keyPoints[i], 105, currentY, 1095, 55, { fontSize: 13.5, lineHeight: 1.5 }))
        currentY += 65
      }
    }

    set((state) => ({
      elements: {
        ...state.elements,
        [slideIndex]: elementsToImport
      }
    }))
  },

  importInfographicContent: (infographicData) => {
    const slideIndex = 0
    const existing = get().elements[slideIndex] || []
    if (existing.length > 0) return

    const elementsToImport = []
    const stats = Array.isArray(infographicData.key_stats) ? infographicData.key_stats : []
    const sections = Array.isArray(infographicData.sections) ? infographicData.sections : []

    const createTextEl = (content, x, y, width, height, overrides = {}) => {
      const id = generateId()
      return {
        id,
        slideIndex,
        type: 'text',
        x,
        y,
        width,
        height,
        rotation: 0,
        zIndex: elementsToImport.length + 1,
        locked: false,
        props: {
          content,
          fontSize: overrides.fontSize || 16,
          fontFamily: overrides.fontFamily || 'Inter',
          fontWeight: overrides.fontWeight || '400',
          fontStyle: overrides.fontStyle || 'normal',
          color: overrides.color || '#ffffff',
          textAlign: overrides.textAlign || 'left',
          lineHeight: overrides.lineHeight || 1.5,
          ...overrides
        }
      }
    }

    const createShapeEl = (shapeType, x, y, width, height, overrides = {}) => {
      const id = generateId()
      return {
        id,
        slideIndex,
        type: 'shape',
        x,
        y,
        width,
        height,
        rotation: 0,
        zIndex: elementsToImport.length + 1,
        locked: false,
        props: {
          shapeType,
          fillColor: 'rgba(30, 41, 59, 0.4)',
          strokeColor: '#10b981',
          strokeWidth: 1,
          fillMode: 'fill',
          borderRadius: 12,
          opacity: 0.9,
          ...overrides
        }
      }
    }

    // Headline
    elementsToImport.push(createTextEl(infographicData.headline || 'Infographic', 50, 40, 700, 60, {
      fontSize: 26,
      fontWeight: '800',
      textAlign: 'center'
    }))

    // Subheadline
    if (infographicData.subheadline) {
      elementsToImport.push(createTextEl(infographicData.subheadline, 50, 110, 700, 60, {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center'
      }))
    }

    // Key Stats Row
    let currentY = 190
    if (stats.length > 0) {
      const count = Math.min(3, stats.length)
      const cardWidth = 210
      const spacingX = 35
      const startX = 50

      for (let i = 0; i < count; i++) {
        const x = startX + i * (cardWidth + spacingX)
        const stat = stats[i]
        const valueStr = `${stat.value || ''} ${stat.unit || ''}`

        // Background stat shape
        elementsToImport.push(createShapeEl('rect', x, currentY, cardWidth, 110, {
          fillColor: 'rgba(16, 185, 129, 0.1)',
          strokeColor: 'rgba(16, 185, 129, 0.3)',
          borderRadius: 12
        }))
        // Label
        elementsToImport.push(createTextEl(stat.label || 'Stat', x + 15, currentY + 15, cardWidth - 30, 30, {
          fontSize: 11,
          color: '#a7f3d0',
          textAlign: 'center'
        }))
        // Value
        elementsToImport.push(createTextEl(valueStr, x + 15, currentY + 50, cardWidth - 30, 45, {
          fontSize: 22,
          fontWeight: '900',
          color: '#10b981',
          textAlign: 'center'
        }))
      }
      currentY += 140
    }

    // Sections Grid (2 columns)
    if (sections.length > 0) {
      const colWidth = 330
      const rowHeight = 260
      const spacingX = 40
      const spacingY = 30
      const startX = 50

      for (let i = 0; i < sections.length; i++) {
        const row = Math.floor(i / 2)
        const col = i % 2
        const x = startX + col * (colWidth + spacingX)
        const y = currentY + row * (rowHeight + spacingY)

        const section = sections[i]
        const highlightsStr = Array.isArray(section.highlights)
          ? section.highlights.map(h => `• ${h}`).join('\n')
          : ''

        const fullContent = `${section.summary || ''}\n\n${highlightsStr}`

        // Background section card
        elementsToImport.push(createShapeEl('rect', x, y, colWidth, rowHeight, {
          fillColor: 'rgba(30, 41, 59, 0.4)',
          strokeColor: 'rgba(148, 163, 184, 0.1)',
          borderRadius: 16
        }))

        // Section Title
        elementsToImport.push(createTextEl(section.title || `Section ${i + 1}`, x + 20, y + 20, colWidth - 40, 35, {
          fontSize: 14,
          fontWeight: '700',
          color: '#10b981'
        }))

        // Section Body Content
        elementsToImport.push(createTextEl(fullContent, x + 20, y + 65, colWidth - 40, rowHeight - 85, {
          fontSize: 11.5,
          lineHeight: 1.5,
          color: '#cbd5e1'
        }))
      }

      const rowCount = Math.ceil(sections.length / 2)
      currentY += rowCount * (rowHeight + spacingY)
    }

    // Call to Action
    if (infographicData.call_to_action) {
      elementsToImport.push(createShapeEl('rect', 50, currentY, 700, 100, {
        fillColor: 'rgba(16, 185, 129, 0.05)',
        strokeColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 12
      }))
      elementsToImport.push(createTextEl(`CALL TO ACTION\n\n${infographicData.call_to_action}`, 70, currentY + 15, 660, 70, {
        fontSize: 12,
        fontWeight: '600',
        color: '#a7f3d0',
        textAlign: 'center',
        lineHeight: 1.4
      }))
    }

    set((state) => ({
      elements: {
        ...state.elements,
        [slideIndex]: elementsToImport
      }
    }))
  },

  // --- Utilities ---

  getSlideElements: (slideIndex) => {
    return get().elements[slideIndex] || []
  },

  getSelectedElement: (slideIndex) => {
    const state = get()
    if (!state.selectedElementId) return null
    const slideElements = state.elements[slideIndex] || []
    return slideElements.find((el) => el.id === state.selectedElementId) || null
  },

  clearSlideElements: (slideIndex) => {
    get().saveToHistory()
    set((state) => ({
      elements: {
        ...state.elements,
        [slideIndex]: [],
      },
      selectedElementId: null,
    }))
  },

  resetAll: () => {
    set({
      elements: {},
      selectedElementId: null,
      activeTool: null,
      slideOverrides: {},
      slideSettings: {},
    })
  },
}))

export default useSlideEditorStore
export { TEXT_PRESETS }
