'use client';

import { Mail, Clock, GitBranch, Bot, Zap, Play, CheckCircle } from 'lucide-react';

/**
 * Node Palette - Draggable node types for the flow builder
 */
export default function NodePalette({ onDragStart }) {
  const nodeTypes = [
    {
      type: 'email',
      label: 'Email',
      icon: Mail,
      color: 'blue',
      description: 'Send an email to the prospect'
    },
    {
      type: 'wait',
      label: 'Wait',
      icon: Clock,
      color: 'amber',
      description: 'Wait for a specified duration'
    },
    {
      type: 'condition',
      label: 'Condition',
      icon: GitBranch,
      color: 'purple',
      description: 'Check a condition and branch'
    },
    {
      type: 'categorize',
      label: 'AI Categorize',
      icon: Bot,
      color: 'indigo',
      description: 'Categorize reply with AI'
    },
    {
      type: 'action',
      label: 'Action',
      icon: Zap,
      color: 'orange',
      description: 'Perform an action'
    },
    {
      type: 'end',
      label: 'End',
      icon: CheckCircle,
      color: 'gray',
      description: 'End the sequence'
    }
  ];

  const handleDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(nodeType);
  };

  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700',
    purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700',
    indigo: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
    orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700',
    gray: 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700',
    green: 'border-green-200 bg-green-50 hover:bg-green-100 text-green-700',
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full">
      <h3 className="font-semibold text-gray-900 mb-4">Node Types</h3>
      <p className="text-xs text-gray-500 mb-4">Drag nodes onto the canvas to build your flow</p>
      
      <div className="space-y-2 flex-1 overflow-y-auto">
        {nodeTypes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => handleDragStart(e, node.type)}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-grab
                transition-all duration-200
                ${colorClasses[node.color]}
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">{node.label}</div>
                <div className="text-xs opacity-75">{node.description}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-700 text-sm mb-2">Tips</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Start with an Email node</li>
          <li>• Add Wait nodes for delays</li>
          <li>• Use Conditions to branch</li>
          <li>• AI Categorize routes replies</li>
        </ul>
      </div>
    </div>
  );
}
