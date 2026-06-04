import { useCallback } from 'react'
import { BarChart3, LineChart, PieChart, Activity } from 'lucide-react'
import useSlideEditorStore from '../../../../stores/useSlideEditorStore'

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
]

export default function ChartsPanel({ slideIndex }) {
  const addElement = useSlideEditorStore((s) => s.addElement)
  const selectedElementId = useSlideEditorStore((s) => s.selectedElementId)
  const elements = useSlideEditorStore((s) => s.elements[slideIndex]) || []
  const updateElementProps = useSlideEditorStore((s) => s.updateElementProps)

  const selectedElement = elements.find(
    (el) => el.id === selectedElementId && el.type === 'chart'
  )

  const handleAddChart = useCallback(
    (preset) => {
      addElement(slideIndex, 'chart', { preset })
    },
    [slideIndex, addElement]
  )

  const handlePropChange = useCallback(
    (prop, value) => {
      if (!selectedElement) return
      updateElementProps(slideIndex, selectedElement.id, { [prop]: value })
    },
    [slideIndex, selectedElement, updateElementProps]
  )

  return (
    <div className="flex flex-col gap-4 text-surface-700 dark:text-surface-200">
      {/* Add Chart Section */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
          เพิ่มกราฟ (Add Chart)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { preset: 'bar', label: 'Bar Chart', icon: BarChart3 },
            { preset: 'line', label: 'Line Chart', icon: LineChart },
            { preset: 'area', label: 'Area Chart', icon: Activity },
            { preset: 'pie', label: 'Pie Chart', icon: PieChart },
          ].map(({ preset, label, icon: Icon }) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAddChart(preset)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer group"
            >
              <Icon className="w-6 h-6 text-surface-400 group-hover:text-primary-500 transition-colors" />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edit Selected Chart Element */}
      {selectedElement && (
        <>
          <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
              แก้ไขกราฟ (Edit Chart)
            </p>

            {/* Chart Type */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                Chart Type
              </label>
              <div className="grid grid-cols-2 gap-1">
                {['bar', 'line', 'area', 'pie'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handlePropChange('chartType', type)}
                    className={`text-[10px] font-bold py-1.5 rounded-md capitalize transition-colors ${
                      selectedElement.props.chartType === type
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Color */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                Primary Color Theme
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handlePropChange('color', c)}
                    className={`w-6 h-6 rounded-md border-2 transition-all cursor-pointer hover:scale-110 ${
                      selectedElement.props.color === c
                        ? 'border-surface-900 dark:border-white ring-2 ring-surface-900/20'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-800/50">
              <p className="text-[10px] text-primary-600 dark:text-primary-400 text-center leading-relaxed">
                💡 กด Edit Data เพื่อแก้ไขข้อมูลที่นำมาวาดกราฟ (ในอนาคต)
              </p>
            </div>
          </div>
        </>
      )}

      {/* Hint when no chart element is selected */}
      {!selectedElement && (
        <div className="mt-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-850 border border-surface-200/50 dark:border-surface-800/50">
          <p className="text-[10px] text-surface-400 text-center leading-relaxed">
            💡 เลือกประเภทกราฟด้านบน เพื่อเพิ่มลงใน slide<br />
            คลิกเลือกกราฟบน slide เพื่อเปลี่ยนสีและประเภท
          </p>
        </div>
      )}
    </div>
  )
}
