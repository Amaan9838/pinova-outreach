'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mail, Clock, GitBranch, Bot, Play, CheckCircle, Zap, Settings } from 'lucide-react';

/**
 * Base node wrapper with common styling
 */
const BaseNode = ({ children, type, label, selected, className = '' }) => {
  const typeColors = {
    start: 'border-green-500 bg-green-50',
    email: 'border-blue-500 bg-blue-50',
    wait: 'border-amber-500 bg-amber-50',
    condition: 'border-purple-500 bg-purple-50',
    categorize: 'border-indigo-500 bg-indigo-50',
    action: 'border-orange-500 bg-orange-50',
    end: 'border-gray-500 bg-gray-50',
  };

  return (
    <div 
      className={`
        rounded-lg border-2 shadow-md min-w-[180px] max-w-[220px]
        ${typeColors[type] || 'border-gray-300 bg-white'}
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
        ${className}
      `}
    >
      <div className="px-3 py-2 border-b border-inherit bg-inherit rounded-t-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          {children}
          {label && <span className="truncate">{label}</span>}
        </div>
      </div>
    </div>
  );
};

/**
 * Start Node - Entry point of the flow
 */
export const StartNode = memo(({ data, selected }) => {
  return (
    <BaseNode type="start" label={data.label || 'Start'} selected={selected}>
      <Play className="w-4 h-4 text-green-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </BaseNode>
  );
});
StartNode.displayName = 'StartNode';

/**
 * Email Node - Sends an email
 */
export const EmailNode = memo(({ data, selected }) => {
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <BaseNode type="email" selected={selected}>
        <Mail className="w-4 h-4 text-blue-600" />
        <span className="truncate">{data.subject || 'Email'}</span>
      </BaseNode>
      <div className="px-3 py-2 bg-white rounded-b-lg text-xs text-gray-500">
        {data.isFirstEmail && <span className="text-blue-600 font-medium">First Email</span>}
        {!data.isFirstEmail && <span>Follow-up</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
});
EmailNode.displayName = 'EmailNode';

/**
 * Wait Node - Delays execution
 */
export const WaitNode = memo(({ data, selected }) => {
  const duration = data.duration || 24;
  const unit = data.unit || 'hours';
  
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <BaseNode type="wait" selected={selected}>
        <Clock className="w-4 h-4 text-amber-600" />
        <span>Wait {duration} {unit}</span>
      </BaseNode>
      <div className="px-3 py-2 bg-white rounded-b-lg text-xs text-gray-500">
        {data.businessHoursOnly ? 'Business hours only' : 'Any time'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  );
});
WaitNode.displayName = 'WaitNode';

/**
 * Condition Node - Checks conditions and branches
 */
export const ConditionNode = memo(({ data, selected }) => {
  const conditionLabels = {
    email_opened: 'Email Opened?',
    email_not_opened: 'Not Opened?',
    email_clicked: 'Link Clicked?',
    email_replied: 'Replied?',
    email_bounced: 'Bounced?',
    no_action_after_wait: 'Opened but No Reply?',
    reply_category: `Category: ${data.targetCategory || '?'}`,
  };
  
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <BaseNode type="condition" selected={selected}>
        <GitBranch className="w-4 h-4 text-purple-600" />
        <span className="truncate">{conditionLabels[data.conditionType] || 'Condition'}</span>
      </BaseNode>
      <div className="px-3 py-2 bg-white rounded-b-lg text-xs">
        <div className="flex justify-between">
          <span className="text-green-600">✓ Yes</span>
          <span className="text-red-600">✗ No</span>
        </div>
      </div>
      {/* Multiple output handles for yes/no branches */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="yes" 
        className="!bg-green-500"
        style={{ left: '30%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="no" 
        className="!bg-red-500"
        style={{ left: '70%' }}
      />
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

/**
 * Categorize Node - AI categorizes reply
 */
export const CategorizeNode = memo(({ data, selected }) => {
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500" />
      <BaseNode type="categorize" selected={selected}>
        <Bot className="w-4 h-4 text-indigo-600" />
        <span>AI Categorize</span>
      </BaseNode>
      <div className="px-3 py-2 bg-white rounded-b-lg text-xs text-gray-500">
        <div className="flex flex-wrap gap-1">
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Curious</span>
          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Interested</span>
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Objection</span>
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">Not Now</span>
        </div>
      </div>
      {/* Output handles for each category */}
      <Handle type="source" position={Position.Bottom} id="curious" className="!bg-blue-500" style={{ left: '15%' }} />
      <Handle type="source" position={Position.Bottom} id="interested" className="!bg-green-500" style={{ left: '38%' }} />
      <Handle type="source" position={Position.Bottom} id="objection" className="!bg-amber-500" style={{ left: '62%' }} />
      <Handle type="source" position={Position.Bottom} id="not-now" className="!bg-gray-500" style={{ left: '85%' }} />
    </div>
  );
});
CategorizeNode.displayName = 'CategorizeNode';

/**
 * Action Node - Performs an action
 */
export const ActionNode = memo(({ data, selected }) => {
  const actionLabels = {
    send_response: 'Send Response',
    stop_sequence: 'Stop Sequence',
    add_tag: `Add Tag: ${data.tagName || ''}`,
    move_to_pipeline: 'Move to Pipeline',
    notify_user: 'Notify User',
    schedule_followup: 'Schedule Follow-up',
  };
  
  const ActionIcon = data.actionType === 'stop_sequence' ? CheckCircle : Zap;
  
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      <BaseNode type="action" selected={selected}>
        <ActionIcon className="w-4 h-4 text-orange-600" />
        <span className="truncate">{actionLabels[data.actionType] || 'Action'}</span>
      </BaseNode>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
    </div>
  );
});
ActionNode.displayName = 'ActionNode';

/**
 * End Node - Flow completion
 */
export const EndNode = memo(({ data, selected }) => {
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />
      <BaseNode type="end" label={data.label || 'End'} selected={selected}>
        <CheckCircle className="w-4 h-4 text-gray-600" />
      </BaseNode>
    </div>
  );
});
EndNode.displayName = 'EndNode';

// Export all node types for React Flow
export const nodeTypes = {
  start: StartNode,
  email: EmailNode,
  wait: WaitNode,
  condition: ConditionNode,
  categorize: CategorizeNode,
  action: ActionNode,
  end: EndNode,
};

export default nodeTypes;
