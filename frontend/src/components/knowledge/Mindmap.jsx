import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDocumentStore } from '../../stores/documentStore.js'

/**
 * Calculate hierarchical position for mindmap nodes
 * Level 0 (root) at center, Level 1 branches around root radially, Level 2 sub-branches
 */
function calculateHierarchicalPositions(nodes) {
  const positions = {}
  const levelNodes = {}

  // Group nodes by level
  nodes.forEach(node => {
    const level = node.level || 0
    if (!levelNodes[level]) levelNodes[level] = []
    levelNodes[level].push(node)
  })

  // Calculate positions
  const rootNode = nodes.find(n => n.level === 0)
  if (rootNode) {
    positions[rootNode.id] = { x: 0, y: 0 }

    // Position level 1 nodes in a circle around root
    const level1Nodes = levelNodes[1] || []
    const radius1 = 250
    level1Nodes.forEach((node, idx) => {
      const angle = (idx / level1Nodes.length) * 2 * Math.PI - Math.PI / 2
      positions[node.id] = {
        x: Math.cos(angle) * radius1,
        y: Math.sin(angle) * radius1,
      }

      // Position level 2 nodes around their parent
      const level2Children = nodes.filter(n => n.parentId === node.id && n.level === 2)
      const radius2 = 100
      level2Children.forEach((child, childIdx) => {
        const childAngle = (childIdx / Math.max(1, level2Children.length)) * 2 * Math.PI
        positions[child.id] = {
          x: positions[node.id].x + Math.cos(childAngle) * radius2,
          y: positions[node.id].y + Math.sin(childAngle) * radius2,
        }
      })
    })
  }

  return positions
}

export default function Mindmap() {
  const { mindmapNodes: storeNodes, mindmapEdges: storeEdges } = useDocumentStore()
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  // Calculate hierarchical positions
  const positions = useMemo(
    () => calculateHierarchicalPositions(storeNodes),
    [storeNodes]
  )

  // Create nodes with dark mode support
  const initialNodes = useMemo(
    () => storeNodes.map((node, i) => {
      // Node color กำหนดตามระดับ
      const bgColors = {
        0: '#6366f1',  // indigo - root (เข้มสุด)
        1: '#a855f7',  // purple - parent
        2: '#ec4899',  // pink - child (อ่อนสุด)
      }
      const bgColor = bgColors[node.level] || '#8b5cf6'

      // Text color: ดำในlightmode, ขาวในdarkmode
      const textColor = isDarkMode ? '#ffffff' : '#1a1a1a'

      // Shadow/glow ต่างกันตามระดับ เพื่อให้เห็นลำดับชั้น
      const shadows = {
        0: isDarkMode
          ? '0 10px 25px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.7)'
          : '0 10px 25px rgba(0,0,0,0.2), 0 0 15px rgba(99,102,241,0.4)',
        1: isDarkMode
          ? '0 7px 18px rgba(0,0,0,0.3), 0 0 15px rgba(168,85,247,0.6)'
          : '0 7px 18px rgba(0,0,0,0.15), 0 0 12px rgba(168,85,247,0.3)',
        2: isDarkMode
          ? '0 4px 12px rgba(0,0,0,0.25), 0 0 10px rgba(236,72,153,0.5)'
          : '0 4px 12px rgba(0,0,0,0.12), 0 0 8px rgba(236,72,153,0.25)',
      }

      return {
        id: node.id || `node-${i}`,
        position: positions[node.id] || node.position || { x: 0, y: i * 80 },
        data: { label: node.label || node.data?.label || `Node ${i}` },
        type: 'default',
        style: {
          // ขนาด/spacing ต่างกันตามระดับ
          padding: node.level === 0 ? '18px 24px' : node.level === 1 ? '14px 18px' : '11px 14px',
          borderRadius: '8px',
          fontSize: node.level === 0 ? '16px' : node.level === 1 ? '14px' : '12px',
          fontWeight: node.level === 0 ? '900' : node.level === 1 ? '700' : '600',
          backgroundColor: bgColor,
          color: textColor,
          border: node.level === 0 ? '3px solid rgba(255,255,255,0.5)' : '2px solid rgba(255,255,255,0.4)',
          boxShadow: shadows[node.level] || shadows[2],
          textShadow: isDarkMode
            ? '0 3px 6px rgba(0,0,0,0.7)'
            : '0 2px 4px rgba(255,255,255,0.5)',
          zIndex: node.level === 0 ? 30 : node.level === 1 ? 20 : 10,
          minWidth: node.level === 0 ? '100px' : node.level === 1 ? '85px' : 'auto',
        }
      }
    }),
    [storeNodes, positions, isDarkMode]
  )

  const initialEdges = storeEdges.map((edge, i) => ({
    id: edge.id || `edge-${i}`,
    source: edge.source,
    target: edge.target,
    animated: edge.animated ?? true,
    type: 'smoothstep',
    style: {
      strokeWidth: 2,
      stroke: '#a78bfa'
    },
  }))

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  if (storeNodes.length === 0) {
    return (
      <p className="text-sm text-surface-500 dark:text-surface-500 italic">
        ยังไม่มีข้อมูล Mindmap กรุณาอัปโหลดเอกสารก่อน
      </p>
    )
  }

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
        className="bg-dots"
      >
        <Background color="#6366f1" gap={24} size={1} />
        <Controls
          className="!bg-white dark:!bg-surface-800 !border !border-surface-300 dark:!border-surface-600 !rounded-lg !shadow-md [&>button]:!bg-white [&>button]:dark:!bg-surface-700 [&>button]:border-b [&>button]:border-surface-200 [&>button]:dark:border-surface-600 [&>button]:!text-surface-900 [&>button]:dark:!text-white [&>button]:hover:!bg-surface-100 [&>button]:dark:hover:!bg-surface-600 [&>button:last-child]:border-b-0"
        />
      </ReactFlow>
    </div>
  )
}
