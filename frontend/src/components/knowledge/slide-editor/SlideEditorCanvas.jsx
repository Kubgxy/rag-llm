import { useCallback, useRef, useEffect, useState } from 'react'
import {
  Presentation,
  FileText,
  Shapes,
  Palette,
  BarChart3,
  Cpu,
  Sparkles,
  Target,
  ChevronLeft,
  ChevronRight,
  Download,
  Image,
  LayoutGrid,
  Settings,
  X,
} from 'lucide-react'
import useSlideEditorStore from '../../../stores/useSlideEditorStore'
import EditorElement from './EditorElement'
import TextElement from './TextElement'
import ShapeElement from './ShapeElement'
import ImageElement from './ImageElement'
import ChartElement from './ChartElement'
import TextPanel from './panels/TextPanel'
import ShapesPanel from './panels/ShapesPanel'
import ImagesPanel from './panels/ImagesPanel'
import LayoutPanel from './panels/LayoutPanel'
import ChartsPanel from './panels/ChartsPanel'
import SettingsPanel from './panels/SettingsPanel'

// --- Left Sidebar Tool Definitions ---
const EDITOR_TOOLS = [
  { id: 'text', label: 'Text', icon: FileText },
  { id: 'shapes', label: 'Shapes', icon: Shapes },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'layout', label: 'Layout', icon: LayoutGrid },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// --- Placeholder Panels for future phases ---
function ComingSoonPanel({ toolName }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3">
        <Sparkles className="w-6 h-6 text-primary-500 animate-pulse" />
      </div>
      <p className="text-xs font-bold text-surface-600 dark:text-surface-300 mb-1">
        {toolName} Tools
      </p>
      <p className="text-[10px] text-surface-400 leading-relaxed max-w-[180px]">
        เครื่องมือนี้จะเปิดให้ใช้งานใน Phase ถัดไป
      </p>
    </div>
  )
}

