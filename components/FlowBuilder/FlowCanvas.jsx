'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './FlowNodes';
import NodePalette from './NodePalette';
import NodeConfigPanel from './NodeConfigPanel';
import AIFlowModal from './AIFlowModal';

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

/**
 * Main Flow Canvas component for the visual email flow builder
 */
function FlowCanvas({
  initialNodes = [],
  initialEdges = [],
  onSave,
  campaignId,
  campaignName
}) {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  // Handle new connections
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: params.sourceHandle === 'yes',
        style: { strokeWidth: 2 },
        label: params.sourceHandle || '',
      }, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  // Handle drag over for dropping new nodes
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop of new node from palette
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Default data based on node type
      const defaultData = {
        start: { label: 'Start' },
        email: { subject: 'New Email', template: 'Add your content here...', isFirstEmail: nodes.length === 0 },
        wait: { duration: 24, unit: 'hours', businessHoursOnly: true },
        condition: { conditionType: 'email_opened' },
        categorize: { useAI: true, confidenceThreshold: 0.7 },
        action: { actionType: 'stop_sequence' },
        end: { label: 'End' },
      };

      const newNode = {
        id: getNodeId(),
        type,
        position,
        data: defaultData[type] || {},
      };

      setNodes((nds) => nds.concat(newNode));
      setHasUnsavedChanges(true);
    },
    [reactFlowInstance, nodes.length, setNodes]
  );

  // Handle node selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Handle node deselection
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from config panel
  const onNodeDataChange = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

  // Delete selected node
  const onDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    setHasUnsavedChanges(true);
  }, [setNodes, setEdges]);

  // Apply AI-generated flow to canvas
  const handleAIApplyFlow = useCallback((aiNodes, aiEdges) => {
    // Reset internal node counter to avoid ID clashes with AI node IDs
    nodeId = 0;
    setSelectedNode(null);
    setNodes(aiNodes);
    setEdges(aiEdges);
    setHasUnsavedChanges(true);
    // Fit view after a small delay so React Flow has rendered the new nodes
    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.15 }), 100);
  }, [setNodes, setEdges, reactFlowInstance]);

  // Save flow
  const handleSave = useCallback(async () => {
    if (!reactFlowInstance) return;

    const flow = {
      nodes,
      edges,
      viewport: reactFlowInstance.getViewport(),
      startNodeId: nodes.find(n => n.type === 'start')?.id || nodes[0]?.id,
      name: `${campaignName || 'Campaign'} Flow`,
    };

    if (onSave) {
      await onSave(flow);
      setHasUnsavedChanges(false);
    }
  }, [nodes, edges, reactFlowInstance, campaignName, onSave]);

  // Auto-save indicator
  const nodeColor = (node) => {
    const colors = {
      start: '#22c55e',
      email: '#3b82f6',
      wait: '#f59e0b',
      condition: '#a855f7',
      categorize: '#6366f1',
      action: '#f97316',
      end: '#6b7280',
    };
    return colors[node.type] || '#888';
  };

  return (
    <div className="flex h-full">
      {/* Node Palette - Left Sidebar */}
      <NodePalette />
      
      {/* Main Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 h-full relative">
        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
          {/* AI Builder button */}
          <button
            onClick={() => setShowAIModal(true)}
            className="px-4 py-2 rounded-lg font-semibold text-white text-sm flex items-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              boxShadow: '0 4px 15px rgba(124,58,237,0.35)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.55)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,58,237,0.35)'}
          >
            ✨ AI Builder
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors shadow-md flex items-center gap-2"
          >
            <span>Save Flow</span>
          </button>
        </div>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 2 },
          }}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap nodeColor={nodeColor} pannable zoomable />
        </ReactFlow>
      </div>
      
      {/* Node Config Panel - Right Sidebar */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onDataChange={onNodeDataChange}
          onDelete={onDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* AI Flow Builder Modal */}
      {showAIModal && (
        <AIFlowModal
          onClose={() => setShowAIModal(false)}
          onApplyFlow={handleAIApplyFlow}
        />
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function FlowCanvasWrapper(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
