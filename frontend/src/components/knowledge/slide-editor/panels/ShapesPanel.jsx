import { useState, useCallback } from 'react'
import {
  Square,
  Circle,
  Triangle,
  Minus,
  Plus,
} from 'lucide-react'
import useSlideEditorStore from '../../../../stores/useSlideEditorStore'

const COLOR_PRESETS = [
  'transparent', '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#94a3b8', '#64748b', '#1e293b', '#f1f5f9', '#38bdf8',
]

export default function ShapesPanel({ slideIndex }) {
  const addElement = useSlideEditorStore((s) => s.addElement)
  const selectedElementId = useSlideEditorStore((s) => s.selectedElementId)
  const elements = useSlideEditorStore((s) => s.elements[slideIndex]) || []
  const updateElementProps = useSlideEditorStore((s) => s.updateElementProps)

  const selectedElement = elements.find(
    (el) => el.id === selectedElementId && el.type === 'shape'
  )

  const [customFill, setCustomFill] = useState('#3b82f6')
  const [customStroke, setCustomStroke] = useState('#1e40af')

  const handleAddShape = useCallback(
    (preset) => {
      addElement(slideIndex, 'shape', { preset })
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
      {/* Add Shape Section */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
          เพิ่มรูปร่าง (Add Shape)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { preset: 'rect', label: 'Rectangle', icon: Square },
            { preset: 'circle', label: 'Circle', icon: Circle },
            { preset: 'triangle', label: 'Triangle', icon: Triangle },
            { preset: 'line', label: 'Line', icon: Minus },
          ].map(({ preset, label, icon: Icon }) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAddShape(preset)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer group"
            >
              <Icon className="w-6 h-6 text-surface-400 group-hover:text-primary-500 transition-colors" />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edit Selected Shape Element */}
      {selectedElement && (
        <>
          <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
              แก้ไขรูปร่าง (Edit Shape)
            </p>

            {/* Fill Mode */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                Fill Mode
              </label>
              <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5">
                {['fill', 'stroke', 'both'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handlePropChange('fillMode', mode)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md capitalize transition-colors ${
                      selectedElement.props.fillMode === mode
                        ? 'bg-white dark:bg-surface-900 text-primary-500 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Fill Color */}
            {(selectedElement.props.fillMode === 'fill' || selectedElement.props.fillMode === 'both') && (
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                  Fill Color
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handlePropChange('fillColor', c)}
                      className={`w-5 h-5 rounded border transition-all cursor-pointer hover:scale-110 ${
                        selectedElement.props.fillColor === c
                          ? 'border-primary-500 ring-2 ring-primary-500/30'
                          : 'border-surface-300 dark:border-surface-600'
                      } ${c === 'transparent' ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIi8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNjY2MiLz4KPC9zdmc+")]' : ''}`}
                      style={{ backgroundColor: c !== 'transparent' ? c : undefined }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stroke Color */}
            {(selectedElement.props.fillMode === 'stroke' || selectedElement.props.fillMode === 'both') && (
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                  Stroke Color
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handlePropChange('strokeColor', c)}
                      className={`w-5 h-5 rounded border transition-all cursor-pointer hover:scale-110 ${
                        selectedElement.props.strokeColor === c
                          ? 'border-primary-500 ring-2 ring-primary-500/30'
                          : 'border-surface-300 dark:border-surface-600'
                      } ${c === 'transparent' ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIi8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNjY2MiLz4KPC9zdmc+")]' : ''}`}
                      style={{ backgroundColor: c !== 'transparent' ? c : undefined }}
                      title={c}
                    />
                  ))}
                </div>

                <label className="text-[10px] font-semibold text-surface-500 mb-1 mt-2 flex items-center justify-between">
                  <span>Stroke Width</span>
                  <span className="text-primary-500 font-mono">
                    {selectedElement.props.strokeWidth || 2}px
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={selectedElement.props.strokeWidth || 2}
                  onChange={(e) =>
                    handlePropChange('strokeWidth', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-primary-500 h-1.5"
                />
              </div>
            )}

            {/* Border Radius (only for rect) */}
            {selectedElement.props.shapeType === 'rect' && (
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 flex items-center justify-between">
                  <span>Border Radius</span>
                  <span className="text-primary-500 font-mono">
                    {selectedElement.props.borderRadius || 0}px
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={selectedElement.props.borderRadius || 0}
                  onChange={(e) =>
                    handlePropChange('borderRadius', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-primary-500 h-1.5"
                />
              </div>
            )}

            {/* Opacity */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 flex items-center justify-between">
                <span>Opacity</span>
                <span className="text-primary-500 font-mono">
                  {Math.round((selectedElement.props.opacity ?? 1) * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selectedElement.props.opacity ?? 1}
                onChange={(e) =>
                  handlePropChange('opacity', parseFloat(e.target.value))
                }
                className="w-full accent-primary-500 h-1.5"
              />
            </div>
          </div>
        </>
      )}

      {/* Hint when no shape element is selected */}
      {!selectedElement && (
        <div className="mt-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-850 border border-surface-200/50 dark:border-surface-800/50">
          <p className="text-[10px] text-surface-400 text-center leading-relaxed">
            💡 กดปุ่มด้านบนเพื่อเพิ่มรูปร่างใหม่ หรือ<br />
            คลิกเลือก Shape Element บน slide เพื่อแก้ไข
          </p>
        </div>
      )}
    </div>
  )
}
