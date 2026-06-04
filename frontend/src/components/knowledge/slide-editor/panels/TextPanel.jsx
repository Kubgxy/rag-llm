import { useState, useCallback } from 'react'
import {
  Type,
  Heading1,
  CaseSensitive,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Plus,
} from 'lucide-react'
import useSlideEditorStore from '../../../../stores/useSlideEditorStore'

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Sarabun', value: 'Sarabun' },
  { label: 'Noto Sans Thai', value: 'Noto Sans Thai' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Fira Code', value: 'Fira Code' },
]

const COLOR_PRESETS = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#94a3b8', '#64748b', '#1e293b', '#f1f5f9', '#38bdf8',
  '#10b981', '#f59e0b', '#e11d48',
]

export default function TextPanel({ slideIndex }) {
  const addElement = useSlideEditorStore((s) => s.addElement)
  const selectedElementId = useSlideEditorStore((s) => s.selectedElementId)
  const elements = useSlideEditorStore((s) => s.elements[slideIndex]) || []
  const updateElementProps = useSlideEditorStore((s) => s.updateElementProps)

  const selectedElement = elements.find(
    (el) => el.id === selectedElementId && el.type === 'text'
  )

  const [customColor, setCustomColor] = useState('#ffffff')

  const handleAddText = useCallback(
    (preset) => {
      addElement(slideIndex, 'text', { preset })
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

  const toggleBold = useCallback(() => {
    if (!selectedElement) return
    const current = selectedElement.props.fontWeight
    handlePropChange('fontWeight', current === '700' ? '400' : '700')
  }, [selectedElement, handlePropChange])

  const toggleItalic = useCallback(() => {
    if (!selectedElement) return
    const current = selectedElement.props.fontStyle
    handlePropChange('fontStyle', current === 'italic' ? 'normal' : 'italic')
  }, [selectedElement, handlePropChange])

  return (
    <div className="flex flex-col gap-4 text-surface-700 dark:text-surface-200">
      {/* Add Text Section */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
          เพิ่มข้อความ (Add Text)
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { preset: 'heading', label: 'Heading', icon: Heading1, desc: 'หัวข้อขนาดใหญ่' },
            { preset: 'body', label: 'Body Text', icon: Type, desc: 'ข้อความทั่วไป' },
            { preset: 'caption', label: 'Caption', icon: CaseSensitive, desc: 'คำอธิบายขนาดเล็ก' },
          ].map(({ preset, label, icon: Icon, desc }) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAddText(preset)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition-colors">
                <Icon className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[9px] text-surface-400">{desc}</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-surface-300 ml-auto group-hover:text-primary-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Edit Selected Text Element */}
      {selectedElement && (
        <>
          <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
              แก้ไขข้อความ (Edit Text)
            </p>

            {/* Font Family */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                Font Family
              </label>
              <select
                value={selectedElement.props.fontFamily || 'Inter'}
                onChange={(e) => handlePropChange('fontFamily', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs focus:border-primary-400 focus:outline-none transition-colors"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 flex items-center justify-between">
                <span>Font Size</span>
                <span className="text-primary-500 font-mono">
                  {selectedElement.props.fontSize || 18}px
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={8}
                  max={120}
                  step={1}
                  value={selectedElement.props.fontSize || 18}
                  onChange={(e) =>
                    handlePropChange('fontSize', parseInt(e.target.value, 10))
                  }
                  className="flex-1 accent-primary-500 h-1.5"
                />
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={selectedElement.props.fontSize || 18}
                  onChange={(e) =>
                    handlePropChange('fontSize', parseInt(e.target.value, 10) || 18)
                  }
                  className="w-14 px-2 py-1 rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs text-center focus:border-primary-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Bold & Italic */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={toggleBold}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                  selectedElement.props.fontWeight === '700'
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 text-surface-600 dark:text-surface-300'
                }`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleItalic}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                  selectedElement.props.fontStyle === 'italic'
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 text-surface-600 dark:text-surface-300'
                }`}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-surface-200 dark:bg-surface-700 mx-1" />

              {/* Text Alignment */}
              {[
                { align: 'left', Icon: AlignLeft },
                { align: 'center', Icon: AlignCenter },
                { align: 'right', Icon: AlignRight },
                { align: 'justify', Icon: AlignJustify },
              ].map(({ align, Icon }) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => handlePropChange('textAlign', align)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                    selectedElement.props.textAlign === align
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 text-surface-600 dark:text-surface-300'
                  }`}
                  title={`Align ${align}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            {/* Line Height */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 flex items-center justify-between">
                <span>Line Height</span>
                <span className="text-primary-500 font-mono">
                  {(selectedElement.props.lineHeight || 1.5).toFixed(1)}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={selectedElement.props.lineHeight || 1.5}
                onChange={(e) =>
                  handlePropChange('lineHeight', parseFloat(e.target.value))
                }
                className="w-full accent-primary-500 h-1.5"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-[10px] font-semibold text-surface-500 mb-1.5 block">
                Color
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handlePropChange('color', c)}
                    className={`w-6 h-6 rounded-md border-2 transition-all cursor-pointer hover:scale-110 ${
                      selectedElement.props.color === c
                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                        : 'border-surface-300 dark:border-surface-600'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    handlePropChange('color', e.target.value)
                  }}
                  className="w-8 h-8 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={selectedElement.props.color || '#ffffff'}
                  onChange={(e) => handlePropChange('color', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs font-mono focus:border-primary-400 focus:outline-none"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hint when no text element is selected */}
      {!selectedElement && (
        <div className="mt-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-850 border border-surface-200/50 dark:border-surface-800/50">
          <p className="text-[10px] text-surface-400 text-center leading-relaxed">
            💡 กดปุ่มด้านบนเพื่อเพิ่มข้อความใหม่ หรือ<br />
            คลิกเลือก Text Element บน slide เพื่อแก้ไข
          </p>
        </div>
      )}
    </div>
  )
}
