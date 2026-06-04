import { ImageIcon } from 'lucide-react'

export default function ImageElement({ element }) {
  const {
    src,
    objectFit = 'cover',
    borderRadius = 0,
    opacity = 1,
  } = element.props || {}

  if (!src) {
    return (
      <div className="w-full h-full bg-surface-100 dark:bg-surface-800 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg flex flex-col items-center justify-center text-surface-400 gap-2">
        <ImageIcon className="w-8 h-8 opacity-50" />
        <span className="text-[10px] font-medium">No Image Source</span>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        borderRadius: `${borderRadius}px`,
        opacity,
      }}
    >
      <img
        src={src}
        alt="Slide Graphic"
        className="w-full h-full pointer-events-none"
        style={{ objectFit }}
        draggable={false}
      />
    </div>
  )
}
