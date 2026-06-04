import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
  ArrowUpToLine,
  ArrowDownToLine,
  Layers,
  BringToFront,
  SendToBack,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import useSlideEditorStore from '../../../../stores/useSlideEditorStore'

export default function LayoutPanel({ slideIndex }) {
  const selectedElementId = useSlideEditorStore((s) => s.selectedElementId)
  const elements = useSlideEditorStore((s) => s.elements[slideIndex]) || []
  
  const bringToFront = useSlideEditorStore((s) => s.bringToFront)
  const sendToBack = useSlideEditorStore((s) => s.sendToBack)
  const bringForward = useSlideEditorStore((s) => s.bringForward)
  const sendBackward = useSlideEditorStore((s) => s.sendBackward)
  const alignElement = useSlideEditorStore((s) => s.alignElement)

  const selectedElement = elements.find((el) => el.id === selectedElementId)

  // Sort elements by zIndex descending for the layers list
  const sortedElements = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))

  return (
    <div className="flex flex-col gap-4 text-surface-700 dark:text-surface-200">
      
      {/* Alignment Section (Only when element selected) */}
      <div className={`${!selectedElement ? 'opacity-50 pointer-events-none' : ''}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
          จัดตำแหน่ง (Align)
        </p>
        
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[
            { id: 'left', icon: AlignLeft, label: 'Left' },
            { id: 'center', icon: AlignCenter, label: 'Center' },
            { id: 'right', icon: AlignRight, label: 'Right' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectedElement && alignElement(slideIndex, selectedElement.id, id)}
              className="flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer"
              title={`Align ${label}`}
            >
              <Icon className="w-4 h-4 text-surface-500" />
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'top', icon: ArrowUpToLine, label: 'Top' },
            { id: 'middle', icon: AlignVerticalSpaceAround, label: 'Middle' },
            { id: 'bottom', icon: ArrowDownToLine, label: 'Bottom' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectedElement && alignElement(slideIndex, selectedElement.id, id)}
              className="flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer"
              title={`Align ${label}`}
            >
              <Icon className="w-4 h-4 text-surface-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Layer Order Section (Only when element selected) */}
      <div className={`border-t border-surface-200 dark:border-surface-800 pt-3 ${!selectedElement ? 'opacity-50 pointer-events-none' : ''}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">
          ลำดับชั้น (Order)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => selectedElement && bringToFront(slideIndex, selectedElement.id)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 transition-all cursor-pointer"
          >
            <BringToFront className="w-4 h-4 text-surface-500" />
            <span className="text-[9px] font-semibold">To Front</span>
          </button>
          <button
            type="button"
            onClick={() => selectedElement && sendToBack(slideIndex, selectedElement.id)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 transition-all cursor-pointer"
          >
            <SendToBack className="w-4 h-4 text-surface-500" />
            <span className="text-[9px] font-semibold">To Back</span>
          </button>
          <button
            type="button"
            onClick={() => selectedElement && bringForward(slideIndex, selectedElement.id)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 transition-all cursor-pointer"
          >
            <ChevronUp className="w-4 h-4 text-surface-500" />
            <span className="text-[9px] font-semibold">Forward</span>
          </button>
          <button
            type="button"
            onClick={() => selectedElement && sendBackward(slideIndex, selectedElement.id)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-850 transition-all cursor-pointer"
          >
            <ChevronDown className="w-4 h-4 text-surface-500" />
            <span className="text-[9px] font-semibold">Backward</span>
          </button>
        </div>
      </div>

      {/* Layers List */}
      <div className="border-t border-surface-200 dark:border-surface-800 pt-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2 flex items-center gap-1">
          <Layers className="w-3 h-3" /> เลเยอร์ทั้งหมด
        </p>
        
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {sortedElements.length === 0 && (
            <p className="text-[10px] text-surface-400 text-center py-4 italic">
              ไม่มี Element บน Slide
            </p>
          )}
          {sortedElements.map((el) => {
            const isSelected = el.id === selectedElementId
            const label = el.type === 'text' 
              ? `Text: ${el.props.content?.substring(0, 10)}...`
              : el.type === 'shape'
              ? `Shape: ${el.props.shapeType}`
              : el.type === 'image'
              ? 'Image'
              : el.type

            return (
              <div
                key={el.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] transition-colors ${
                  isSelected
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold'
                    : 'bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-300 dark:bg-surface-600 shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
                <span className="text-[9px] font-mono opacity-50 shrink-0 ml-2">
                  z:{el.zIndex}
                </span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
