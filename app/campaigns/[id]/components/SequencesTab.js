'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from './RichTextEditor';
import SmartInput from './SmartInput';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PreviewEmailModal from './PreviewEmailModal';
import TemplateManagementModal from './TemplateManagementModal';
import VariableManagementModal from './VariableManagementModal';
import SmartTextarea from './SmartTextarea';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export default function SequencesTab({
  steps,
  editingIndex,
  setEditingIndex,
  saveSequence,
  sequenceSaving,
  setSteps,
  setTemplatesModalOpen,
  campaign,
  campaignId,
}) {
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  const [templateManagementOpen, setTemplateManagementOpen] = useState(false);
  const [variableManagementOpen, setVariableManagementOpen] = useState(false);
  const [deleteStepDialog, setDeleteStepDialog] = useState({ open: false, stepIndex: null });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Manual save function
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: steps })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save sequence');
      }
      
      setHasUnsavedChanges(false);
      toast.success('Sequence saved successfully');
    } catch (error) {
      console.error('Error saving sequence:', error);
      toast.error('Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };
  
  // Use ref to store timeout IDs for debouncing
  const saveTimeoutRef = useRef(null);
  
  // Debounced save function
  const debouncedSave = useCallback(async (updatedSteps) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout for saving
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Saving steps with wait times:', updatedSteps.map(s => ({ 
          step: s.stepNumber, 
          waitHours: s.waitHours, 
          waitMinutes: s.waitMinutes 
        })));
        
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: updatedSteps })
        });
        
        const data = await response.json();
        console.log('Save response:', data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to save sequence');
        }
        
        toast.success('Wait time saved');
      } catch (error) {
        console.error('Error saving sequence:', error);
        toast.error('Failed to save wait time: ' + error.message);
      }
    }, 1000); // Wait 1 second after user stops typing
  }, [campaignId]);

  // Update wait hours handler
  const handleWaitHoursChange = useCallback((stepIndex, value) => {
    const parsedValue = parseInt(value) || 0;
    const updatedSteps = [...steps];
    updatedSteps[stepIndex] = { 
      ...updatedSteps[stepIndex], 
      waitHours: parsedValue 
    };
    setSteps(updatedSteps);
    debouncedSave(updatedSteps);
  }, [steps, setSteps, debouncedSave]);

  // Update wait minutes handler  
  const handleWaitMinutesChange = useCallback((stepIndex, value) => {
    const parsedValue = parseInt(value) || 0;
    const updatedSteps = [...steps];
    updatedSteps[stepIndex] = { 
      ...updatedSteps[stepIndex], 
      waitMinutes: parsedValue 
    };
    setSteps(updatedSteps);
    debouncedSave(updatedSteps);
  }, [steps, setSteps, debouncedSave]);
  
  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Steps List */}
      <div className="w-80 space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              editingIndex === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setEditingIndex(index)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Step {step.stepNumber}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <span className="text-gray-400">⋯</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIndex(index);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async (e) => {
                      e.stopPropagation();
                      const copy = [...steps];
                      const newStep = { 
                        ...copy[index], 
                        stepNumber: steps.length + 1 
                      };
                      copy.splice(index + 1, 0, newStep);
                      const renum = copy.map((s, i) => ({ ...s, stepNumber: i + 1 }));
                      setSteps(renum);
                      
                      // Save immediately to database
                      try {
                        const response = await fetch(`/api/campaigns/${campaignId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sequence: renum })
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to save sequence');
                        }
                        
                        toast.success('Step duplicated successfully');
                      } catch (error) {
                        console.error('Error saving sequence:', error);
                        toast.error('Failed to save duplicated step');
                      }
                    }}
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteStepDialog({ open: true, stepIndex: index });
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <p className="text-sm text-gray-600 mb-2 truncate">
              {step.subject || 'No subject'}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {index === 0 ? (
                <span>Initial email</span>
              ) : (
                <span>Wait: {step.waitHours || 0}h {step.waitMinutes || 0}m</span>
              )}
              <span>•</span>
              <span>1 variant</span>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button 
                className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Add variant for step', index);
                }}
              >
                <span className="text-lg leading-none">+</span>
                Add variant
              </button>
            </div>
          </div>
        ))}
        
        {/* Add Step Button */}
        <button
          onClick={async () => {
            const newStep = {
              stepNumber: steps.length + 1,
              subject: steps.length > 0 ? `Re: ${steps[0].subject || 'Follow-up'}` : '',
              template: '',
              waitHours: steps.length === 0 ? 0 : 24, // First step has no wait time
              waitMinutes: 0,
              conditions: { ifOpened: 'continue', ifReplied: 'stop', ifBounced: 'stop' }
            };
            const copy = [...steps, newStep];
            setSteps(copy);
            setEditingIndex(steps.length);
            
            // Save immediately to database
            try {
              const response = await fetch(`/api/campaigns/${campaignId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sequence: copy })
              });
              
              if (!response.ok) {
                throw new Error('Failed to save sequence');
              }
              
              toast.success('Step added successfully');
            } catch (error) {
              console.error('Error saving sequence:', error);
              toast.error('Failed to save sequence step');
            }
          }}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl leading-none">+</span>
          Add step
        </button>
      </div>

      {/* Right Panel - Step Editor */}
      <div className="flex-1">
        {editingIndex !== null && steps[editingIndex] ? (
          <div className="border rounded-lg">
            {/* Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Subject Line</label>
                    <SmartInput
                      value={steps[editingIndex].subject}
                      onChange={(e) => {
                        const copy = [...steps];
                        copy[editingIndex] = { ...copy[editingIndex], subject: e.target.value };
                        setSteps(copy);
                        setHasUnsavedChanges(true);
                      }}
                      onBlur={async () => {
                        // Removed auto-save - user must click Save button
                      }}
                      placeholder={editingIndex > 0 ? `Re: ${steps[0]?.subject || 'Follow-up'}` : "Enter your initial email subject line..."}
                      className="text-base"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? 'Saving...' : hasUnsavedChanges ? '💾 Save Changes' : '✓ Saved'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTestEmailModalOpen(true)}>
                    👁 Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    ⚡
                  </Button>
                </div>
              </div>
            </div>

            {/* Email Content Editor */}
            <div className="p-4">
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Email Content</label>
                <p className="text-xs text-gray-500">Type {'{{variable}}'} to insert variables, select text and use toolbar for formatting</p>
              </div>
              <RichTextEditor
                className="w-full"
                value={steps[editingIndex].template}
                onChange={(value) => {
                  const copy = [...steps];
                  copy[editingIndex] = { ...copy[editingIndex], template: value };
                  setSteps(copy);
                  setHasUnsavedChanges(true);
                }}
                placeholder={`Write your email content here...

Hi {{firstName}},

I hope this email finds you well...

Best regards,
[Your name]`}
              />
            </div>

            {/* Wait Time - Only show for follow-up steps */}
            {editingIndex > 0 && (
              <div className="p-4 border-b">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-gray-500 w-20">Wait</span>
                  <Input
                    type="number"
                    min="0"
                    max="168"
                    value={steps[editingIndex].waitHours || 0}
                    onChange={(e) => handleWaitHoursChange(editingIndex, e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20"></span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={steps[editingIndex].waitMinutes || 0}
                    onChange={(e) => handleWaitMinutesChange(editingIndex, e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">minutes before sending</span>
                </div>
              </div>
            )}

            {/* Bottom Toolbar */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm">
                    🤖 AI Tools
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTemplateManagementOpen(true)}>
                    📄 Templates
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setVariableManagementOpen(true)}>
                    🔧 Variables
                  </Button>
                  <Button variant="outline" size="sm">
                    Aa
                  </Button>
                  <Button variant="outline" size="sm">
                    🔗
                  </Button>
                  <Button variant="outline" size="sm">
                    📎
                  </Button>
                  <Button variant="outline" size="sm">
                    {'</>'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            <p className="mb-2">Select a step to edit</p>
            <p className="text-sm">Choose a step from the left panel to start editing your email sequence</p>
          </div>
        )}
      </div>

      <PreviewEmailModal
        isOpen={testEmailModalOpen}
        onClose={() => setTestEmailModalOpen(false)}
        steps={steps}
        editingIndex={editingIndex}
        campaignId={campaignId}
        leads={campaign?.prospects?.map(p => p.prospectId || p._id).filter(Boolean) || []}
        mailboxes={campaign?.mailboxes || []}
      />
      
      <TemplateManagementModal
        isOpen={templateManagementOpen}
        onClose={() => setTemplateManagementOpen(false)}
        editingIndex={editingIndex}
        steps={steps}
        setSteps={setSteps}
      />
      
      <VariableManagementModal
        isOpen={variableManagementOpen}
        onClose={() => setVariableManagementOpen(false)}
      />
      
      {/* Delete Step Confirmation Dialog */}
      <Dialog open={deleteStepDialog.open} onOpenChange={(open) => setDeleteStepDialog({ open, stepIndex: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Step {deleteStepDialog.stepIndex !== null ? deleteStepDialog.stepIndex + 1 : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStepDialog({ open: false, stepIndex: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                const index = deleteStepDialog.stepIndex;
                if (index !== null) {
                  const copy = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }));
                  setSteps(copy);
                  if (editingIndex === index) setEditingIndex(null);
                  
                  // Save immediately to database
                  try {
                    const response = await fetch(`/api/campaigns/${campaignId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sequence: copy })
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to save sequence');
                    }
                    
                    toast.success("Step deleted successfully");
                  } catch (error) {
                    console.error('Error saving sequence:', error);
                    toast.error('Failed to delete step');
                  }
                }
                setDeleteStepDialog({ open: false, stepIndex: null });
              }}
            >
              Delete Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}