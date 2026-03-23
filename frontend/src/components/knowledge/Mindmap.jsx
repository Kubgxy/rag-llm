import { useCallback, useMemo } from 'react'
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

  // Calculate hierarchical positions
  const positions = useMemo(
    () => calculateHierarchicalPositions(storeNodes),
    [storeNodes]
  )

  const initialNodes = storeNodes.map((node, i) => ({
    id: node.id || `node-${i}`,
    position: positions[node.id] || node.position || { x: 0, y: i * 80 },
    data: { label: node.label || node.data?.label || `Node ${i}` },
    type: node.type || 'default',
    style: {
      padding: '10px 15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: node.level === 0 ? '600' : '500',
      backgroundColor:
        node.level === 0
          ? '#6366f1'
          : node.level === 1
          ? '#a855f7'
          : '#ec4899',
      color: 'white',
      border: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }
  }))

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
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
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
          className="!bg-white dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700 !rounded-xl !shadow-lg"
        />
      </ReactFlow>
    </div>
  )
}
