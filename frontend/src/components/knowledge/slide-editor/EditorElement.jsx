import { useCallback, useRef } from 'react'
import { Rnd } from 'react-rnd'
import useSlideEditorStore from '../../../stores/useSlideEditorStore'

const HANDLE_STYLE = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#3b82f6',
  border: '2px solid #ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
}

const RESIZE_HANDLE_STYLES = {
  topLeft: { ...HANDLE_STYLE, top: -5, left: -5 },
  topRight: { ...HANDLE_STYLE, top: -5, right: -5 },
  bottomLeft: { ...HANDLE_STYLE, bottom: -5, left: -5 },
  bottomRight: { ...HANDLE_STYLE, bottom: -5, right: -5 },
  top: { ...HANDLE_STYLE, top: -5, left: '50%', marginLeft: -5 },
  bottom: { ...HANDLE_STYLE, bottom: -5, left: '50%', marginLeft: -5 },
  left: { ...HANDLE_STYLE, left: -5, top: '50%', marginTop: -5 },
  right: { ...HANDLE_STYLE, right: -5, top: '50%', marginTop: -5 },
}

export default function EditorElement({
  element,
  slideIndex,
  isSelected,
  children,
  canvasScale = 1,
  readOnly = false,
}) {
  const updateElement = useSlideEditorStore((s) => s.updateElement)
  const selectElement = useSlideEditorStore((s) => s.selectElement)
  const removeElement = useSlideEditorStore((s) => s.removeElement)
  const duplicateElement = useSlideEditorStore((s) => s.duplicateElement)
  const bringToFront = useSlideEditorStore((s) => s.bringToFront)
  const sendToBack = useSlideEditorStore((s) => s.sendToBack)

  const rndRef = useRef(null)

  const handleDragStop = useCallback(
    (_e, d) => {
      updateElement(slideIndex, element.id, {
        x: Math.round(d.x),
        y: Math.round(d.y),
      })
    },
    [slideIndex, element.id, updateElement]
  )

  const handleResizeStop = useCallback(
    (_e, _dir, ref, _delta, position) => {
      updateElement(slideIndex, element.id, {
        width: Math.round(parseFloat(ref.style.width)),
        height: Math.round(parseFloat(ref.style.height)),
        x: Math.round(position.x),
        y: Math.round(position.y),
      })
    },
    [slideIndex, element.id, updateElement]
  )

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      selectElement(element.id)
    },
    [element.id, selectElement]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (!isSelected) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not editing text content
        const target = e.target
        if (
          target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA'
        )
          return
        e.preventDefault()
        removeElement(slideIndex, element.id)
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        duplicateElement(slideIndex, element.id)
      }
    },
    [isSelected, slideIndex, element.id, removeElement, duplicateElement]
  )

  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      selectElement(element.id)

      // Simple context menu actions via prompt
      const action = window.__slideEditorContextMenu?.(element)
      if (action === 'delete') removeElement(slideIndex, element.id)
      if (action === 'duplicate') duplicateElement(slideIndex, element.id)
      if (action === 'front') bringToFront(slideIndex, element.id)
      if (action === 'back') sendToBack(slideIndex, element.id)
    },
    [element, slideIndex, selectElement, removeElement, duplicateElement, bringToFront, sendToBack]
  )

  if (readOnly || element.locked) {
    return (
      <div
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex,
          pointerEvents: readOnly ? 'none' : 'auto',
          opacity: element.locked ? 0.7 : 1,
        }}
        onClick={readOnly ? undefined : handleClick}
      >
        {children}
      </div>
    )
  }

  return (
    <Rnd
      ref={rndRef}
      size={{ width: element.width, height: element.height }}
      position={{ x: element.x, y: element.y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      bounds="parent"
      scale={canvasScale}
      style={{
        zIndex: element.zIndex,
        outline: isSelected ? '2px solid #3b82f6' : 'none',
        outlineOffset: '2px',
        cursor: 'move',
      }}
      resizeHandleStyles={isSelected ? RESIZE_HANDLE_STYLES : {}}
      enableResizing={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onContextMenu={handleContextMenu}
      className="group"
    >
      <div className="w-full h-full relative">
        {children}

        {/* Delete button on hover */}
        {isSelected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeElement(slideIndex, element.id)
            }}
            className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50"
            title="Delete"
          >
            ×
          </button>
        )}
      </div>
    </Rnd>
  )
}
