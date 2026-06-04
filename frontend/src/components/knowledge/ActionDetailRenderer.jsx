import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  FileText,
  Keyboard,
  Users,
  Lightbulb,
  BarChart3,
  Sparkles,
  Target,
  ArrowRight,
  Palette,
  Shapes,
  ChevronLeft,
  ChevronRight,
  Download,
  Mic,
  Presentation,
  ShieldCheck,
  Activity,
  Cpu,
  CloudLightning,
  Server,
  Database,
  Image,
  LayoutGrid,
  Settings,
  Undo2,
  Redo2,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import Mindmap from './Mindmap.jsx'
import SlideEditorCanvas from './slide-editor/SlideEditorCanvas.jsx'
import useSlideEditorStore from '../../stores/useSlideEditorStore'
import { useDocumentStore } from '../../stores/documentStore.js'
import { updateKnowledgeAction } from '../../services/api.js'

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const DOWNLOAD_BG_COLOR = '#ffffff'

function toFileSafe(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'export'
}

function usePngDownload(filename) {
  const ref = useRef(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async () => {
    if (!ref.current || isDownloading) return
    setIsDownloading(true)

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: DOWNLOAD_BG_COLOR,
      })
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  return { ref, isDownloading, download }
}

function stripCodeFence(text) {
  if (!text) return ''
  const raw = String(text).trim()
  const fencedBlock = raw.match(/```\s*(?:json)?\s*\n?([\s\S]*?)```/i)
  if (fencedBlock?.[1]) {
    return fencedBlock[1].trim()
  }

  return raw
    .replace(/^```\s*(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

function extractJsonLikeText(text) {
  const cleaned = stripCodeFence(text)

  try {
    JSON.parse(cleaned)
    return cleaned
  } catch {
    // Try extracting first JSON object in the text
  }

  const objStart = cleaned.indexOf('{')
  const objEnd = cleaned.lastIndexOf('}')
  if (objStart >= 0 && objEnd > objStart) {
    return cleaned.slice(objStart, objEnd + 1)
  }

  const arrStart = cleaned.indexOf('[')
  const arrEnd = cleaned.lastIndexOf(']')
  if (arrStart >= 0 && arrEnd > arrStart) {
    return cleaned.slice(arrStart, arrEnd + 1)
  }

  return cleaned
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(extractJsonLikeText(text))
  } catch {
    return null
  }
}

function RawFallback({ answer }) {
  return (
    <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4">
      {answer}
    </pre>
  )
}

function MindmapPreview({ answer }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])
  const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : []
  const edges = Array.isArray(parsed?.edges) ? parsed.edges : []

  if (!parsed || nodes.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-500">Mindmap JSON is invalid, showing raw output instead.</p>
        <RawFallback answer={answer} />
      </div>
    )
  }

  const filename = `mindmap-${toFileSafe(parsed?.title || 'mindmap')}.png`
  const { ref, isDownloading, download } = usePngDownload(filename)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={download}
          disabled={isDownloading}
          className={
            `px-3 py-1.5 rounded-md text-[11px] border transition-colors ` +
            `${isDownloading
              ? 'bg-surface-100 text-surface-400 border-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:border-surface-700'
              : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-primary-300'
            }`
          }
        >
          {isDownloading ? 'Generating...' : 'Download PNG'}
        </button>
      </div>
      <div
        ref={ref}
        className="h-[68vh] min-h-[480px] w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-2"
      >
        <Mindmap nodes={nodes} edges={edges} />
      </div>
    </div>
  )
}

function ChartPreview({ answer }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])

  if (!parsed || !Array.isArray(parsed.labels) || !Array.isArray(parsed.datasets)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-500">Chart JSON is invalid, showing raw output instead.</p>
        <RawFallback answer={answer} />
      </div>
    )
  }

  const filename = `chart-${toFileSafe(parsed?.title || 'chart')}.png`
  const { ref, isDownloading, download } = usePngDownload(filename)

  const pickInitialMode = (chartType) => {
    const normalized = String(chartType || '').toLowerCase()
    if (normalized.includes('line')) return 'line'
    if (normalized.includes('area')) return 'area'
    if (normalized.includes('pie')) return 'pie'
    if (normalized.includes('radar')) return 'radar'
    return 'bar'
  }

  const chartData = useMemo(
    () => parsed.labels.map((label, index) => {
      const row = { name: String(label) }
      parsed.datasets.forEach((dataset, datasetIndex) => {
        const datasetName = dataset?.name || `Series ${datasetIndex + 1}`
        row[datasetName] = Number(dataset?.data?.[index] ?? 0)
      })
      return row
    }),
    [parsed],
  )

  const datasetNames = useMemo(
    () => parsed.datasets.map((dataset, i) => dataset?.name || `Series ${i + 1}`),
    [parsed],
  )

  const firstSeries = datasetNames[0]
  const pieData = useMemo(
    () => parsed.labels.map((label, index) => ({
      name: String(label),
      value: Number(parsed.datasets?.[0]?.data?.[index] ?? 0),
    })),
    [parsed],
  )

  const [mainMode, setMainMode] = useState(() => pickInitialMode(parsed.chart_type))

  useEffect(() => {
    setMainMode(pickInitialMode(parsed.chart_type))
  }, [parsed.chart_type])

  const total = Number(
    pieData.reduce((acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0), 0).toFixed(2),
  )
  const maxItem = pieData.reduce(
    (prev, current) => (current.value > prev.value ? current : prev),
    pieData[0] || { name: '-', value: 0 },
  )
  const avg = pieData.length ? Number((total / pieData.length).toFixed(2)) : 0

  const renderMainChart = () => {
    if (mainMode === 'line') {
      return (
        <LineChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {datasetNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      )
    }

    if (mainMode === 'area') {
      return (
        <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
          <defs>
            {datasetNames.map((name, i) => (
              <linearGradient key={`grad-${name}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {datasetNames.map((name, i) => (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={`url(#grad-${i})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      )
    }

    if (mainMode === 'pie') {
      return (
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            innerRadius={56}
            paddingAngle={2}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      )
    }

    if (mainMode === 'radar') {
      return (
        <RadarChart data={chartData} outerRadius={120}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis />
          <Tooltip />
          <Legend />
          {datasetNames.map((name, i) => (
            <Radar
              key={name}
              name={name}
              dataKey={name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.25}
            />
          ))}
        </RadarChart>
      )
    }

    return (
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {datasetNames.map((name, i) => (
          <Bar key={name} dataKey={name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    )
  }

  const MODES = [
    { id: 'bar', label: 'Bar' },
    { id: 'line', label: 'Line' },
    { id: 'area', label: 'Area' },
    { id: 'pie', label: 'Pie' },
    { id: 'radar', label: 'Radar' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={download}
          disabled={isDownloading}
          className={
            `px-3 py-1.5 rounded-md text-[11px] border transition-colors ` +
            `${isDownloading
              ? 'bg-surface-100 text-surface-400 border-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:border-surface-700'
              : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-primary-300'
            }`
          }
        >
          {isDownloading ? 'Generating...' : 'Download PNG'}
        </button>
      </div>

      <div ref={ref} className="space-y-4">
        <div className="rounded-xl border border-surface-200 dark:border-surface-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-surface-900 dark:to-surface-800 p-4">
          <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-100">
            {parsed.title || 'Chart'}
          </h4>
          <p className="text-xs text-surface-500 dark:text-surface-300">
            {parsed.x_label || 'X'} vs {parsed.y_label || 'Y'}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg bg-white/80 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-2">
              <p className="text-[11px] text-surface-500">Total</p>
              <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{total}</p>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-2">
              <p className="text-[11px] text-surface-500">Average</p>
              <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{avg}</p>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-2">
              <p className="text-[11px] text-surface-500">Top category</p>
              <p className="text-sm font-bold text-surface-900 dark:text-surface-100 truncate" title={maxItem.name}>
                {maxItem.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setMainMode(mode.id)}
              className={
                `px-2.5 py-1 rounded-md text-[11px] border transition-colors ` +
                `${mainMode === mode.id
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-primary-300'
                }`
              }
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="h-[360px] w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            {renderMainChart()}
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-[260px] w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-2">
            <p className="text-xs font-semibold text-surface-600 dark:text-surface-300 px-2 pt-1">Trend</p>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                {datasetNames.map((name, i) => (
                  <Line
                    key={`mini-line-${name}`}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[260px] w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-2">
            <p className="text-xs font-semibold text-surface-600 dark:text-surface-300 px-2 pt-1">Distribution</p>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Tooltip />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`mini-cell-${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="h-[280px] w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-2">
          <p className="text-xs font-semibold text-surface-600 dark:text-surface-300 px-2 pt-1">Radar overview</p>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart data={chartData} outerRadius={100}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              <Tooltip />
              <Legend />
              {datasetNames.map((name, i) => (
                <Radar
                  key={`mini-radar-${name}`}
                  name={name}
                  dataKey={name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {firstSeries && (
          <p className="text-[11px] text-surface-500 dark:text-surface-400">
            Primary series: {firstSeries}
          </p>
        )}
      </div>
    </div>
  )
}

function getSlideIcon(iconName) {
  const name = String(iconName || '').toLowerCase()
  if (name.includes('database')) return Database
  if (name.includes('server')) return Server
  if (name.includes('shield-check') || name.includes('shield')) return ShieldCheck
  if (name.includes('users') || name.includes('user') || name.includes('people')) return Users
  if (name.includes('bar-chart') || name.includes('chart')) return BarChart3
  if (name.includes('activity')) return Activity
  if (name.includes('cpu')) return Cpu
  if (name.includes('cloud-lightning') || name.includes('lightning')) return CloudLightning
  return FileText
}

function ShareDropdown({ onDownloadPNG, onExportPDF, onExportPPTX, isDownloading }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Share / Export</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => {
              onDownloadPNG()
              setIsOpen(false)
            }}
            disabled={isDownloading}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Generating PNG...' : 'Download PNG'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onExportPDF()
              setIsOpen(false)
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-red-500" />
            <span>Export to PDF</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onExportPPTX()
              setIsOpen(false)
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-500" />
            <span>Export to PPTX (Beta)</span>
          </button>
        </div>
      )}
    </div>
  )
}

function SlidesPreview({ actionId, answer, isFullscreen, citations, onToggleFullscreen, onRenderHeaderActions }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [theme, setTheme] = useState('default')
  const [isEditing, setIsEditing] = useState(false)

  // Move useSlideEditorStore hooks to top level to obey Rules of Hooks
  const activeTool = useSlideEditorStore((s) => s.activeTool)
  const setActiveTool = useSlideEditorStore((s) => s.setActiveTool)
  const elements = useSlideEditorStore((s) => s.elements)
  const slideSettings = useSlideEditorStore((s) => s.slideSettings)
  const slideOverrides = useSlideEditorStore((s) => s.slideOverrides)
  const undo = useSlideEditorStore((s) => s.undo)
  const redo = useSlideEditorStore((s) => s.redo)
  const pastHistory = useSlideEditorStore((s) => s.pastHistory)
  const futureHistory = useSlideEditorStore((s) => s.futureHistory)

  const stateInitializedRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'error'

  const selectedAction = useDocumentStore((s) =>
    s.actionResults.find((item) => item.id === actionId)
  )

  // Initialize store state when starting edit mode
  useEffect(() => {
    if (isEditing && actionId) {
      useSlideEditorStore.getState().initActionState(actionId, selectedAction?.editorState)
      stateInitializedRef.current = false
      const timer = setTimeout(() => {
        stateInitializedRef.current = true
      }, 300)
      return () => clearTimeout(timer)
    } else {
      stateInitializedRef.current = false
    }
  }, [isEditing, actionId, selectedAction?.editorState])

  // Debounced Auto-save on elements/settings changes
  useEffect(() => {
    if (!isEditing || !actionId || !stateInitializedRef.current) return

    setSaveStatus('saving')
    const delayDebounce = setTimeout(async () => {
      try {
        const activeState = useSlideEditorStore.getState()
        const editorState = {
          elements: activeState.elements,
          slideSettings: activeState.slideSettings,
          slideOverrides: activeState.slideOverrides,
        }

        await updateKnowledgeAction(actionId, editorState, null)

        // Save updated editorState in local document store
        useDocumentStore.setState((state) => ({
          actionResults: state.actionResults.map((item) =>
            item.id === actionId ? { ...item, editorState } : item
          ),
        }))

        setSaveStatus('saved')
      } catch (err) {
        console.error('Failed to auto-save slide edits:', err)
        setSaveStatus('error')
      }
    }, 1500)

    return () => clearTimeout(delayDebounce)
  }, [elements, slideSettings, slideOverrides, isEditing, actionId])

  if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-500">Slides JSON is invalid, showing raw output instead.</p>
        <RawFallback answer={answer} />
      </div>
    )
  }

  const slides = parsed.slides
  const currentSlide = slides[currentIndex]
  const totalSlides = slides.length

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleDownload = () => {
    if (currentSlide.image) {
      const link = document.createElement('a')
      link.download = `slide-${currentIndex + 1}-${toFileSafe(parsed?.title || 'presentation')}.png`
      link.href = currentSlide.image
      link.click()
    } else {
      triggerHtmlDownload()
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleExportPPTX = () => {
    alert(navigator.language.startsWith('th') 
      ? 'กำลังจัดเตรียมไฟล์ดาวน์โหลด PPTX Slide Deck...' 
      : 'Preparing PPTX Slide Deck for download...')
    // Simulated export
    const link = document.createElement('a')
    link.href = '#'
    link.download = `deck-${toFileSafe(parsed?.title || 'presentation')}.pptx`
    link.click()
  }

  const filename = `slide-${currentIndex + 1}-${toFileSafe(parsed?.title || 'presentation')}.png`
  const { ref, isDownloading, download: triggerHtmlDownload } = usePngDownload(filename)

  const SlideIcon = getSlideIcon(currentSlide.icon_name)
  const themeClass = theme === 'default' ? 'theme-container' : `theme-${theme}`

  // Render the Edit and Share buttons to the parent container when not editing
  useEffect(() => {
    if (onRenderHeaderActions) {
      if (!isEditing) {
        onRenderHeaderActions(
          <div className="flex items-center gap-2">
            {/* Tooltip Hover for Reference Sources */}
            <div className="relative group/cite">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer border border-surface-250 dark:border-surface-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-500 animate-pulse" />
                <span>แหล่งอ้างอิง (Citations)</span>
              </button>

              <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl z-50 p-4 space-y-2.5 opacity-0 pointer-events-none group-hover/cite:opacity-100 group-hover/cite:pointer-events-auto transition-all duration-200 scale-95 origin-top-right group-hover/cite:scale-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-surface-650 dark:text-surface-300 flex items-center gap-1.5 border-b border-surface-200/50 dark:border-surface-800/50 pb-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <span>Reference Sources (แหล่งอ้างอิง)</span>
                </h4>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {Array.isArray(citations) && citations.length > 0 ? (
                    citations.map((cite, idx) => {
                      const isWeb = cite.source_type === 'web' || cite.url
                      return (
                        <div
                          key={`cite-tooltip-${idx}`}
                          className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 transition-all hover:bg-surface-50 dark:hover:bg-surface-850 ${
                            isWeb
                              ? 'border-sky-100 bg-sky-50/20 dark:border-sky-900/40 dark:bg-sky-950/10'
                              : 'border-surface-200 bg-surface-50/40 dark:border-surface-800'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isWeb ? 'bg-sky-500' : 'bg-primary-500'}`} />
                            <p className="text-[10px] font-bold text-surface-800 dark:text-surface-200 break-all line-clamp-2">
                              {cite.file_name || cite.url}
                            </p>
                          </div>

                          {cite.text_snippet && (
                            <p className="text-[9px] text-surface-500 dark:text-surface-400 bg-white dark:bg-surface-900/50 p-1.5 rounded leading-relaxed border border-surface-200/50 dark:border-surface-700/50 line-clamp-3">
                              "{cite.text_snippet}"
                            </p>
                          )}

                          <div className="flex items-center justify-between border-t border-surface-200/50 dark:border-surface-800/50 pt-1.5 mt-1 shrink-0">
                            <span className="text-[8px] font-mono text-surface-450">
                              {isWeb ? 'WEB SOURCE' : `PAGE ${cite.page_label || 'N/A'}`}
                            </span>
                            {isWeb && cite.url && (
                              <a
                                href={cite.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[8px] font-black uppercase text-sky-600 hover:text-sky-700 tracking-wider inline-flex items-center gap-0.5"
                              >
                                <span>Open url</span>
                                <ArrowRight className="w-2 h-2" />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 text-surface-400">
                      <FileText className="w-6 h-6 mb-1 opacity-55" />
                      <p className="text-[10px]">ไม่มีแหล่งอ้างอิงสำหรับชุดคำตอบนี้</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsEditing(true)
                if (onToggleFullscreen) onToggleFullscreen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-semibold hover:bg-surface-50 dark:hover:bg-surface-700 transition-all cursor-pointer text-surface-700 dark:text-surface-200"
            >
              <Palette className="w-3.5 h-3.5 text-primary-500" />
              <span>แก้ไข (Edit)</span>
            </button>
            <ShareDropdown
              onDownloadPNG={handleDownload}
              onExportPDF={handleExportPDF}
              onExportPPTX={handleExportPPTX}
              isDownloading={isDownloading}
            />
          </div>
        )
      } else {
        // Clear buttons in editor mode (editor mode has its own header bar)
        onRenderHeaderActions(null)
      }
    }
    return () => {
      if (onRenderHeaderActions) onRenderHeaderActions(null)
    }
  }, [isEditing, isDownloading, currentIndex, theme, onRenderHeaderActions, citations])

  const renderSlideContent = () => {
    const layout = String(currentSlide.layout_type || 'hero').toLowerCase()
    const keyPoints = Array.isArray(currentSlide.key_points) ? currentSlide.key_points : []

    if (layout === 'grid-card') {
      return (
        <div className="flex-1 flex flex-col justify-center my-3 relative z-10 px-2 overflow-hidden">
          <h3 className="text-sm font-bold deck-title tracking-tight leading-tight mb-3 flex items-center gap-2">
            <SlideIcon className="w-5 h-5 deck-accent-text" />
            {currentSlide.slide_title}
          </h3>
          {currentSlide.slide_description && (
            <p className="text-[10px] text-surface-500 mb-3 italic leading-relaxed line-clamp-1">{currentSlide.slide_description}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-y-auto max-h-[22vh] py-1">
            {keyPoints.map((pt, pIdx) => (
              <div key={pIdx} className="deck-card p-3 flex flex-col justify-start relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-5 h-5 rounded-full deck-accent-bg text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                    {pIdx + 1}
                  </span>
                  <span className="text-[9px] font-bold deck-title">Point {pIdx + 1}</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-surface-600 dark:text-surface-300 font-medium line-clamp-4">{pt}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (layout === 'timeline') {
      return (
        <div className="flex-1 flex flex-col justify-center my-3 relative z-10 px-2 overflow-hidden">
          <h3 className="text-sm font-bold deck-title tracking-tight leading-tight mb-3 flex items-center gap-2">
            <SlideIcon className="w-5 h-5 deck-accent-text" />
            {currentSlide.slide_title}
          </h3>
          {currentSlide.slide_description && (
            <p className="text-[10px] text-surface-500 mb-3 italic leading-relaxed line-clamp-1">{currentSlide.slide_description}</p>
          )}
          <div className="relative flex items-center justify-between gap-4 overflow-x-auto max-h-[22vh] py-2 px-4">
            {/* Connector Line */}
            <div className="absolute top-8 left-10 right-10 h-0.5 deck-accent-bg opacity-30 z-0 hidden md:block"></div>
            
            {keyPoints.map((pt, pIdx) => (
              <div key={pIdx} className="relative z-10 flex-1 min-w-[140px] flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full deck-accent-bg text-white text-xs font-black flex items-center justify-center shadow-lg shadow-primary-500/20 mb-2 transition-transform duration-300 hover:scale-110">
                  {pIdx + 1}
                </div>
                <p className="text-[10.5px] leading-relaxed text-surface-600 dark:text-surface-300 font-medium line-clamp-4 px-1">{pt}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (layout === 'stat') {
      return (
        <div className="flex-1 flex flex-col justify-center my-3 relative z-10 px-2 overflow-hidden">
          <h3 className="text-sm font-bold deck-title tracking-tight leading-tight mb-3 flex items-center gap-2">
            <SlideIcon className="w-5 h-5 deck-accent-text" />
            {currentSlide.slide_title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-y-auto max-h-[22vh] py-1">
            {keyPoints.map((pt, pIdx) => {
              // Extract the first number found in the point as a metric
              const numberMatch = pt.match(/(\d+[\d,.]*\s*%?)/)
              const metric = numberMatch ? numberMatch[0] : `0${pIdx + 1}`
              const desc = pt.replace(metric, '').trim()
              return (
                <div key={pIdx} className="deck-card p-3 flex flex-col justify-between items-center text-center border-l-4 border-l-[var(--accent-color)]">
                  <span className="text-2xl font-black deck-accent-text font-mono leading-none tracking-tight mb-1">{metric}</span>
                  <p className="text-[10px] leading-relaxed text-surface-500 dark:text-surface-400 font-semibold line-clamp-3">{desc || pt}</p>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (layout === 'split-media') {
      return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 my-3 relative z-10 px-2 overflow-hidden items-stretch">
          <div className="md:col-span-5 deck-card p-4 flex flex-col justify-between border-l-4 border-l-[var(--accent-color)]">
            <div>
              <div className="w-9 h-9 rounded-xl deck-accent-bg/10 flex items-center justify-center mb-2">
                <SlideIcon className="w-5 h-5 deck-accent-text" />
              </div>
              <h3 className="text-sm font-black deck-title leading-tight mb-2">{currentSlide.slide_title}</h3>
              {currentSlide.slide_description && (
                <p className="text-[10.5px] leading-relaxed text-surface-650 dark:text-slate-300 font-medium line-clamp-5">{currentSlide.slide_description}</p>
              )}
            </div>
            <div className="text-[9px] font-mono text-surface-400 uppercase tracking-widest">Visual Narrative</div>
          </div>
          <div className="md:col-span-7 flex flex-col justify-center gap-2 overflow-y-auto max-h-[22vh]">
            {keyPoints.map((pt, pIdx) => (
              <div key={pIdx} className="deck-card p-2.5 flex items-start gap-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full deck-accent-bg shrink-0"></span>
                <p className="text-[10.5px] leading-relaxed text-surface-650 dark:text-slate-300 font-medium">{pt}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Fallback 'hero' layout (large text, display quote style)
    return (
      <div className="flex-1 flex flex-col justify-center my-3 relative z-10 px-2 overflow-hidden">
        <div>
          <div className="flex items-center gap-2 border-b border-surface-200/80 dark:border-surface-800/80 pb-2 mb-3">
            <div className="w-7 h-7 rounded-lg deck-accent-bg/10 flex items-center justify-center shrink-0">
              <SlideIcon className="w-4 h-4 deck-accent-text" />
            </div>
            <h3 className="text-sm font-bold deck-title tracking-tight leading-tight truncate">{currentSlide.slide_title}</h3>
          </div>

          {currentSlide.slide_description && (
            <p className="text-[11px] text-surface-500 italic bg-black/[0.02] dark:bg-white/[0.02] border-l-2 border-l-[var(--accent-color)] pl-3 py-1.5 mb-3 rounded-r leading-relaxed">
              {currentSlide.slide_description}
            </p>
          )}

          {keyPoints.length > 0 && (
            <ul className="space-y-1.5 pl-1 overflow-y-auto max-h-[16vh]">
              {keyPoints.map((pt, pIdx) => (
                <li key={pIdx} className="flex items-start gap-2 text-[10.5px] text-surface-600 dark:text-surface-300 leading-relaxed font-medium">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full deck-accent-bg shrink-0 shadow shadow-primary-500/50"></span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
      </div>
    )
  }

  // 1. Standalone / Clean View Mode
  if (!isEditing) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        {/* Clean 16:9 Slide Canvas Panel */}
        <div className="w-full max-w-7xl mt-6 relative group">
          {selectedAction?.editorState ? (
            <SlideEditorCanvas
              slides={slides}
              parsedTitle={parsed.title}
              currentIndex={currentIndex}
              theme={theme}
              themeClass={themeClass}
              renderSlideContent={renderSlideContent}
              slideOverrides={useSlideEditorStore.getState().slideOverrides}
              canvasRef={ref}
              readOnly={true}
            />
          ) : (
            <div
              ref={ref}
              className={`theme-container ${themeClass} deck-bg deck-border relative overflow-hidden p-8 flex flex-col justify-between aspect-[16/9] w-full rounded-2xl shadow-xl transition-all duration-300`}
            >
              <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/5 blur-[90px]"></div>
              <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/5 blur-[90px]"></div>

              <div className="flex items-center justify-between border-b border-surface-200/80 dark:border-surface-800/80 pb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <Presentation className="w-4 h-4 deck-accent-text" />
                  <span className="text-xs font-bold deck-title truncate max-w-[300px]">{parsed.title || 'Slide Deck'}</span>
                </div>
                
              </div>

              {renderSlideContent()}
            </div>
          )}

          {/* Quick Nav Overlay buttons */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all disabled:opacity-0 pointer-events-auto"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === totalSlides - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all disabled:opacity-0 pointer-events-auto"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots Navigator */}
        <div className="flex flex-wrap gap-1.5 justify-center py-1">
          {slides.map((s, idx) => {
            const isActive = idx === currentIndex
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary-500 border-primary-500 text-white shadow'
                    : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 2. Canva / Gamma Editor Mode (3-column layout)

  const leftEditorTools = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'shapes', label: 'Shapes', icon: Shapes },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'layout', label: 'Layout', icon: LayoutGrid },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="w-full h-full flex flex-col p-6 md:flex-row items-stretch justify-between gap-4 animate-in fade-in duration-300 min-h-[75vh] overflow-auto">
      
      {/* COLUMN 1: LEFT SIDEBAR EDITOR TOOLS */}
      <div className="w-full md:w-20 md:h-fit mt-32 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-3 flex flex-row md:flex-col items-center justify-between md:justify-start gap-2 shrink-0 shadow-sm">
        <div className="flex flex-row md:flex-col items-center gap-1.5 w-full">
          {leftEditorTools.map((tool) => {
            const ToolIcon = tool.icon
            const isActive = activeTool === tool.id
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/30'
                    : 'hover:bg-surface-100 dark:hover:bg-surface-850 text-surface-550 dark:text-surface-300'
                }`}
              >
                <ToolIcon className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-primary-500' : 'group-hover:text-primary-500'
                }`} />
                <span className={`text-[9px] font-bold tracking-tight ${
                  isActive ? 'text-primary-500' : ''
                }`}>{tool.label}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false)
            setActiveTool(null)
            if (onToggleFullscreen) onToggleFullscreen(false)
          }}
          className="mt-auto px-2 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-lg text-[9px] font-bold transition-all cursor-pointer uppercase tracking-widest hidden md:block"
        >
          Close
        </button>
      </div>

      {/* COLUMN 2: CENTER CANVAS WORKSPACE */}
      <div className="flex-1 flex flex-col justify-between gap-4 min-w-0">
        {/* Editor navbar controls (Theme selector + fullscreen toggler) */}
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 rounded-2xl p-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Theme</span>
              <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-850 p-0.5 rounded-lg">
                {[
                  { id: 'default', label: 'Default', icon: Sparkles },
                  { id: 'swiss', label: 'Swiss', icon: Target },
                  { id: 'retro', label: 'Retro', icon: Palette },
                  { id: 'tech', label: 'Tech', icon: Cpu },
                ].map((t) => {
                  const Icon = t.icon
                  const isSelected = theme === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'text-surface-600 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-800'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Undo / Redo controls */}
            <div className="h-5 w-[1px] bg-surface-200 dark:bg-surface-800 hidden sm:block" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={pastHistory.length === 0}
                title="Undo (เลิกทำ)"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={futureHistory.length === 0}
                title="Redo (ทำซ้ำ)"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Save indicator */}
            <div className="h-5 w-[1px] bg-surface-200 dark:bg-surface-800 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-surface-500">
              <span className={`w-2 h-2 rounded-full ${
                saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                saveStatus === 'error' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <span className="font-semibold uppercase tracking-wider text-[9px]">
                {saveStatus === 'saving' ? 'Saving...' :
                 saveStatus === 'error' ? 'Save Error' : 'Saved'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <ShareDropdown
              onDownloadPNG={handleDownload}
              onExportPDF={handleExportPDF}
              onExportPPTX={handleExportPPTX}
              isDownloading={isDownloading}
            />

            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setActiveTool(null)
                if (onToggleFullscreen) onToggleFullscreen(false)
              }}
              className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-250 dark:border-surface-700 text-surface-750 dark:text-surface-250 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close Editor
            </button>
          </div>
        </div>

        {/* Main Canvas with Tool Panel + Overlay Elements */}
        <SlideEditorCanvas
          slides={slides}
          parsedTitle={parsed.title}
          currentIndex={currentIndex}
          theme={theme}
          themeClass={themeClass}
          renderSlideContent={renderSlideContent}
          slideOverrides={useSlideEditorStore.getState().slideOverrides}
          canvasRef={ref}
        />

        {/* Page navigator footer */}
        <div className="flex items-center justify-center mb-12 gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer text-surface-700 dark:text-surface-300"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[260px] sm:max-w-md py-1">
            {slides.map((s, idx) => {
              const isActive = idx === currentIndex
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-500 border-primary-500 text-white shadow shadow-primary-500/25'
                      : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === totalSlides - 1}
            className="p-2 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer text-surface-700 dark:text-surface-300"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function getInfoIcon(iconHint) {
  const hint = String(iconHint || '').toLowerCase()

  if (hint.includes('keyboard') || hint.includes('input') || hint.includes('type')) return Keyboard
  if (hint.includes('people') || hint.includes('user') || hint.includes('team')) return Users
  if (hint.includes('chart') || hint.includes('graph') || hint.includes('stat')) return BarChart3
  if (hint.includes('idea') || hint.includes('light') || hint.includes('insight')) return Lightbulb
  if (hint.includes('design') || hint.includes('style') || hint.includes('palette')) return Palette
  if (hint.includes('shape') || hint.includes('layout') || hint.includes('structure')) return Shapes
  return FileText
}

function hashText(text) {
  let hash = 0
  const input = String(text || '')
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const INFOGRAPHIC_THEMES = [
  {
    shell: 'from-cyan-50 to-blue-50 dark:from-slate-900 dark:to-slate-800',
    accentText: 'text-cyan-700 dark:text-cyan-300',
    accentBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    ctaBg: 'bg-cyan-50 dark:bg-cyan-900/20',
    ctaBorder: 'border-cyan-200 dark:border-cyan-900/60',
  },
  {
    shell: 'from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    ctaBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    ctaBorder: 'border-emerald-200 dark:border-emerald-900/60',
  },
  {
    shell: 'from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800',
    accentText: 'text-amber-700 dark:text-amber-300',
    accentBg: 'bg-amber-100 dark:bg-amber-900/40',
    ctaBg: 'bg-amber-50 dark:bg-amber-900/20',
    ctaBorder: 'border-amber-200 dark:border-amber-900/60',
  },
  {
    shell: 'from-violet-50 to-fuchsia-50 dark:from-slate-900 dark:to-slate-800',
    accentText: 'text-violet-700 dark:text-violet-300',
    accentBg: 'bg-violet-100 dark:bg-violet-900/40',
    ctaBg: 'bg-violet-50 dark:bg-violet-900/20',
    ctaBorder: 'border-violet-200 dark:border-violet-900/60',
  },
]

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function deriveHighlights(text) {
  if (!text) return []
  const normalized = String(text).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const chunks = normalized
    .split(/[.;!?。]|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  return chunks.slice(0, 3)
}

function getSectionHighlights(section) {
  if (Array.isArray(section?.highlights) && section.highlights.length > 0) {
    return section.highlights.slice(0, 3)
  }
  return deriveHighlights(section?.summary)
}

function InfographicPreview({ actionId, answer, isFullscreen, onToggleFullscreen, onRenderHeaderActions }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])
  const [theme, setTheme] = useState('default')
  const [isEditing, setIsEditing] = useState(false)

  const activeTool = useSlideEditorStore((s) => s.activeTool)
  const setActiveTool = useSlideEditorStore((s) => s.setActiveTool)
  const elements = useSlideEditorStore((s) => s.elements)
  const slideSettings = useSlideEditorStore((s) => s.slideSettings)
  const slideOverrides = useSlideEditorStore((s) => s.slideOverrides)
  const undo = useSlideEditorStore((s) => s.undo)
  const redo = useSlideEditorStore((s) => s.redo)
  const pastHistory = useSlideEditorStore((s) => s.pastHistory)
  const futureHistory = useSlideEditorStore((s) => s.futureHistory)

  const stateInitializedRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'error'

  const selectedAction = useDocumentStore((s) =>
    s.actionResults.find((item) => item.id === actionId)
  )

  // Initialize store state when starting edit mode
  useEffect(() => {
    if (isEditing && actionId) {
      useSlideEditorStore.getState().initActionState(actionId, selectedAction?.editorState)
      stateInitializedRef.current = false
      const timer = setTimeout(() => {
        stateInitializedRef.current = true
      }, 300)
      return () => clearTimeout(timer)
    } else {
      stateInitializedRef.current = false
    }
  }, [isEditing, actionId, selectedAction?.editorState])

  // Debounced Auto-save on elements/settings changes
  useEffect(() => {
    if (!isEditing || !actionId || !stateInitializedRef.current) return

    setSaveStatus('saving')
    const delayDebounce = setTimeout(async () => {
      try {
        const activeState = useSlideEditorStore.getState()
        const editorState = {
          elements: activeState.elements,
          slideSettings: activeState.slideSettings,
          slideOverrides: activeState.slideOverrides,
        }

        await updateKnowledgeAction(actionId, editorState, null)

        // Save updated editorState in local document store
        useDocumentStore.setState((state) => ({
          actionResults: state.actionResults.map((item) =>
            item.id === actionId ? { ...item, editorState } : item
          ),
        }))

        setSaveStatus('saved')
      } catch (err) {
        console.error('Failed to auto-save infographic edits:', err)
        setSaveStatus('error')
      }
    }, 1500)

    return () => clearTimeout(delayDebounce)
  }, [elements, slideSettings, slideOverrides, isEditing, actionId])

  if (!parsed || !Array.isArray(parsed.sections)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-500">Infographic JSON is invalid, showing raw output instead.</p>
        <RawFallback answer={answer} />
      </div>
    )
  }

  const filename = `infographic-${toFileSafe(parsed?.headline || 'infographic')}.png`
  const { ref, isDownloading, download } = usePngDownload(filename)

  const stats = Array.isArray(parsed.key_stats) ? parsed.key_stats.slice(0, 6) : []
  const maxStat = Math.max(1, ...stats.map((stat) => toNumber(stat?.value)))

  const themeClass = theme === 'default' ? 'theme-container' : `theme-${theme}`

  // Render the Edit button to the parent container when not editing
  useEffect(() => {
    if (onRenderHeaderActions) {
      if (!isEditing) {
        onRenderHeaderActions(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true)
                if (onToggleFullscreen) onToggleFullscreen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-semibold hover:bg-surface-50 dark:hover:bg-surface-700 transition-all cursor-pointer text-surface-700 dark:text-surface-200"
            >
              <Palette className="w-3.5 h-3.5 text-primary-500" />
              <span>แก้ไข (Edit)</span>
            </button>
          </div>
        )
      } else {
        onRenderHeaderActions(null)
      }
    }
    return () => {
      if (onRenderHeaderActions) onRenderHeaderActions(null)
    }
  }, [isEditing, onRenderHeaderActions, onToggleFullscreen])

  const handleDownload = () => {
    download()
  }

  const handleExportPDF = () => {
    window.print()
  }

  if (isEditing) {
    const leftEditorTools = [
      { id: 'text', label: 'Text', icon: FileText },
      { id: 'shapes', label: 'Shapes', icon: Shapes },
      { id: 'images', label: 'Images', icon: Image },
      { id: 'layout', label: 'Layout', icon: LayoutGrid },
      { id: 'charts', label: 'Charts', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
      <div className="w-full h-full flex flex-col p-6 md:flex-row items-stretch justify-between gap-4 animate-in fade-in duration-300 min-h-[75vh] overflow-auto">
        
        {/* COLUMN 1: LEFT SIDEBAR EDITOR TOOLS */}
        <div className="w-full md:w-20 md:h-fit mt-32 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-3 flex flex-row md:flex-col items-center justify-between md:justify-start gap-2 shrink-0 shadow-sm">
          <div className="flex flex-row md:flex-col items-center gap-1.5 w-full">
            {leftEditorTools.map((tool) => {
              const ToolIcon = tool.icon
              const isActive = activeTool === tool.id
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/30'
                      : 'hover:bg-surface-100 dark:hover:bg-surface-850 text-surface-550 dark:text-surface-300'
                  }`}
                >
                  <ToolIcon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary-500' : 'group-hover:text-primary-500'
                  }`} />
                  <span className={`text-[9px] font-bold tracking-tight ${
                    isActive ? 'text-primary-500' : ''
                  }`}>{tool.label}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setActiveTool(null)
              if (onToggleFullscreen) onToggleFullscreen(false)
            }}
            className="mt-auto px-2 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-lg text-[9px] font-bold transition-all cursor-pointer uppercase tracking-widest hidden md:block"
          >
            Close
          </button>
        </div>

        {/* COLUMN 2: CENTER CANVAS WORKSPACE */}
        <div className="flex-1 flex flex-col justify-between gap-4 min-w-0">
          {/* Editor navbar controls (Theme selector) */}
          <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-surface-900/80 border border-surface-200 dark:border-surface-800 rounded-2xl p-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Theme</span>
                <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-850 p-0.5 rounded-lg">
                  {[
                    { id: 'default', label: 'Default', icon: Sparkles },
                    { id: 'swiss', label: 'Swiss', icon: Target },
                    { id: 'retro', label: 'Retro', icon: Palette },
                    { id: 'tech', label: 'Tech', icon: Cpu },
                  ].map((t) => {
                    const Icon = t.icon
                    const isSelected = theme === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary-500 text-white shadow-sm'
                            : 'text-surface-600 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-800'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Undo / Redo controls */}
              <div className="h-5 w-[1px] bg-surface-200 dark:bg-surface-800 hidden sm:block" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={pastHistory.length === 0}
                  title="Undo (เลิกทำ)"
                  className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={futureHistory.length === 0}
                  title="Redo (ทำซ้ำ)"
                  className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Save indicator */}
              <div className="h-5 w-[1px] bg-surface-200 dark:bg-surface-800 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs text-surface-500">
                <span className={`w-2 h-2 rounded-full ${
                  saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                  saveStatus === 'error' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                <span className="font-semibold uppercase tracking-wider text-[9px]">
                  {saveStatus === 'saving' ? 'Saving...' :
                   saveStatus === 'error' ? 'Save Error' : 'Saved'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Exporting...' : 'Download PNG'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-lg text-xs font-semibold shadow-sm hover:bg-surface-50 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-red-500" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setActiveTool(null)
                  if (onToggleFullscreen) onToggleFullscreen(false)
                }}
                className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-250 dark:border-surface-700 text-surface-750 dark:text-surface-250 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Editor
              </button>
            </div>
          </div>

          {/* Main Canvas with Tool Panel + Overlay Elements */}
          <SlideEditorCanvas
            slides={null}
            parsedTitle={parsed.headline}
            currentIndex={0}
            theme={theme}
            themeClass={themeClass}
            renderSlideContent={null}
            slideOverrides={useSlideEditorStore.getState().slideOverrides}
            isInfographic={true}
            infographicData={parsed}
            canvasRef={ref}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Theme Control & Download Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-3 shadow-sm relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Shapes className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-surface-800 dark:text-surface-100 truncate max-w-[150px] sm:max-w-[200px]">
              {parsed.headline || 'Visualized Infographic'}
            </h4>
            <p className="text-[10px] text-surface-500">
              Interactive Web Infographic
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-0.5 rounded-lg border border-surface-200/50 dark:border-surface-700/50">
            {[
              { id: 'default', label: 'Default', icon: Sparkles },
              { id: 'swiss', label: 'Swiss', icon: Target },
              { id: 'retro', label: 'Retro', icon: Palette },
              { id: 'tech', label: 'Tech', icon: Cpu },
            ].map((t) => {
              const Icon = t.icon
              const isSelected = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  title={`${t.label} Theme`}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-surface-600 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={download}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-[10px] font-semibold shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-3 h-3" />
            <span>{isDownloading ? 'Exporting...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Infographic Canvas */}
      {selectedAction?.editorState ? (
        <div className="w-full flex justify-center">
          <SlideEditorCanvas
            slides={null}
            parsedTitle={parsed.headline}
            currentIndex={0}
            theme={theme}
            themeClass={themeClass}
            renderSlideContent={null}
            slideOverrides={useSlideEditorStore.getState().slideOverrides}
            isInfographic={true}
            infographicData={parsed}
            canvasRef={ref}
            readOnly={true}
          />
        </div>
      ) : (
        <div
          ref={ref}
          className={`theme-container ${themeClass} deck-bg deck-border relative overflow-hidden p-6 space-y-4 shadow-xl transition-all duration-300`}
        >
          <div className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/5 dark:bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 w-44 h-44 rounded-full bg-white/5 dark:bg-white/5 blur-2xl" />

          <div className="relative deck-card p-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-bold deck-title">{parsed.headline || 'Infographic'}</h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold deck-accent-bg text-white shadow-sm">
                <Palette className="w-3 h-3" />
                Theme: {theme.toUpperCase()}
              </span>
            </div>

            {parsed.subheadline && <p className="text-xs text-surface-550 dark:text-slate-400 mt-1.5 leading-relaxed">{parsed.subheadline}</p>}
          </div>

          {stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {stats.map((stat, idx) => {
                const val = toNumber(stat?.value)
                const ratio = Math.max(8, Math.round((val / maxStat) * 100))
                return (
                  <div key={`stat-${idx}`} className="deck-card p-3 flex flex-col justify-between border-l-4 border-l-[var(--accent-color)]">
                    <p className="text-[10px] text-surface-500 dark:text-slate-400 truncate" title={stat.label || `Stat ${idx + 1}`}>{stat.label || `Stat ${idx + 1}`}</p>
                    <p className="text-lg font-black deck-title mt-1 leading-none font-mono">
                      {stat.value} <span className="text-[10px] font-medium text-surface-400 font-sans">{stat.unit || ''}</span>
                    </p>
                    <div className="mt-2.5 h-1 rounded-full bg-black/25 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full deck-accent-bg" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {parsed.sections.map((section, idx) => {
              const Icon = getInfoIcon(section.icon_hint || section.icon_name)
              const highlights = getSectionHighlights(section)
              return (
                <div key={`section-${idx}`} className="deck-card p-4 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg deck-accent-bg/10 inline-flex items-center justify-center shrink-0 border border-primary-500/10">
                      <Icon className="w-4 h-4 deck-accent-text" />
                    </span>
                    <h5 className="text-xs font-black deck-title uppercase tracking-wider">{section.title || `Section ${idx + 1}`}</h5>
                  </div>
                  <p className="text-xs text-surface-650 dark:text-slate-350 leading-relaxed">{section.summary || ''}</p>

                  {highlights.length > 0 && (
                    <div className="border-t border-surface-200/50 dark:border-surface-800/50 pt-3 space-y-2 mt-1">
                      {highlights.map((point, pIdx) => (
                        <div key={`h-${idx}-${pIdx}`} className="text-[10.5px] text-surface-550 dark:text-slate-400 flex items-start gap-2 leading-normal">
                          <i data-lucide="check" className="w-3.5 h-3.5 deck-accent-text shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {parsed.call_to_action && (
            <div className="deck-card p-4 border-l-4 border-l-[var(--accent-color)]">
              <p className="text-[10px] font-mono uppercase tracking-widest deck-accent-text font-bold inline-flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5" />
                Call to action
              </p>
              <p className="text-xs deck-title inline-flex items-center gap-1.5 leading-relaxed font-semibold">
                <ArrowRight className="w-3.5 h-3.5 deck-accent-text shrink-0" />
                {parsed.call_to_action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



function Base64ImagePreview({ answer, actionType }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.download = `${actionType || 'export'}-${Date.now()}.png`
    link.href = answer
    link.click()
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            {actionType === 'slides' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <Shapes className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-100">
              {actionType === 'slides' ? 'Slide Deck Presentation' : 'Visualized Infographic'}
            </h4>
            <p className="text-[11px] text-surface-500">
              Rendered via NotebookLM Engine (PNG HD Image)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-300 transform active:scale-95 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            ></path>
          </svg>
          Download PNG
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-950 p-2 md:p-4 flex items-center justify-center cursor-zoom-in"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={answer}
          alt={actionType}
          className="max-w-full max-h-full object-contain rounded-lg shadow-md"
        />

        {isHovered && (
          <div className="absolute inset-0 bg-black/10 pointer-events-none transition-all duration-300 flex items-center justify-center">
            <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              HD Rendered Preview
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


export default function ActionDetailRenderer({ actionId, actionType, answer, isFullscreen, citations, onToggleFullscreen, onRenderHeaderActions }) {
  const isBase64Image = typeof answer === 'string' && answer.trim().startsWith('data:image/')

  if (isBase64Image) {
    return <Base64ImagePreview answer={answer} actionType={actionType} />
  }

  if (actionType === 'mindmap') {
    return <MindmapPreview answer={answer} />
  }

  if (actionType === 'chart') {
    return <ChartPreview answer={answer} />
  }

  if (actionType === 'slides') {
    return <SlidesPreview actionId={actionId} answer={answer} isFullscreen={isFullscreen} citations={citations} onToggleFullscreen={onToggleFullscreen} onRenderHeaderActions={onRenderHeaderActions} />
  }

  if (actionType === 'infographic') {
    return (
      <InfographicPreview
        actionId={actionId}
        answer={answer}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onRenderHeaderActions={onRenderHeaderActions}
      />
    )
  }

  return <RawFallback answer={answer} />
}
