'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

/**
 * Node Configuration Panel - Right sidebar for editing selected node
 */
export default function NodeConfigPanel({ node, onDataChange, onDelete, onClose }) {
  const [localData, setLocalData] = useState(node?.data || {});

  // Sync local state when node changes
  useEffect(() => {
    setLocalData(node?.data || {});
  }, [node?.id, node?.data]);

  const handleChange = (field, value) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onDataChange(node.id, newData);
  };

  if (!node) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 capitalize">
          {node.type} Node
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Email Node Config */}
        {node.type === 'email' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={localData.subject || ''}
                onChange={(e) => handleChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email subject..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Template
              </label>
              <textarea
                value={localData.template || ''}
                onChange={(e) => handleChange('template', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter email content... Use {{firstName}}, {{company}}, etc for personalization"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isFirstEmail"
                checked={localData.isFirstEmail || false}
                onChange={(e) => handleChange('isFirstEmail', e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isFirstEmail" className="ml-2 text-sm text-gray-700">
                This is the first email in sequence
              </label>
            </div>
          </>
        )}

        {/* Wait Node Config */}
        {node.type === 'wait' && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <input
                  type="number"
                  min="1"
                  value={localData.duration || 24}
                  onChange={(e) => handleChange('duration', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={localData.unit || 'hours'}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="businessHoursOnly"
                checked={localData.businessHoursOnly ?? true}
                onChange={(e) => handleChange('businessHoursOnly', e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="businessHoursOnly" className="ml-2 text-sm text-gray-700">
                Business hours only (9am-5pm)
              </label>
            </div>
          </>
        )}

        {/* Condition Node Config */}
        {node.type === 'condition' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Type
              </label>
              <select
                value={localData.conditionType || 'email_opened'}
                onChange={(e) => handleChange('conditionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="email_opened">Email Opened</option>
                <option value="email_not_opened">Email Not Opened</option>
                <option value="email_clicked">Link Clicked</option>
                <option value="email_replied">Replied</option>
                <option value="email_bounced">Bounced</option>
                <option value="no_action_after_wait">Opened but No Reply</option>
                <option value="reply_category">Reply Category</option>
              </select>
            </div>
            {localData.conditionType === 'reply_category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Category
                </label>
                <select
                  value={localData.targetCategory || ''}
                  onChange={(e) => handleChange('targetCategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  <option value="curious">Curious</option>
                  <option value="interested">Interested</option>
                  <option value="objection">Objection</option>
                  <option value="not-now">Not Now</option>
                </select>
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <strong>How it works:</strong>
              <p className="mt-1">
                {localData.conditionType === 'email_opened' && 'Checks if the previous email was opened.'}
                {localData.conditionType === 'email_not_opened' && 'Checks if the previous email was NOT opened.'}
                {localData.conditionType === 'email_clicked' && 'Checks if any link in the email was clicked.'}
                {localData.conditionType === 'email_replied' && 'Checks if the prospect replied to the email.'}
                {localData.conditionType === 'email_bounced' && 'Checks if the email bounced.'}
                {localData.conditionType === 'no_action_after_wait' && 'Checks if email was opened but no reply after wait period.'}
                {localData.conditionType === 'reply_category' && 'Routes based on AI-categorized reply type.'}
              </p>
            </div>
          </>
        )}

        {/* Categorize Node Config */}
        {node.type === 'categorize' && (
          <>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useAI"
                checked={localData.useAI ?? true}
                onChange={(e) => handleChange('useAI', e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="useAI" className="ml-2 text-sm text-gray-700">
                Use AI for categorization
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Threshold
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={(localData.confidenceThreshold || 0.7) * 100}
                onChange={(e) => handleChange('confidenceThreshold', parseInt(e.target.value) / 100)}
                className="w-full"
              />
              <div className="text-sm text-gray-500 text-center">
                {Math.round((localData.confidenceThreshold || 0.7) * 100)}%
              </div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
              <strong>Categories:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>Curious</strong> - Asking questions</li>
                <li>• <strong>Interested</strong> - Ready to proceed</li>
                <li>• <strong>Objection</strong> - Has concerns</li>
                <li>• <strong>Not Now</strong> - Bad timing</li>
              </ul>
            </div>
          </>
        )}

        {/* Action Node Config */}
        {node.type === 'action' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={localData.actionType || 'stop_sequence'}
                onChange={(e) => handleChange('actionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="send_response">Send Response</option>
                <option value="stop_sequence">Stop Sequence</option>
                <option value="add_tag">Add Tag</option>
                <option value="move_to_pipeline">Move to Pipeline</option>
                <option value="notify_user">Notify User</option>
                <option value="schedule_followup">Schedule Follow-up</option>
              </select>
            </div>
            {localData.actionType === 'add_tag' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={localData.tagName || ''}
                  onChange={(e) => handleChange('tagName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., hot-lead, interested"
                />
              </div>
            )}
            {localData.actionType === 'schedule_followup' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localData.followupDelay || 3}
                    onChange={(e) => handleChange('followupDelay', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={localData.followupDelayUnit || 'days'}
                    onChange={(e) => handleChange('followupDelayUnit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        {/* Start/End Node - Minimal config */}
        {(node.type === 'start' || node.type === 'end') && (
          <div className="text-sm text-gray-500">
            <p>{node.type === 'start' ? 'This is the entry point of your flow.' : 'This marks the end of the sequence.'}</p>
          </div>
        )}
      </div>

      {/* Footer - Delete Button */}
      {node.type !== 'start' && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onDelete(node.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 
                       bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Node</span>
          </button>
        </div>
      )}
    </div>
  );
}
