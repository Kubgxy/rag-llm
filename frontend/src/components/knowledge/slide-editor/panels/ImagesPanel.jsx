import { useCallback, useRef } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'
import useSlideEditorStore from '../../../../stores/useSlideEditorStore'

export default function ImagesPanel({ slideIndex }) {
  const addElement = useSlideEditorStore((s) => s.addElement)
  const selectedElementId = useSlideEditorStore((s) => s.selectedElementId)
  const elements = useSlideEditorStore((s) => s.elements[slideIndex]) || []
  const updateElementProps = useSlideEditorStore((s) => s.updateElementProps)

  const selectedElement = elements.find(
    (el) => el.id === selectedElementId && el.type === 'image'
  )

  const fileInputRef = useRef(null)

  const handleFileChange = useCallback(
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
        const base64Data = event.target.result
        
        // Use an Image object to get original dimensions to set appropriate aspect ratio
        const img = new Image()
        img.onload = () => {
          const maxWidth = 500
          const maxHeight = 400
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }

          addElement(slideIndex, 'image', {
            width,
            height,
            props: { src: base64Data },
          })
        }
        img.src = base64Data
      }
      reader.readAsDataURL(file)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
      {/* Upload Section */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
          อัปโหลดรูปภาพ (Upload Image)
        </p>
        
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-500/5 rounded-xl flex flex-col items-center justify-center gap-3 transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
            <Upload className="w-5 h-5 text-surface-400 group-hover:text-white" />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold">Click to Upload</p>
            <p className="text-[9px] text-surface-400 mt-0.5">PNG, JPG up to 5MB</p>
          </div>
        </button>
      </div>

      {/* Edit Selected Image Element */}
      {selectedElement && (
        <>
          <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
              แก้ไขรูปภาพ (Edit Image)
            </p>

            {/* Object Fit */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-surface-500 mb-1 block">
                Image Fit
              </label>
              <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5">
                {['cover', 'contain', 'fill'].map((fit) => (
                  <button
                    key={fit}
                    onClick={() => handlePropChange('objectFit', fit)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md capitalize transition-colors ${
                      selectedElement.props.objectFit === fit
                        ? 'bg-white dark:bg-surface-900 text-primary-500 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
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
                max={250}
                step={1}
                value={selectedElement.props.borderRadius || 0}
                onChange={(e) =>
                  handlePropChange('borderRadius', parseInt(e.target.value, 10))
                }
                className="w-full accent-primary-500 h-1.5"
              />
            </div>

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

      {/* Hint when no image element is selected */}
      {!selectedElement && (
        <div className="mt-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-850 border border-surface-200/50 dark:border-surface-800/50">
          <p className="text-[10px] text-surface-400 text-center leading-relaxed">
            💡 อัปโหลดรูปภาพด้านบน หรือ<br />
            คลิกเลือก Image Element บน slide เพื่อแก้ไข
          </p>
        </div>
      )}
    </div>
  )
}
