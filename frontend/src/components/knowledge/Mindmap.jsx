import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDocumentStore } from '../../stores/documentStore.js'

export default function Mindmap() {
  const { mindmapNodes: storeNodes, mindmapEdges: storeEdges } = useDocumentStore()

  const initialNodes = storeNodes.map((node, i) => ({
    id: node.id || `node-${i}`,
    position: node.position || { x: 200 * (i % 4), y: 120 * Math.floor(i / 4) },
    data: { label: node.label || node.data?.label || `Node ${i}` },
    type: node.type || 'default',
  }))

  const initialEdges = storeEdges.map((edge, i) => ({
    id: edge.id || `edge-${i}`,
    source: edge.source,
    target: edge.target,
    animated: edge.animated ?? true,
    style: { strokeWidth: 2 },
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
