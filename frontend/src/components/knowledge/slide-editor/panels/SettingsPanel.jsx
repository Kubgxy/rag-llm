import { useCallback, useRef } from 'react'
import { Settings, Image as ImageIcon, PaintBucket, StickyNote, PlaySquare, LayoutTemplate, Palette, RotateCcw } from 'lucide-react'
import useSlideEditorStore from '../../../../stores/useSlideEditorStore'

const COLOR_PRESETS = [
  'transparent', '#ffffff', '#000000', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
  '#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3'
]

export default function SettingsPanel({ slideIndex }) {
  const slideSettings = useSlideEditorStore((s) => s.slideSettings[slideIndex]) || {}
  const updateSlideSettings = useSlideEditorStore((s) => s.updateSlideSettings)

  const fileInputRef = useRef(null)

  const handleSettingChange = useCallback(
    (key, value) => {
      updateSlideSettings(slideIndex, { [key]: value })
    },
    [slideIndex, updateSlideSettings]
  )

  const handleBgImageUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, WEBP, GIF)')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        handleSettingChange('backgroundImage', event.target.result)
        handleSettingChange('backgroundType', 'image')
      }
      reader.readAsDataURL(file)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleSettingChange]
  )

  const handleReset = useCallback(() => {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าของสไลด์หน้านี้กลับเป็นค่าเริ่มต้นหรือไม่?')) {
      useSlideEditorStore.getState().updateSlideSettings(slideIndex, {})
    }
  }, [slideIndex])

  return (
      
    <div className="flex flex-col gap-4 text-surface-700 dark:text-surface-200 pb-8">
      
      {/* Aspect Ratio Section */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2 flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5" /> สัดส่วน (Aspect Ratio)
        </p>
        <select
          value={slideSettings.aspectRatio || '16/9'}
          onChange={(e) => handleSettingChange('aspectRatio', e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs focus:border-primary-400 focus:outline-none transition-colors"
        >
          <option value="16/9">16:9 (Standard)</option>
          <option value="4/3">4:3 (Classic)</option>
          <option value="1/1">1:1 (Square)</option>
          <option value="9/16">9:16 (Portrait)</option>
        </select>
      </div>

      {/* Background Section */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2 flex items-center gap-1.5">
          <PaintBucket className="w-3.5 h-3.5" /> พื้นหลัง (Background)
        </p>

        {/* Background Type Toggle */}
        <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5 mb-3">
          {['color', 'gradient', 'image'].map((type) => (
            <button
              key={type}
              onClick={() => handleSettingChange('backgroundType', type)}
              className={`flex-1 text-[10px] font-bold py-1.5 rounded-md capitalize transition-colors ${
                (slideSettings.backgroundType || 'color') === type
                  ? 'bg-white dark:bg-surface-900 text-primary-500 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Color Background */}
        {(slideSettings.backgroundType || 'color') === 'color' && (
          <div>
            <label className="text-[10px] font-semibold text-surface-500 mb-1.5 block">
              Color Fill
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSettingChange('backgroundColor', c)}
                  className={`w-6 h-6 rounded-md border-2 transition-all cursor-pointer hover:scale-110 ${
                    slideSettings.backgroundColor === c
                      ? 'border-primary-500 ring-2 ring-primary-500/30'
                      : 'border-surface-200 dark:border-surface-700'
                  } ${c === 'transparent' ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIi8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNjY2MiLz4KPC9zdmc+")]' : ''}`}
                  style={{ backgroundColor: c !== 'transparent' ? c : undefined }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={slideSettings.backgroundColor || '#ffffff'}
                onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer p-0 bg-transparent"
              />
              <span className="text-[10px] font-mono text-surface-500 uppercase">
                {slideSettings.backgroundColor || '#FFFFFF'}
              </span>
            </div>
          </div>
        )}

        {/* Gradient Background */}
        {(slideSettings.backgroundType || 'color') === 'gradient' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 block">Color 1</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={slideSettings.gradientColor1 || '#3b82f6'}
                    onChange={(e) => handleSettingChange('gradientColor1', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono uppercase">{slideSettings.gradientColor1 || '#3b82f6'}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 block">Color 2</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={slideSettings.gradientColor2 || '#10b981'}
                    onChange={(e) => handleSettingChange('gradientColor2', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono uppercase">{slideSettings.gradientColor2 || '#10b981'}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-surface-500 mb-1 flex justify-between">
                <span>Angle</span>
                <span className="font-mono">{slideSettings.gradientAngle || 135}°</span>
              </label>
              <input
                type="range"
                min={0}
                max={360}
                value={slideSettings.gradientAngle || 135}
                onChange={(e) => handleSettingChange('gradientAngle', parseInt(e.target.value, 10))}
                className="w-full accent-primary-500 h-1.5"
              />
            </div>
          </div>
        )}

        {/* Image Background */}
        {(slideSettings.backgroundType || 'color') === 'image' && (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleBgImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-500/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative overflow-hidden"
            >
              {slideSettings.backgroundImage ? (
                <>
                  <img 
                    src={slideSettings.backgroundImage} 
                    alt="Background" 
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                  <div className="relative z-10 bg-white/80 dark:bg-black/80 px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm shadow-sm">
                    <ImageIcon className="w-3 h-3" /> Change Image
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 text-surface-400" />
                  <span className="text-[10px] font-semibold text-surface-500">Upload Background</span>
                </>
              )}
            </button>

            {slideSettings.backgroundImage && (
              <div className="mt-2">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 flex items-center justify-between">
                  <span>Image Opacity</span>
                  <span className="text-primary-500 font-mono">
                    {Math.round((slideSettings.backgroundOpacity ?? 1) * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={slideSettings.backgroundOpacity ?? 1}
                  onChange={(e) => handleSettingChange('backgroundOpacity', parseFloat(e.target.value))}
                  className="w-full accent-primary-500 h-1.5"
                />
              </div>
            )}

            {slideSettings.backgroundImage && (
              <div className="mt-2">
                <label className="text-[10px] font-semibold text-surface-500 mb-1 flex items-center justify-between">
                  <span>Image Blur</span>
                  <span className="text-primary-500 font-mono">
                    {slideSettings.backgroundBlur ?? 0}px
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={slideSettings.backgroundBlur ?? 0}
                  onChange={(e) => handleSettingChange('backgroundBlur', parseInt(e.target.value, 10))}
                  className="w-full accent-primary-500 h-1.5"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide Elements Toggle Section */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-3 flex flex-col gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" /> องค์ประกอบ (Slide Elements)
        </p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={slideSettings.showFooter ?? true}
            onChange={(e) => handleSettingChange('showFooter', e.target.checked)}
            className="w-3.5 h-3.5 accent-primary-500 rounded"
          />
          <span className="text-xs font-semibold">Show Footer Area</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={slideSettings.showSlideNumber ?? true}
            onChange={(e) => handleSettingChange('showSlideNumber', e.target.checked)}
            className="w-3.5 h-3.5 accent-primary-500 rounded"
          />
          <span className="text-xs font-semibold">Show Slide Number</span>
        </label>

        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={slideSettings.showWatermark ?? true}
              onChange={(e) => handleSettingChange('showWatermark', e.target.checked)}
              className="w-3.5 h-3.5 accent-primary-500 rounded"
            />
            <span className="text-xs font-semibold">Show Watermark</span>
          </label>
          {(slideSettings.showWatermark ?? true) && (
            <input
              type="text"
              placeholder="© RAG-LLM Studio"
              value={slideSettings.watermarkText || ''}
              onChange={(e) => handleSettingChange('watermarkText', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 text-[10px] focus:border-primary-400 focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Theme Overrides (Custom CSS Variables) */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> ธีมแบบกำหนดเอง (Custom CSS Overrides)
        </p>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[9px] font-mono text-surface-500">--accent-color</label>
            <input
              type="text"
              placeholder="e.g., #ff0000 or red"
              value={slideSettings.customAccentColor || ''}
              onChange={(e) => handleSettingChange('customAccentColor', e.target.value)}
              className="w-full px-2 py-1 rounded border border-surface-200 dark:border-surface-700 text-[10px] bg-white dark:bg-surface-900 focus:border-primary-400 outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono text-surface-500">--text-title</label>
            <input
              type="text"
              placeholder="e.g., #333333"
              value={slideSettings.customTitleColor || ''}
              onChange={(e) => handleSettingChange('customTitleColor', e.target.value)}
              className="w-full px-2 py-1 rounded border border-surface-200 dark:border-surface-700 text-[10px] bg-white dark:bg-surface-900 focus:border-primary-400 outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono text-surface-500">--font-family-title</label>
            <input
              type="text"
              placeholder="e.g., 'Inter', sans-serif"
              value={slideSettings.customTitleFont || ''}
              onChange={(e) => handleSettingChange('customTitleFont', e.target.value)}
              className="w-full px-2 py-1 rounded border border-surface-200 dark:border-surface-700 text-[10px] bg-white dark:bg-surface-900 focus:border-primary-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Transition Section */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2 flex items-center gap-1.5">
          <PlaySquare className="w-3.5 h-3.5" /> การเปลี่ยนหน้า (Transition)
        </p>
        <select
          value={slideSettings.transition || 'none'}
          onChange={(e) => handleSettingChange('transition', e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-xs focus:border-primary-400 focus:outline-none transition-colors"
        >
          <option value="none">None</option>
          <option value="fade">Fade</option>
          <option value="slide">Slide</option>
          <option value="zoom">Zoom</option>
        </select>
        <p className="text-[9px] text-surface-400 mt-1.5 leading-relaxed">
          * มีผลตอน Export หรือตอนกดเล่น Presentation
        </p>
      </div>

      {/* Presenter Notes */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-3 flex-1 flex flex-col min-h-[150px]">
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2 flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" /> โน้ตผู้บรรยาย (Presenter Notes)
        </p>
        <textarea
          value={slideSettings.presenterNotes || ''}
          onChange={(e) => handleSettingChange('presenterNotes', e.target.value)}
          placeholder="เพิ่มโน้ตสำหรับพูดบรรยายในหน้านี้..."
          className="w-full flex-1 min-h-[100px] px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 text-xs text-surface-700 dark:text-surface-200 focus:border-primary-400 focus:outline-none focus:bg-white dark:focus:bg-surface-900 transition-colors resize-none placeholder:text-surface-400/50"
        />
      </div>

      {/* Reset Section */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-4 mt-2">
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-wider transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
        </button>
      </div>

    </div>
  )
}