export default function SlideEditorCanvas({
  slides,
  parsedTitle,
  currentIndex,
  theme,
  themeClass,
  renderSlideContent,
  slideOverrides,
  isInfographic = false,
  infographicData = null,
  canvasRef: canvasRefProp,
  readOnly = false,
}) {
  const activeTool = useSlideEditorStore((s) => s.activeTool)
  const setActiveTool = useSlideEditorStore((s) => s.setActiveTool)
  const elements = useSlideEditorStore((s) => s.elements[currentIndex]) || []
  const selectedElementId = useSlideEditorStore((s) => s.selectedElementId)
  const selectElement = useSlideEditorStore((s) => s.selectElement)
  const slideSettings = useSlideEditorStore((s) => s.slideSettings[currentIndex]) || {}
  
  const importSlideContent = useSlideEditorStore((s) => s.importSlideContent)
  const importInfographicContent = useSlideEditorStore((s) => s.importInfographicContent)

  const localCanvasRef = useRef(null)
  const canvasRef = canvasRefProp || localCanvasRef
  const [canvasScale, setCanvasScale] = useState(1)

  // Trigger automatic import when entering editor mode if elements list is empty
  useEffect(() => {
    if (isInfographic) {
      if (infographicData && elements.length === 0) {
        importInfographicContent(infographicData)
      }
    } else {
      if (slides && slides[currentIndex] && elements.length === 0) {
        importSlideContent(currentIndex, slides[currentIndex])
      }
    }
  }, [
    currentIndex,
    slides,
    isInfographic,
    infographicData,
    elements.length,
    importSlideContent,
    importInfographicContent,
  ])

  // Deselect element when clicking on empty canvas area
  const handleCanvasClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget || e.target.dataset.canvasArea) {
        selectElement(null)
      }
    },
    [selectElement]
  )

  // Calculate canvas scale for react-rnd accuracy
  useEffect(() => {
    if (!canvasRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect
        // Canvas natural width is based on max width (800px for infographic, 1280px for slides)
        const naturalWidth = isInfographic ? 800 : 1280
        const scale = rect.width / naturalWidth
        setCanvasScale(scale > 0 ? scale : 1)
      }
    })
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [isInfographic])

  // Render the right tool panel based on activeTool
  const renderToolPanel = () => {
    if (readOnly || !activeTool) return null

    const panelContent = (() => {
      switch (activeTool) {
        case 'text':
          return <TextPanel slideIndex={currentIndex} />
        case 'shapes':
          return <ShapesPanel slideIndex={currentIndex} />
        case 'images':
          return <ImagesPanel slideIndex={currentIndex} />
        case 'layout':
          return <LayoutPanel slideIndex={currentIndex} />
        case 'charts':
          return <ChartsPanel slideIndex={currentIndex} />
        case 'settings':
          return <SettingsPanel slideIndex={currentIndex} />
        default:
          return null
      }
    })()

    if (!panelContent) return null

    return (
      <div className="w-64 shrink-0 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-sm overflow-y-auto max-h-[75vh] animate-in slide-in-from-left-2 fade-in duration-200">
        {/* Panel Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-200/50 dark:border-surface-800/50">
          <h3 className="text-xs font-black uppercase tracking-wider text-surface-600 dark:text-surface-300">
            {EDITOR_TOOLS.find((t) => t.id === activeTool)?.label}
          </h3>
          <button
            type="button"
            onClick={() => setActiveTool(null)}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {panelContent}
      </div>
    )
  }

  // Render overlay elements on canvas
  const renderOverlayElements = () => {
    if (elements.length === 0) return null

    return elements.map((element) => {
      const isSelected = element.id === selectedElementId

      const renderElementContent = () => {
        switch (element.type) {
          case 'text':
            return <TextElement element={element} isSelected={isSelected} />
          case 'shape':
            return <ShapeElement element={element} isSelected={isSelected} />
          case 'image':
            return <ImageElement element={element} isSelected={isSelected} />
          case 'chart':
            return <ChartElement element={element} isSelected={isSelected} />
          default:
            return (
              <div className="w-full h-full bg-surface-500/20 border border-dashed border-surface-400 rounded flex items-center justify-center text-[10px] text-surface-400">
                {element.type}
              </div>
            )
        }
      }

      return (
        <EditorElement
          key={element.id}
          element={element}
          slideIndex={currentIndex}
          isSelected={isSelected}
          canvasScale={canvasScale}
          readOnly={readOnly}
        >
          {renderElementContent()}
        </EditorElement>
      )
    })
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Tool Panel (slides out from left) */}
      {renderToolPanel()}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col justify-between gap-4 min-w-0">
        {/* Canvas */}
        <div className={`flex-1 flex items-center justify-center ${isInfographic ? 'overflow-y-auto max-h-[78vh] p-4 w-full' : ''}`}>
          <div
            ref={canvasRef}
            style={{
              backgroundColor: slideSettings.backgroundType === 'color' ? slideSettings.backgroundColor : undefined,
              backgroundImage: slideSettings.backgroundType === 'gradient'
                ? `linear-gradient(${slideSettings.gradientAngle || 135}deg, ${slideSettings.gradientColor1 || '#3b82f6'}, ${slideSettings.gradientColor2 || '#10b981'})`
                : undefined,
              aspectRatio: isInfographic ? undefined : (slideSettings.aspectRatio || '16/9'),
              width: isInfographic ? '800px' : '100%',
              minHeight: isInfographic ? '1200px' : undefined,
              '--deck-accent': slideSettings.customAccentColor || undefined,
              '--deck-title-color': slideSettings.customTitleColor || undefined,
              '--deck-title-font': slideSettings.customTitleFont || undefined,
            }}
            className={`theme-container ${themeClass} deck-bg deck-border relative overflow-hidden p-8 flex flex-col justify-between rounded-2xl shadow-2xl transition-all duration-300 ${isInfographic ? '' : 'w-full max-w-7xl'}`}
          >
            {/* Background Image Layer */}
            {slideSettings.backgroundType === 'image' && slideSettings.backgroundImage && (
              <div 
                className="absolute inset-0 pointer-events-none z-0"
                style={{ 
                  backgroundImage: `url(${slideSettings.backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: slideSettings.backgroundOpacity ?? 1,
                  filter: slideSettings.backgroundBlur ? `blur(${slideSettings.backgroundBlur}px)` : undefined,
                  transform: slideSettings.backgroundBlur ? 'scale(1.05)' : undefined // Prevent blurred edges from leaking
                }}
              />
            )}

            {/* Background blur effects */}
            <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/5 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/5 blur-[90px]" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-200/80 dark:border-surface-800/80 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4 deck-accent-text" />
                <span className="text-xs font-black deck-title truncate max-w-[200px] sm:max-w-[400px]">
                  {parsedTitle || 'Slide Deck'}
                </span>
              </div>
            </div>

            {/* Slide Content Layer + Overlay Layer */}
            <div
              className="flex-1 relative animate-in fade-in duration-300"
              onClick={handleCanvasClick}
              data-canvas-area="true"
            >
              {/* Original Slide Content (read-only visual) - Hide if we have editor elements populated */}
              {elements.length === 0 && renderSlideContent && (
                <div className="absolute inset-0 pointer-events-none z-0">
                  {renderSlideContent()}
                </div>
              )}

              {/* Overlay Elements Layer */}
              <div className="absolute inset-0 z-10" data-canvas-area="true" onClick={handleCanvasClick}>
                {renderOverlayElements()}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}
