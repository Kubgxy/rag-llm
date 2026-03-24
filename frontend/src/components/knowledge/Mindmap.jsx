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

  const initialNodes = storeNodes.map((node, i) => {
    // Node color กำหนดตามระดับ
    const bgColors = {
      0: '#6366f1',  // indigo
      1: '#a855f7',  // purple
      2: '#ec4899',  // pink
    }
    const bgColor = bgColors[node.level] || '#8b5cf6'

    // Text color - ขาวสำหรับ dark bg ตลอด
    return {
      id: node.id || `node-${i}`,
      position: positions[node.id] || node.position || { x: 0, y: i * 80 },
      data: { label: node.label || node.data?.label || `Node ${i}` },
      type: 'default', // 🔧 Fixed: use 'default' type ที่ ReactFlow รู้จัก
      style: {
        padding: node.level === 0 ? '16px 20px' : node.level === 1 ? '14px 18px' : '12px 16px',
        borderRadius: '8px',
        fontSize: node.level === 0 ? '15px' : node.level === 1 ? '14px' : '13px',
        fontWeight: node.level === 0 ? '800' : node.level === 1 ? '700' : '600',
        backgroundColor: bgColor,
        color: '#ffffff', // ขาวตลอด เพราะ background เข้มสำหรับ dark mode
        border: node.level === 0 ? '3px solid rgba(255,255,255,0.4)' : '2px solid rgba(255,255,255,0.3)',
        boxShadow: node.level === 0
          ? '0 6px 16px rgba(0,0,0,0.3), 0 0 12px rgba(99,102,241,0.5)'
          : '0 4px 12px rgba(0,0,0,0.25), 0 0 8px currentColor',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)', // เพิ่ม shadow ให้โด่ด
        zIndex: node.level === 0 ? 20 : node.level === 1 ? 15 : 10,
        minWidth: node.level === 0 ? '80px' : 'auto',
      }
    }
  })

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
