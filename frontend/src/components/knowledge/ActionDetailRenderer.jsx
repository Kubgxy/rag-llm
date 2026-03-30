import { useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
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
} from 'lucide-react'

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function stripCodeFence(text) {
  if (!text) return ''
  const raw = String(text).trim()
  const fencedBlock = raw.match(/```\s*(?:mermaid|json)?\s*\n?([\s\S]*?)```/i)
  if (fencedBlock?.[1]) {
    return fencedBlock[1].trim()
  }

  return raw
    .replace(/^```\s*(?:mermaid|json)?\s*/i, '')
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

function normalizeMermaid(text) {
  const cleaned = stripCodeFence(text)
  const lines = cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '...')

  const startIdx = lines.findIndex((line) =>
    /^(flowchart|graph|mindmap|sequenceDiagram|classDiagram|erDiagram|journey|gantt|stateDiagram-v2|stateDiagram)\b/i.test(
      line.trim(),
    ),
  )

  if (startIdx >= 0) {
    return lines
      .slice(startIdx)
      .filter((line) => !/^(หมายเหตุ|note)\s*[:：]/i.test(line.trim()))
      .join('\n')
      .trim()
  }

  return cleaned
}

function parseNodeToken(token, nodeMap) {
  const normalized = String(token || '').trim().replace(/^[*-]\s*/, '')
  if (!normalized) return null

  // patterns: A[text], B(text), C{decision}
  const withLabel = normalized.match(/^([A-Za-z][\w-]*)\s*[\[\(\{]([\s\S]*?)[\]\)\}]$/)
  if (withLabel) {
    const id = withLabel[1].replace(/-/g, '_')
    const label = withLabel[2].replace(/"/g, "'").replace(/\s+/g, ' ').trim()
    nodeMap.set(id, label || id)
    return id
  }

  const pureId = normalized.match(/^([A-Za-z][\w-]*)$/)
  if (pureId) {
    const id = pureId[1].replace(/-/g, '_')
    if (!nodeMap.has(id)) {
      nodeMap.set(id, id)
    }
    return id
  }

  const label = normalized
    .replace(/^[\[\(\{]+/, '')
    .replace(/[\]\)\}]+$/, '')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  const fallbackId = `N${nodeMap.size + 1}`
  nodeMap.set(fallbackId, label || fallbackId)
  return fallbackId
}

function buildSafeFlowchartFromText(text) {
  const cleaned = normalizeMermaid(text)
  const rawLines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const edgeLines = rawLines
    .filter((line) => /-->|->|==>/.test(line))
    .map((line) => line.replace(/^[*-]\s*/, '').replace(/;+$/, '').trim())

  if (!edgeLines.length) return ''

  const nodeMap = new Map()
  const edges = []

  edgeLines.forEach((line) => {
    const parts = line.split(/-->|->|==>/)
    if (parts.length < 2) return

    const sourceId = parseNodeToken(parts[0], nodeMap)
    const targetId = parseNodeToken(parts[1], nodeMap)

    if (sourceId && targetId) {
      edges.push([sourceId, targetId])
    }
  })

  if (!edges.length) return ''

  const nodeDefs = Array.from(nodeMap.entries()).map(
    ([id, label]) => `  ${id}["${label}"]`,
  )
  const edgeDefs = edges.map(([s, t]) => `  ${s} --> ${t}`)

  return ['flowchart TD', ...nodeDefs, ...edgeDefs].join('\n')
}

function RawFallback({ answer }) {
  return (
    <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4">
      {answer}
    </pre>
  )
}

function MermaidPreview({ answer }) {
  const code = useMemo(() => normalizeMermaid(answer), [answer])
  const repairedCode = useMemo(() => buildSafeFlowchartFromText(answer), [answer])
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false

    const renderDiagram = async () => {
      try {
        setError('')
        setSvg('')
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'neutral',
        })

        const attempts = [code, repairedCode].filter(Boolean)
        let rendered = false

        for (let i = 0; i < attempts.length; i += 1) {
          try {
            const attemptCode = attempts[i]
            const attemptId = `${renderIdRef.current}-${i}`
            const { svg: nextSvg } = await mermaid.render(attemptId, attemptCode)
            if (!cancelled) {
              setSvg(nextSvg)
            }
            rendered = true
            break
          } catch {
            // Try next repair strategy
          }
        }

        if (!rendered) {
          throw new Error('Unable to render Mermaid diagram')
        }
      } catch (err) {
        if (!cancelled) {
          setSvg('')
          setError(err?.message || 'Unable to render Mermaid diagram')
        }
      }
    }

    if (code) {
      renderDiagram()
    }

    return () => {
      cancelled = true
    }
  }, [code])

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-500">Mermaid render failed, showing raw output instead.</p>
        <RawFallback answer={answer} />
      </div>
    )
  }

  if (!svg) {
    return <p className="text-xs text-surface-500">Rendering diagram...</p>
  }

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 overflow-auto">
      <div className="min-w-[520px]" dangerouslySetInnerHTML={{ __html: svg }} />
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
  )
}

function SlidesPreview({ answer }) {
  const parsed = useMemo(() => parseJsonSafe(answer), [answer])

  if (!parsed || !Array.isArray(parsed.slides)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-500">Slides JSON is invalid, showing raw output instead.</p>
        <RawFallback answer={answer} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-100">{parsed.title || 'Slides'}</h4>
        {parsed.audience && <p className="text-xs text-surface-500 mt-1">Audience: {parsed.audience}</p>}
      </div>

      <div className="space-y-3">
        {parsed.slides.map((slide, idx) => (
          <div
            key={`slide-${idx}`}
            className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                Slide {idx + 1}
              </span>
              <h5 className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                {slide.slide_title || `Slide ${idx + 1}`}
              </h5>
            </div>

            {Array.isArray(slide.key_points) && slide.key_points.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-surface-700 dark:text-surface-300 space-y-1">
                {slide.key_points.map((point, pIdx) => (
                  <li key={`point-${idx}-${pIdx}`}>{point}</li>
                ))}
              </ul>
            )}

            {slide.speaker_notes && (
              <div className="mt-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                <p className="text-[11px] font-semibold text-surface-500 mb-1">Speaker notes</p>
                <p className="text-xs text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{slide.speaker_notes}</p>
              </div>
            )}
          </div>
        ))}
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

  const themeSeed = `${parsed.theme || ''}${parsed.visual_style || ''}${parsed.headline || ''}`
  const theme = INFOGRAPHIC_THEMES[hashText(themeSeed) % INFOGRAPHIC_THEMES.length]

  const stats = Array.isArray(parsed.key_stats) ? parsed.key_stats.slice(0, 6) : []
  const maxStat = Math.max(1, ...stats.map((stat) => toNumber(stat?.value)))

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-800 bg-gradient-to-br ${theme.shell} p-4 space-y-4`}>
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
          )})}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {parsed.sections.map((section, idx) => {
          const Icon = getInfoIcon(section.icon_hint)
          const highlights = Array.isArray(section.highlights) && section.highlights.length > 0
            ? section.highlights.slice(0, 3)
            : deriveHighlights(section.summary)

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
  )
}

export default function ActionDetailRenderer({ actionType, answer }) {
  if (actionType === 'diagram') {
    return <MermaidPreview answer={answer} />
  }

  if (actionType === 'chart') {
    return <ChartPreview answer={answer} />
  }

  if (actionType === 'slides') {
    return <SlidesPreview answer={answer} />
  }

  if (actionType === 'infographic') {
    return <InfographicPreview answer={answer} />
  }

  return <RawFallback answer={answer} />
}
