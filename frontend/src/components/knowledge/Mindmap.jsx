import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDocumentStore } from '../../stores/documentStore.js'
import { ChevronRight, Sparkles, Layers, FileText, Circle } from 'lucide-react'
import { useLanguageStore } from '../../stores/languageStore.js'

/**
 * Beautiful Custom Mindmap Node Component
 * Supports bi-directional flowing layouts:
 * - 'center' (Root): Has source handles on both Left and Right sides.
 * - 'left': Target handle is on the Right, Source handle is on the Left (flowing leftwards).
 * - 'right': Target handle is on the Left, Source handle is on the Right (flowing rightwards).
 */
function MindmapNode({ data }) {
  const { label, level, hasChildren, isExpanded, isEntering, staggerDelay, direction } = data

  const renderIcon = () => {
    switch (level) {
      case 0:
        return (
          <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-full shadow-sm animate-pulse mb-1 flex-shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
        )
      case 1:
        return (
          <div className="w-4 h-4 flex items-center justify-center bg-primary-500/10 dark:bg-primary-400/15 rounded-md flex-shrink-0">
            <Layers size={10} className="text-primary-500 dark:text-primary-400" />
          </div>
        )
      case 2:
        return (
          <div className="w-4 h-4 flex items-center justify-center bg-accent-500/10 dark:bg-accent-400/15 rounded-md flex-shrink-0">
            <FileText size={10} className="text-accent-500 dark:text-accent-400" />
          </div>
        )
      default:
        return (
          <div className="w-3.5 h-3.5 flex items-center justify-center bg-surface-500/10 dark:bg-surface-400/15 rounded-md flex-shrink-0">
            <Circle size={4} className="fill-surface-400 text-surface-400 dark:fill-surface-500 dark:text-surface-500" />
          </div>
        )
    }
  }

  // Level-specific styles matching modern minimal system themes
  let nodeStyle = ""
  if (level === 0) {
    nodeStyle = "w-36 h-36 flex flex-col justify-center items-center text-center rounded-full bg-primary-500 dark:bg-primary-600 text-white font-semibold shadow-md border-4 border-primary-100 dark:border-primary-900/60 p-4 transition-transform duration-300 hover:scale-105"
  } else if (level === 1) {
    nodeStyle = "bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-800 border-l-[6px] border-l-primary-500 dark:border-l-primary-400 rounded-lg shadow-sm px-5 py-3.5 flex items-center gap-2.5 transition-all duration-200 hover:border-surface-300 hover:scale-[1.02] min-w-[160px]"
  } else if (level === 2) {
    nodeStyle = "bg-accent-50/90 dark:bg-accent-950/20 text-accent-700 dark:text-accent-300 border border-accent-300/60 dark:border-accent-800/80 rounded-full px-5 py-2 flex items-center gap-2.5 shadow-xs transition-all duration-200 hover:scale-[1.02] min-w-[140px]"
  } else {
    nodeStyle = "bg-surface-50 dark:bg-surface-950/30 text-surface-600 dark:text-surface-400 border border-dashed border-surface-300 dark:border-surface-800 rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md px-4 py-2 flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] min-w-[120px]"
  }

  return (
    <div
      className={`group relative transition-all cursor-pointer ${nodeStyle} ${
        isEntering ? 'node-entering' : ''
      }`}
      style={{
        transitionDelay: `${staggerDelay}ms`,
      }}
    >
      {/* Handles configuration based on flow direction */}
      {direction === 'center' ? (
        // Root node has left source and right source handles
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="source-left"
            style={{
              width: '8px',
              height: '8px',
              background: '#818CF8',
              border: '2px solid white',
              borderRadius: '50%',
              left: '-5px',
              opacity: 0,
            }}
            className="group-hover:opacity-100 transition-opacity duration-200"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            style={{
              width: '8px',
              height: '8px',
              background: '#818CF8',
              border: '2px solid white',
              borderRadius: '50%',
              right: '-5px',
              opacity: 0,
            }}
            className="group-hover:opacity-100 transition-opacity duration-200"
          />
        </>
      ) : direction === 'left' ? (
        // Left branches: Target on right (parent), Source on left (children)
        <>
          <Handle
            type="target"
            position={Position.Right}
            id="target"
            style={{
              width: '6px',
              height: '6px',
              background: level === 1 ? '#6366F1' : level === 2 ? '#0EA5E9' : '#94A3B8',
              border: '1px solid white',
              borderRadius: '50%',
              right: '-4px',
              opacity: 0,
            }}
            className="group-hover:opacity-100 transition-opacity duration-200"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="source"
            style={{
              width: '6px',
              height: '6px',
              background: level === 1 ? '#6366F1' : level === 2 ? '#0EA5E9' : '#94A3B8',
              border: '1px solid white',
              borderRadius: '50%',
              left: '-4px',
              opacity: 0,
            }}
            className="group-hover:opacity-100 transition-opacity duration-200"
          />
        </>
      ) : (
        // Right branches: Target on left (parent), Source on right (children)
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="target"
            style={{
              width: '6px',
              height: '6px',
              background: level === 1 ? '#6366F1' : level === 2 ? '#0EA5E9' : '#94A3B8',
              border: '1px solid white',
              borderRadius: '50%',
              left: '-4px',
              opacity: 0,
            }}
            className="group-hover:opacity-100 transition-opacity duration-200"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source"
            style={{
              width: '6px',
              height: '6px',
              background: level === 1 ? '#6366F1' : level === 2 ? '#0EA5E9' : '#94A3B8',
              border: '1px solid white',
              borderRadius: '50%',
              right: '-4px',
              opacity: 0,
            }}
            className="group-hover:opacity-100 transition-opacity duration-200"
          />
        </>
      )}

      {/* Node Content */}
      <div className={`flex ${level === 0 ? 'flex-col justify-center items-center gap-1' : 'items-center gap-2.5'} w-full`}>
        {renderIcon()}
        <span
          className={`
            ${level === 0 ? 'text-xs font-semibold max-w-[115px] break-words text-center text-white leading-snug' : level === 1 ? 'text-sm font-medium' : 'text-xs'} 
            tracking-wide leading-tight text-center w-full
          `}
        >
          {label}
        </span>
      </div>

      {hasChildren && (
        <div className={`${level === 0 ? 'mt-1' : 'ml-1'} p-0.5 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors flex-shrink-0`}>
          <ChevronRight
            size={13}
            className={`transition-transform duration-300 text-surface-400 dark:text-surface-500 group-hover:text-surface-700 dark:group-hover:text-surface-300 ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            }`}
          />
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  mindmapNode: MindmapNode,
}

/**
 * Calculate positions for bi-directional layout
 * Root node is in the center at (0, 0).
 * Level 1 branches are split alternately: Left and Right.
 * Spacing is carefully budgeted to completely avoid overlaps.
 */
function calculateRadialPositions(visibleNodes, expandedNodes, allNodes) {
  const positions = {}
  const rootNode = visibleNodes.find(n => n.level === 0)

  if (!rootNode) return positions

  // Center root node at 0, 0
  positions[rootNode.id] = { x: 0, y: 0 }

  // Group visible nodes by parent
  const childrenByParent = {}
  visibleNodes.forEach(node => {
    if (node.parentId) {
      if (!childrenByParent[node.parentId]) {
        childrenByParent[node.parentId] = []
      }
      childrenByParent[node.parentId].push(node)
    }
  })

  // Calculate subtree height (used for vertical spacing balance)
  const calculateSubtreeHeight = (nodeId) => {
    const children = childrenByParent[nodeId] || []
    if (children.length === 0 || !expandedNodes.has(nodeId)) {
      return 1 // Base height
    }
    return children.reduce((sum, child) => sum + calculateSubtreeHeight(child.id), 0)
  }

  // Split root children alternately: left and right
  const rootChildren = childrenByParent[rootNode.id] || []
  const leftChildren = rootChildren.filter((_, idx) => idx % 2 === 0)
  const rightChildren = rootChildren.filter((_, idx) => idx % 2 !== 0)

  const horizontalOffset = 300 // Spacious distance between hierarchy steps
  const verticalSpacing = 95 // Balanced vertical gap to prevent overlaps

  // Layout a side (left or right)
  const processSide = (branches, side) => {
    if (branches.length === 0) return

    // Calculate total subtree height on this side
    const totalHeight = branches.reduce((sum, branch) => {
      return sum + calculateSubtreeHeight(branch.id)
    }, 0)

    const totalVerticalSpace = (totalHeight - 1) * verticalSpacing
    let currentY = -totalVerticalSpace / 2

    branches.forEach((branch) => {
      const branchHeight = calculateSubtreeHeight(branch.id)
      const branchVerticalSpace = (branchHeight - 1) * verticalSpacing

      // Position the primary Level 1 branch
      const branchX = side === 'left' ? -horizontalOffset : horizontalOffset
      const branchY = currentY + branchVerticalSpace / 2
      positions[branch.id] = { x: branchX, y: branchY }

      // Recursively process descendants
      const processDescendants = (parentId, parentPos) => {
        const children = childrenByParent[parentId] || []
        if (children.length === 0) return

        const childrenHeight = children.reduce((sum, child) => {
          return sum + calculateSubtreeHeight(child.id)
        }, 0)
        
        const space = (childrenHeight - 1) * verticalSpacing
        let childYStart = parentPos.y - space / 2

        children.forEach((child) => {
          const childHeight = calculateSubtreeHeight(child.id)
          const childVerticalSpace = (childHeight - 1) * verticalSpacing

          positions[child.id] = {
            x: side === 'left' ? parentPos.x - horizontalOffset : parentPos.x + horizontalOffset,
            y: childYStart + childVerticalSpace / 2,
          }

          processDescendants(child.id, positions[child.id])
          childYStart += childVerticalSpace + verticalSpacing
        })
      }

      processDescendants(branch.id, positions[branch.id])

      currentY += branchVerticalSpace + verticalSpacing
    })
  }

  processSide(leftChildren, 'left')
  processSide(rightChildren, 'right')

  return positions
}

export default function Mindmap({ nodes: inputNodes = null, edges: inputEdges = null }) {
  const { mindmapNodes: storeNodes, mindmapEdges: storeEdges } = useDocumentStore()
  const { t } = useLanguageStore()
  const sourceNodes = Array.isArray(inputNodes) ? inputNodes : storeNodes
  const sourceEdges = Array.isArray(inputEdges) ? inputEdges : storeEdges
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const prevVisibleIdsRef = useRef(new Set())

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Initialize: expand root node automatically
  useEffect(() => {
    if (sourceNodes.length > 0) {
      const rootNode = sourceNodes.find(n => n.level === 0)
      if (rootNode) {
        setExpandedNodes(new Set([rootNode.id]))
      }
    }
  }, [sourceNodes])

  // Toggle node expansion
  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
        // Collapse all descendants
        const removeDescendants = (id) => {
          sourceNodes.forEach(node => {
            if (node.parentId === id) {
              newSet.delete(node.id)
              removeDescendants(node.id)
            }
          })
        }
        removeDescendants(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [sourceNodes])

  // Calculate visible nodes
  const visibleNodes = useMemo(() => {
    const visible = []
    const addNodeAndChildren = (nodeId) => {
      const node = sourceNodes.find(n => n.id === nodeId)
      if (!node) return

      visible.push(node)

      if (expandedNodes.has(nodeId)) {
        const children = sourceNodes.filter(n => n.parentId === nodeId)
        children.forEach(child => addNodeAndChildren(child.id))
      }
    }

    const rootNode = sourceNodes.find(n => n.level === 0)
    if (rootNode) {
      addNodeAndChildren(rootNode.id)
    }

    return visible
  }, [sourceNodes, expandedNodes])

  // Calculate positions
  const positions = useMemo(
    () => calculateRadialPositions(visibleNodes, expandedNodes, sourceNodes),
    [visibleNodes, expandedNodes, sourceNodes]
  )

  // Track entering nodes for animation
  const [enteringNodesMap, setEnteringNodesMap] = useState(new Map())
  const staggerDelaysRef = useRef(new Map())

  useEffect(() => {
    const currentIds = new Set(visibleNodes.map(n => n.id))
    const prevIds = prevVisibleIdsRef.current

    const newNodeIds = []
    visibleNodes.forEach(n => {
      if (!prevIds.has(n.id)) {
        newNodeIds.push(n.id)
      }
    })

    prevVisibleIdsRef.current = currentIds

    if (newNodeIds.length > 0) {
      newNodeIds.forEach((id, index) => {
        staggerDelaysRef.current.set(id, index * 60)
      })

      setEnteringNodesMap(new Map(newNodeIds.map((id, i) => [id, i])))

      const timer = setTimeout(() => {
        setEnteringNodesMap(new Map())
        setTimeout(() => {
          staggerDelaysRef.current.clear()
        }, 400)
      }, 20)

      return () => clearTimeout(timer)
    }
  }, [visibleNodes])

  // Create React Flow nodes with flow directions (left or right)
  const initialNodes = useMemo(() => {
    const rootNode = sourceNodes.find(n => n.level === 0)
    const childrenByParent = {}
    sourceNodes.forEach(node => {
      if (node.parentId) {
        if (!childrenByParent[node.parentId]) {
          childrenByParent[node.parentId] = []
        }
        childrenByParent[node.parentId].push(node)
      }
    })

    // Pre-calculate direction for all subtrees
    const rootChildren = rootNode ? (childrenByParent[rootNode.id] || []) : []
    const nodeDirections = {}
    if (rootNode) {
      nodeDirections[rootNode.id] = 'center'
      rootChildren.forEach((child, idx) => {
        const direction = idx % 2 === 0 ? 'left' : 'right'
        const assignDirection = (nodeId, dir) => {
          nodeDirections[nodeId] = dir
          const children = childrenByParent[nodeId] || []
          children.forEach(c => assignDirection(c.id, dir))
        }
        assignDirection(child.id, direction)
      })
    }

    return visibleNodes.map((node, i) => {
      const hasChildren = sourceNodes.some(n => n.parentId === node.id)
      const isExpanded = expandedNodes.has(node.id)
      const isEntering = enteringNodesMap.has(node.id)
      const staggerDelay = staggerDelaysRef.current.get(node.id) || 0
      const direction = nodeDirections[node.id] || 'right'

      return {
        id: node.id || `node-${i}`,
        position: positions[node.id] || { x: 0, y: i * 80 },
        data: {
          label: node.label || node.data?.label || `Node ${i}`,
          level: node.level,
          hasChildren,
          isExpanded,
          isEntering,
          staggerDelay,
          direction,
        },
        type: 'mindmapNode',
        sourcePosition: direction === 'left' ? 'left' : 'right',
        targetPosition: direction === 'left' ? 'right' : 'left',
      }
    })
  }, [visibleNodes, positions, expandedNodes, sourceNodes, enteringNodesMap])

  // Create clean, minimal edges connected to precise left/right source handles on the root
  const initialEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id))

    // Pre-calculate directions for edges
    const rootNode = sourceNodes.find(n => n.level === 0)
    const childrenByParent = {}
    sourceNodes.forEach(node => {
      if (node.parentId) {
        if (!childrenByParent[node.parentId]) {
          childrenByParent[node.parentId] = []
        }
        childrenByParent[node.parentId].push(node)
      }
    })

    const rootChildren = rootNode ? (childrenByParent[rootNode.id] || []) : []
    const nodeDirections = {}
    if (rootNode) {
      nodeDirections[rootNode.id] = 'center'
      rootChildren.forEach((child, idx) => {
        const direction = idx % 2 === 0 ? 'left' : 'right'
        const assignDirection = (nodeId, dir) => {
          nodeDirections[nodeId] = dir
          const children = childrenByParent[nodeId] || []
          children.forEach(c => assignDirection(c.id, dir))
        }
        assignDirection(child.id, direction)
      })
    }

    return sourceEdges
      .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge, i) => {
        const strokeColor = isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(203, 213, 225, 0.8)'
        
        const targetDirection = nodeDirections[edge.target] || 'right'
        const isSourceRoot = edge.source === rootNode?.id

        // Route to the appropriate handle of the root node
        let sourceHandleId = 'source'
        let targetHandleId = 'target'

        if (isSourceRoot) {
          sourceHandleId = targetDirection === 'left' ? 'source-left' : 'source-right'
        }

        return {
          id: edge.id || `edge-${i}`,
          source: edge.source,
          target: edge.target,
          sourceHandle: sourceHandleId,
          targetHandle: targetHandleId,
          animated: false,
          type: 'default',
          style: {
            strokeWidth: 1.5,
            stroke: strokeColor,
          },
        }
      })
  }, [visibleNodes, sourceEdges, isDarkMode, sourceNodes])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const onNodeClick = useCallback((event, node) => {
    const hasChildren = sourceNodes.some(n => n.parentId === node.id)
    if (hasChildren) {
      toggleNode(node.id)
    }
  }, [sourceNodes, toggleNode])

  if (sourceNodes.length === 0) {
    return (
      <p className="text-sm text-surface-500 dark:text-surface-500 italic">
        {t('mindmapNoData')}
      </p>
    )
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-radial-gradient">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.25,
          duration: 400,
        }}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.4}
        maxZoom={1.5}
        nodeOrigin={[0.5, 0.5]}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={isDarkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.04)'}
          gap={28}
          size={1}
          variant="dots"
        />
        <Controls
          className="!bg-white/80 dark:!bg-surface-900/80 !backdrop-blur-md !border !border-surface-200/50 dark:!border-surface-800/50 !rounded-xl !shadow-sm [&>button]:!bg-transparent [&>button]:border-b [&>button]:border-surface-100 [&>button]:dark:border-surface-800 [&>button]:!text-surface-500 [&>button]:dark:!text-surface-400 [&>button]:hover:!bg-surface-100/50 [&>button]:dark:hover:!bg-surface-800/50 [&>button:last-child]:border-b-0"
        />
      </ReactFlow>
    </div>
  )
}
