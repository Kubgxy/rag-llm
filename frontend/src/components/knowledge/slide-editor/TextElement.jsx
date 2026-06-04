import { useCallback, useRef, useEffect } from 'react'
import useSlideEditorStore from '../../../stores/useSlideEditorStore'

export default function TextElement({ element, isSelected }) {
  const updateElementProps = useSlideEditorStore((s) => s.updateElementProps)
  const contentRef = useRef(null)

  const {
    content = '',
    fontSize = 18,
    fontFamily = 'Inter',
    fontWeight = '400',
    fontStyle = 'normal',
    color = '#ffffff',
    textAlign = 'left',
    lineHeight = 1.5,
  } = element.props || {}

  // Sync content from store to DOM when element changes from outside
  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      if (contentRef.current.textContent !== content) {
        contentRef.current.textContent = content
      }
    }
  }, [content])

  const handleInput = useCallback(
    (e) => {
      const newContent = e.currentTarget.textContent || ''
      updateElementProps(element.slideIndex, element.id, { content: newContent })
    },
    [element.slideIndex, element.id, updateElementProps]
  )

  const handleKeyDown = useCallback((e) => {
    // Prevent element deletion when typing
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation()
    }
    // Allow Enter for line breaks
    if (e.key === 'Enter' && !e.shiftKey) {
      e.stopPropagation()
    }
  }, [])

  return (
    <div
      ref={contentRef}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className="w-full h-full outline-none overflow-hidden break-words"
      style={{
        fontSize: `${fontSize}px`,
        fontFamily,
        fontWeight,
        fontStyle,
        color,
        textAlign,
        lineHeight,
        cursor: isSelected ? 'text' : 'move',
        padding: '4px 6px',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}
    />
  )
}
