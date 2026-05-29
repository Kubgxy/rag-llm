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
} from 'lucide-react'
import { toPng } from 'html-to-image'
import Mindmap from './Mindmap.jsx'

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

function SlidesPreview({ answer, isFullscreen }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])
  const [currentIndex, setCurrentIndex] = useState(0)

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

  const filename = `slide-${currentIndex + 1}-${toFileSafe(parsed?.title || 'presentation')}.png`
  const { ref, isDownloading, download: triggerHtmlDownload } = usePngDownload(filename)

  const SlideIcon = getSlideIcon(currentSlide.icon_name)

  return (
    <div className="space-y-3 animate-in fade-in duration-500 max-h-[120vh] flex flex-col justify-start">
      {/* Slide Navigation Header Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-3 shadow-sm relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Presentation className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-surface-800 dark:text-surface-100 truncate max-w-[180px] sm:max-w-[280px]">
              {parsed.title || 'Slide Presentation Deck'}
            </h4>
            <p className="text-[10px] text-surface-500">
              {parsed.audience ? `${parsed.audience} • ` : ''} Slide {currentIndex + 1} of {totalSlides}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1 rounded text-surface-600 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-700 disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-surface-700 dark:text-surface-300">
              {currentIndex + 1} / {totalSlides}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === totalSlides - 1}
              className="p-1 rounded text-surface-600 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-700 disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-[10px] font-semibold shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-3 h-3" />
            <span>{isDownloading ? 'Exporting...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Slide Viewer Canvas */}
      {currentSlide.image ? (
          <img
            src={currentSlide.image}
            alt={`Slide ${currentIndex + 1}`}
            className={`w-full ${isFullscreen ? 'h-[700px]' : 'h-[650px]'} object-contain rounded-xl  transition-all duration-300`}
          />
      ) : (
        <div
          ref={ref}
          className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#070b13] via-[#0f172a] to-[#1e1b4b] text-slate-100 p-6 flex flex-col justify-between shadow-xl aspect-[16/9] w-full max-h-[50vh] md:max-h-[55vh] mx-auto shrink-0"
        >
          <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/10 blur-[90px]"></div>
          <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/10 blur-[90px]"></div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
            <div className="flex items-center gap-2">
              <Presentation className="w-4 h-4 text-indigo-400" />
              <div>
                <h1 className="text-xs font-bold text-white leading-tight max-w-[200px] md:max-w-[400px] truncate">{parsed.title || 'Slide Deck'}</h1>
                {parsed.audience && <p className="text-[9px] text-slate-400">Audience: {parsed.audience}</p>}
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 font-mono font-bold">
              {currentIndex + 1} / {totalSlides}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center my-3 relative z-10 px-2 overflow-hidden">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <SlideIcon className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight leading-tight truncate">{currentSlide.slide_title}</h3>
              </div>

              {Array.isArray(currentSlide.key_points) && (
                <ul className="space-y-2 pl-1 overflow-y-auto max-h-[22vh]">
                  {currentSlide.key_points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed font-medium">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 shrink-0 shadow shadow-indigo-400/50"></span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Slide Thumbnails list below */}
      <div className="flex flex-wrap gap-1.5 justify-center py-1 shrink-0">
        {slides.map((s, idx) => {
          const isActive = idx === currentIndex
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold border transition-all cursor-pointer ${isActive
                  ? 'bg-primary-500 border-primary-500 text-white shadow shadow-primary-500/30'
                  : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600'
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

function InfographicPreview({ answer }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])

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

  const themeSeed = `${parsed.theme || ''}${parsed.visual_style || ''}${parsed.headline || ''}`
  const theme = INFOGRAPHIC_THEMES[hashText(themeSeed) % INFOGRAPHIC_THEMES.length]

  const stats = Array.isArray(parsed.key_stats) ? parsed.key_stats.slice(0, 6) : []
  const maxStat = Math.max(1, ...stats.map((stat) => toNumber(stat?.value)))

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
        className={`relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-800 bg-gradient-to-br ${theme.shell} p-4 space-y-4`}
      >
        <div className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/30 dark:bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 w-44 h-44 rounded-full bg-white/30 dark:bg-white/5 blur-2xl" />

        <div className="relative rounded-xl border border-surface-200/70 dark:border-surface-700 bg-white/85 dark:bg-surface-900/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-bold text-surface-900 dark:text-surface-100">{parsed.headline || 'Infographic'}</h4>
            {parsed.theme && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${theme.accentBg} ${theme.accentText}`}>
                <Palette className="w-3.5 h-3.5" />
                {parsed.theme}
              </span>
            )}
          </div>

          {parsed.subheadline && <p className="text-xs text-surface-600 dark:text-surface-300 mt-1">{parsed.subheadline}</p>}

          {parsed.visual_style && (
            <p className="text-[11px] text-surface-500 mt-2 inline-flex items-center gap-1">
              <Shapes className="w-3.5 h-3.5" />
              {parsed.visual_style}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stats.map((stat, idx) => {
              const val = toNumber(stat?.value)
              const ratio = Math.max(8, Math.round((val / maxStat) * 100))
              return (
                <div key={`stat-${idx}`} className="rounded-xl border border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-900/85 p-3">
                  <p className="text-[11px] text-surface-500">{stat.label || `Stat ${idx + 1}`}</p>
                  <p className="text-lg font-bold text-surface-900 dark:text-surface-100 mt-1">
                    {stat.value} {stat.unit || ''}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-400" style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {parsed.sections.map((section, idx) => {
            const Icon = getInfoIcon(section.icon_hint)
            const highlights = getSectionHighlights(section)
            return (
              <div key={`section-${idx}`} className="rounded-xl border border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-900/85 p-4">
                <div className="inline-flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg ${theme.accentBg} inline-flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${theme.accentText}`} />
                  </span>
                  <h5 className="text-sm font-semibold text-surface-800 dark:text-surface-100">{section.title || `Section ${idx + 1}`}</h5>
                </div>
                <p className="text-xs text-surface-700 dark:text-surface-300 mt-2 whitespace-pre-wrap">{section.summary || ''}</p>

                {highlights.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {highlights.map((point, pIdx) => (
                      <li key={`h-${idx}-${pIdx}`} className="text-[11px] text-surface-600 dark:text-surface-300 inline-flex items-start gap-1.5">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full ${theme.accentBg}`} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {parsed.call_to_action && (
          <div className={`rounded-xl border ${theme.ctaBorder} ${theme.ctaBg} p-4`}>
            <p className={`text-xs font-semibold ${theme.accentText} inline-flex items-center gap-1.5`}>
              <Target className="w-3.5 h-3.5" />
              Call to action
            </p>
            <p className="text-sm text-surface-800 dark:text-surface-200 mt-1 inline-flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              {parsed.call_to_action}
            </p>
          </div>
        )}
      </div>
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


export default function ActionDetailRenderer({ actionType, answer, isFullscreen }) {
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
    return <SlidesPreview answer={answer} isFullscreen={isFullscreen} />
  }

  if (actionType === 'infographic') {
    return <InfographicPreview answer={answer} />
  }

  return <RawFallback answer={answer} />
}
