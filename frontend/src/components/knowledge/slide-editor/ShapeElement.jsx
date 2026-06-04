export default function ShapeElement({ element, isSelected }) {
  const {
    shapeType = 'rect',
    fillColor = '#3b82f6',
    strokeColor = '#1e40af',
    strokeWidth = 2,
    fillMode = 'fill', // 'fill', 'stroke', 'both'
    borderRadius = 0,
    opacity = 1,
  } = element.props || {}

  const hasFill = fillMode === 'fill' || fillMode === 'both'
  const hasStroke = fillMode === 'stroke' || fillMode === 'both'

  const actualFill = hasFill ? fillColor : 'transparent'
  const actualStroke = hasStroke ? strokeColor : 'transparent'
  const actualStrokeWidth = hasStroke ? strokeWidth : 0

  if (shapeType === 'triangle') {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ opacity }}
        className="w-full h-full block"
      >
        <polygon
          points="50,0 100,100 0,100"
          fill={actualFill}
          stroke={actualStroke}
          strokeWidth={actualStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  if (shapeType === 'line') {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ opacity }}
      >
        <div
          className="w-full"
          style={{
            height: `${actualStrokeWidth}px`,
            backgroundColor: actualStroke,
          }}
        />
      </div>
    )
  }

  // Rect and Circle (handled via border-radius)
  return (
    <div
      className="w-full h-full"
      style={{
        backgroundColor: actualFill,
        border: `${actualStrokeWidth}px solid ${actualStroke}`,
        borderRadius: shapeType === 'circle' ? '9999px' : `${borderRadius}px`,
        opacity,
      }}
    />
  )
}
