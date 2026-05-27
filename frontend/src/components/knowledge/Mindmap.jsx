import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDocumentStore } from '../../stores/documentStore.js'
import { ChevronRight } from 'lucide-react'
import { useLanguageStore } from '../../stores/languageStore.js'

/**
 * Calculate positions for visible nodes with dynamic spacing (NotebookLM style)
 */
function calculateRadialPositions(visibleNodes, expandedNodes, allNodes) {
  const positions = {}
  const rootNode = visibleNodes.find(n => n.level === 0)

  if (!rootNode) return positions

  // Root at center-left
  positions[rootNode.id] = { x: 50, y: 0 }

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

  // Calculate height needed for each node (including its descendants)
  const calculateSubtreeHeight = (nodeId) => {
    const children = childrenByParent[nodeId] || []
    if (children.length === 0 || !expandedNodes.has(nodeId)) {
      return 1 // Base height for leaf nodes
    }

    // Sum heights of all children
    const childrenHeight = children.reduce((sum, child) => {
      return sum + calculateSubtreeHeight(child.id)
    }, 0)

    return Math.max(1, childrenHeight)
  }

  // Position children with dynamic vertical spacing
  const processLevel = (parentId, parentPos, level) => {
    const children = childrenByParent[parentId] || []
    if (children.length === 0) return

    const horizontalOffset = 250 // Fixed horizontal offset

    // Calculate total height needed
    const totalHeight = children.reduce((sum, child) => {
      return sum + calculateSubtreeHeight(child.id)
    }, 0)

    const verticalSpacing = 60 // Base spacing between nodes
    const totalVerticalSpace = (totalHeight - 1) * verticalSpacing

    // Start from top
    let currentY = parentPos.y - totalVerticalSpace / 2

    children.forEach((child) => {
      const childHeight = calculateSubtreeHeight(child.id)
      const childVerticalSpace = (childHeight - 1) * verticalSpacing

      // Position at the center of this child's allocated space
      positions[child.id] = {
        x: parentPos.x + horizontalOffset,
        y: currentY + childVerticalSpace / 2,
      }

      // Recursively position grandchildren
      processLevel(child.id, positions[child.id], level + 1)

      // Move to next position
      currentY += childVerticalSpace + verticalSpacing
    })
  }

  processLevel(rootNode.id, positions[rootNode.id], 1)
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
        // Also collapse all descendants
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

  // Calculate visible nodes (only show children of expanded nodes)
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

  // Calculate positions for visible nodes
  const positions = useMemo(
    () => calculateRadialPositions(visibleNodes, expandedNodes, sourceNodes),
    [visibleNodes, expandedNodes, sourceNodes]
  )

  // Track entering nodes for animation with stagger (use ref to avoid re-renders)
  const [enteringNodesMap, setEnteringNodesMap] = useState(new Map())
  const staggerDelaysRef = useRef(new Map()) // Use ref instead of state to avoid extra re-renders

  useEffect(() => {
    const currentIds = new Set(visibleNodes.map(n => n.id))
    const prevIds = prevVisibleIdsRef.current

    // Find newly added nodes
    const newNodeIds = []
    visibleNodes.forEach(n => {
      if (!prevIds.has(n.id)) {
        newNodeIds.push(n.id)
      }
    })

    // Update prev ref first
    prevVisibleIdsRef.current = currentIds

    if (newNodeIds.length > 0) {
      // Set stagger delays in ref (no re-render)
      newNodeIds.forEach((id, index) => {
        staggerDelaysRef.current.set(id, index * 60)
      })

      // Set entering state (triggers one re-render with nodes hidden)
      setEnteringNodesMap(new Map(newNodeIds.map((id, i) => [id, i])))

      // After a short delay, clear entering state (triggers one re-render to show nodes)
      const timer = setTimeout(() => {
        setEnteringNodesMap(new Map())
        // Clear stagger delays after animation
        setTimeout(() => {
          staggerDelaysRef.current.clear()
        }, 400)
      }, 20)

      return () => clearTimeout(timer)
    }
  }, [visibleNodes])

  // Create React Flow nodes with NotebookLM styling
  const initialNodes = useMemo(() => {
    return visibleNodes.map((node, i) => {
      // NotebookLM-style colors
      const lightModeColors = {
        0: { bg: '#E8E3F8', text: '#4A3F7A' },
        1: { bg: '#D4F0E8', text: '#2D5A4B' },
        2: { bg: '#FFE8D6', text: '#7A5132' },
      }

      const darkModeColors = {
        0: { bg: '#4A3F7A', text: '#E8E3F8' },
        1: { bg: '#2D5A4B', text: '#D4F0E8' },
        2: { bg: '#7A5132', text: '#FFE8D6' },
      }

      const colors = isDarkMode ? darkModeColors[node.level] : lightModeColors[node.level]
      const bgColor = colors?.bg || (isDarkMode ? '#4A3F7A' : '#E8E3F8')
      const textColor = colors?.text || (isDarkMode ? '#E8E3F8' : '#4A3F7A')

      const shadows = {
        0: isDarkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.08)',
        1: isDarkMode ? '0 4px 20px rgba(0,0,0,0.25)' : '0 4px 20px rgba(0,0,0,0.06)',
        2: isDarkMode ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.05)',
      }

      const hasChildren = sourceNodes.some(n => n.parentId === node.id)
      const isExpanded = expandedNodes.has(node.id)
      const isEntering = enteringNodesMap.has(node.id)
      const staggerDelay = staggerDelaysRef.current.get(node.id) || 0

      return {
        id: node.id || `node-${i}`,
        position: positions[node.id] || { x: 0, y: i * 80 },
        data: {
          label: (
            <div className="flex items-center gap-2">
              <span>{node.label || node.data?.label || `Node ${i}`}</span>
              {hasChildren && (
                <ChevronRight
                  size={14}
                  className={`transition-transform duration-300 ${
                    isExpanded ? 'rotate-90' : 'rotate-0'
                  }`}
                  style={{ opacity: 0.7 }}
                />
              )}
            </div>
          ),
        },
        type: 'default',
        sourcePosition: 'right',
        targetPosition: 'left',
        className: isEntering ? 'node-entering' : '',
        style: {
          padding: node.level === 0 ? '20px 28px' : node.level === 1 ? '16px 22px' : '12px 18px',
          borderRadius: '10px',
          fontSize: node.level === 0 ? '16px' : node.level === 1 ? '14px' : '13px',
          fontWeight: node.level === 0 ? '600' : '500',
          backgroundColor: bgColor,
          color: textColor,
          border: 'none',
          boxShadow: shadows[node.level] || shadows[2],
          cursor: hasChildren ? 'pointer' : 'default',
          transitionDelay: `${staggerDelay}ms`,
        },
      }
    })
  }, [visibleNodes, positions, isDarkMode, expandedNodes, sourceNodes, enteringNodesMap])

  // Create edges only for visible nodes
  const initialEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id))

    return sourceEdges
      .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge, i) => ({
        id: edge.id || `edge-${i}`,
        source: edge.source,
        target: edge.target,
        animated: false,
        type: 'smoothstep',
        style: {
          strokeWidth: 1.5,
          stroke: isDarkMode ? 'rgba(200, 200, 220, 0.3)' : 'rgba(100, 100, 120, 0.2)',
        },
      }))
  }, [visibleNodes, sourceEdges, isDarkMode])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when dependencies change
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // Handle node click
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
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
          duration: 400,
        }}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.5}
        maxZoom={1.5}
        nodeOrigin={[0.5, 0.5]}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={isDarkMode ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.03)'}
          gap={32}
          size={0.5}
        />
        <Controls
          className="!bg-white dark:!bg-surface-800 !border !border-surface-300 dark:!border-surface-600 !rounded-lg !shadow-md [&>button]:!bg-white [&>button]:dark:!bg-surface-700 [&>button]:border-b [&>button]:border-surface-200 [&>button]:dark:border-surface-600 [&>button]:!text-surface-900 [&>button]:dark:!text-white [&>button]:hover:!bg-surface-100 [&>button]:dark:hover:!bg-surface-600 [&>button:last-child]:border-b-0"
        />
      </ReactFlow>
    </div>
  )
}
