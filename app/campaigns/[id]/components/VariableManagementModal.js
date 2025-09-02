'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, Code } from 'lucide-react';

export default function VariableManagementModal({
  isOpen,
  onClose,
}) {
  const [variables, setVariables] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [deleteVariableDialog, setDeleteVariableDialog] = useState({ open: false, variableId: null, variableName: '' });
  // const toast = toast;
  const [newVariable, setNewVariable] = useState({
    name: '',
    description: '',
    defaultValue: '',
    type: 'text'
  });

  const defaultVariables = [
    { id: 'firstName', name: 'firstName', description: 'Contact first name', defaultValue: '', type: 'text', isDefault: true },
    { id: 'lastName', name: 'lastName', description: 'Contact last name', defaultValue: '', type: 'text', isDefault: true },
    { id: 'email', name: 'email', description: 'Contact email address', defaultValue: '', type: 'email', isDefault: true },
    { id: 'company', name: 'company', description: 'Contact company name', defaultValue: '', type: 'text', isDefault: true },
    { id: 'phone', name: 'phone', description: 'Contact phone number', defaultValue: '', type: 'text', isDefault: true },
    { id: 'website', name: 'website', description: 'Company website', defaultValue: '', type: 'url', isDefault: true },
    { id: 'industry', name: 'industry', description: 'Company industry', defaultValue: '', type: 'text', isDefault: true },
    { id: 'position', name: 'position', description: 'Contact job title', defaultValue: '', type: 'text', isDefault: true },
  ];

  useEffect(() => {
    const loadVariables = () => {
      try {
        const savedVariables = localStorage.getItem('email_variables');
        if (savedVariables) {
          const parsed = JSON.parse(savedVariables);
          setVariables([...defaultVariables, ...parsed]);
        } else {
          setVariables(defaultVariables);
        }
      } catch (error) {
        console.error('Error loading variables:', error);
        setVariables(defaultVariables);
      }
    };

    if (isOpen) {
      loadVariables();
    }
  }, [isOpen]);

  const saveVariables = (updatedVariables) => {
    const customVariables = updatedVariables.filter(v => !v.isDefault);
    setVariables(updatedVariables);
    localStorage.setItem('email_variables', JSON.stringify(customVariables));
  };

  const handleCreateVariable = () => {
    if (!newVariable.name || !newVariable.description) {
      alert('Please fill in name and description');
      return;
    }

    if (variables.some(v => v.name === newVariable.name)) {
      alert('Variable name already exists');
      return;
    }

    const newVar = {
      id: Date.now().toString(),
      ...newVariable,
      isDefault: false
    };

    const updatedVariables = [...variables, newVar];
    saveVariables(updatedVariables);
    setNewVariable({ name: '', description: '', defaultValue: '', type: 'text' });
    setIsCreating(false);
  };

  const handleEditVariable = () => {
    if (!newVariable.name || !newVariable.description) {
      alert('Please fill in name and description');
      return;
    }

    const updatedVariables = variables.map(v => 
      v.id === editingVariable.id 
        ? { ...v, ...newVariable }
        : v
    );

    saveVariables(updatedVariables);
    setEditingVariable(null);
    setIsEditing(false);
    setNewVariable({ name: '', description: '', defaultValue: '', type: 'text' });
  };

  const handleDeleteVariable = (variableId) => {
    if (!variables.find(v => v.id === variableId)) {
      toast.error("Variable not found");
      return;
    }

    const updatedVariables = variables.filter(v => v.id !== variableId);
    saveVariables(updatedVariables);
    toast.success("Variable deleted successfully");
  };

  const startEditing = (variable) => {
    if (variable.isDefault) {
      alert('Cannot edit default variables');
      return;
    }
    
    setEditingVariable(variable);
    setNewVariable({
      name: variable.name,
      description: variable.description,
      defaultValue: variable.defaultValue,
      type: variable.type
    });
    setIsEditing(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="flex h-[80vh]">
          {/* Left Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <Code className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Variables</h2>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Default Variables</h3>
              {variables.filter(v => v.isDefault).map((variable) => (
                <div
                  key={variable.id}
                  className="flex items-center justify-between p-2 text-sm rounded bg-gray-100 text-gray-700"
                >
                  <div className="flex-1">
                    <div className="font-medium">{`{{${variable.name}}}`}</div>
                    <div className="text-xs text-gray-500">{variable.description}</div>
                  </div>
                </div>
              ))}

              <h3 className="text-sm font-medium text-gray-600 mb-2 mt-4">Custom Variables</h3>
              {variables.filter(v => !v.isDefault).map((variable) => (
                <div
                  key={variable.id}
                  className="flex items-center justify-between p-2 text-sm rounded hover:bg-gray-100 text-gray-700"
                >
                  <div className="flex-1">
                    <div className="font-medium">{`{{${variable.name}}}`}</div>
                    <div className="text-xs text-gray-500">{variable.description}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(variable)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteVariableDialog({ 
                        open: true, 
                        variableId: variable.id, 
                        variableName: variable.name 
                      })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              
              {variables.filter(v => !v.isDefault).length === 0 && (
                <p className="text-xs text-gray-400 p-2">No custom variables yet</p>
              )}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col">
            {isCreating || isEditing ? (
              <>
                {/* Create/Edit Form */}
                <div className="border-b p-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {isCreating ? 'Create New Variable' : 'Edit Variable'}
                  </h3>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Variable Name</label>
                    <Input
                      value={newVariable.name}
                      onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                      placeholder="e.g., companySize, targetRole"
                    />
                    <p className="text-xs text-gray-500">Use in templates as: {`{{${newVariable.name || 'variableName'}}}`}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Description</label>
                    <Input
                      value={newVariable.description}
                      onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of what this variable represents"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Default Value (Optional)</label>
                    <Input
                      value={newVariable.defaultValue}
                      onChange={(e) => setNewVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
                      placeholder="Default value if not provided"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Type</label>
                    <select
                      value={newVariable.type}
                      onChange={(e) => setNewVariable(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="url">URL</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                </div>

                <div className="border-t p-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setEditingVariable(null);
                      setNewVariable({ name: '', description: '', defaultValue: '', type: 'text' });
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={isCreating ? handleCreateVariable : handleEditVariable}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isCreating ? 'Create Variable' : 'Save Changes'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center max-w-md">
                  <Code className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Variable Management</h3>
                  <p className="text-sm mb-4">
                    Create custom variables to personalize your email templates. 
                    Variables can be used in both subject lines and email content.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
                    <h4 className="font-medium mb-2">Usage Examples:</h4>
                    <div className="space-y-1 text-xs">
                      <div><code>{`{{firstName}}`}</code> → John</div>
                      <div><code>{`{{company}}`}</code> → Acme Corp</div>
                      <div><code>{`{{customVariable}}`}</code> → Your custom value</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Variable
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Delete Variable Confirmation Dialog */}
      <Dialog open={deleteVariableDialog.open} onOpenChange={(open) => setDeleteVariableDialog({ open, variableId: null, variableName: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Variable</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the variable "{deleteVariableDialog.variableName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVariableDialog({ open: false, variableId: null, variableName: '' })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteVariableDialog.variableId) {
                  handleDeleteVariable(deleteVariableDialog.variableId);
                }
                setDeleteVariableDialog({ open: false, variableId: null, variableName: '' });
              }}
            >
              Delete Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
