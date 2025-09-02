'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, Edit, Trash2, Save, X } from 'lucide-react';

export default function TemplateManagementModal({
  isOpen,
  onClose,
  editingIndex,
  steps,
  setSteps,
}) {
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'Custom Templates'
  });
  const [deleteTemplateDialog, setDeleteTemplateDialog] = useState({ 
    open: false, 
    templateId: null, 
    templateName: '' 
  });

  const defaultCategories = [
    'Custom Templates',
    'Lead Generation',
    'LeadGen Agency',
    'Video Production',
    'Marketing & Advertising',
    'Coaching',
    'Appointment Setting Agency',
    'Influencer Marketing',
    'Growth Agency',
    'Follow-Ups'
  ];

  // Load templates from localStorage or API
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const savedTemplates = localStorage.getItem('email_templates');
        if (savedTemplates) {
          setTemplates(JSON.parse(savedTemplates));
        } else {
          // Initialize with default template
          const defaultTemplates = {
            "Lead Generation": [
              {
                id: 1,
                name: "Quick Question Template",
                subject: "{{firstName}} - quick question",
                content: `Hey {{firstName}}!

Your LinkedIn was impressive and I wanted to reach out directly:)

So we're helping (target group) from (location) to fill their cal with 5-12 calls with (their ideal customer) daily. If you let me have a call with you about how we can do the same for you,

I will send you a burger with UberEats:D

Are you free any time this week for a quick chat?

Cheers,
NAME

Reply "No thanks" if you wish to no longer receive messages from me.`
              }
            ]
          };
          setTemplates(defaultTemplates);
          localStorage.setItem('email_templates', JSON.stringify(defaultTemplates));
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates({});
      }
    };

    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const saveTemplates = (updatedTemplates) => {
    setTemplates(updatedTemplates);
    localStorage.setItem('email_templates', JSON.stringify(updatedTemplates));
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.content) {
      alert('Please fill in all fields');
      return;
    }

    const updatedTemplates = { ...templates };
    if (!updatedTemplates[newTemplate.category]) {
      updatedTemplates[newTemplate.category] = [];
    }

    const newId = Date.now();
    updatedTemplates[newTemplate.category].push({
      id: newId,
      name: newTemplate.name,
      subject: newTemplate.subject,
      content: newTemplate.content
    });

    saveTemplates(updatedTemplates);
    setNewTemplate({ name: '', subject: '', content: '', category: 'Custom Templates' });
    setIsCreating(false);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate || !newTemplate.name || !newTemplate.subject || !newTemplate.content) {
      alert('Please fill in all fields');
      return;
    }

    const updatedTemplates = { ...templates };
    Object.keys(updatedTemplates).forEach(category => {
      const templateIndex = updatedTemplates[category].findIndex(t => t.id === selectedTemplate.id);
      if (templateIndex !== -1) {
        updatedTemplates[category][templateIndex] = {
          ...selectedTemplate,
          name: newTemplate.name,
          subject: newTemplate.subject,
          content: newTemplate.content
        };
      }
    });

    saveTemplates(updatedTemplates);
    setSelectedTemplate(null);
    setIsEditing(false);
    setNewTemplate({ name: '', subject: '', content: '', category: 'Custom Templates' });
  };

  const handleDeleteTemplate = (templateId) => {
    const updatedTemplates = { ...templates };
    Object.keys(updatedTemplates).forEach(category => {
      updatedTemplates[category] = updatedTemplates[category].filter(t => t.id !== templateId);
    });

    saveTemplates(updatedTemplates);
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
    toast.success("Template deleted successfully");
  };

  const startEditing = (template) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category: 'Custom Templates'
    });
    setIsEditing(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0">
        <div className="flex h-[85vh]">
          {/* Left Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <span className="text-white text-xs">📄</span>
                </div>
                <h2 className="text-xl font-semibold">Templates</h2>
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
              {defaultCategories.map((category) => (
                <Collapsible key={category} defaultOpen={category === "Custom Templates"}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left text-gray-600 hover:bg-gray-100 rounded">
                    <span className="text-sm font-medium">{category}</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 space-y-1">
                    {(templates[category] || []).map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-center justify-between p-2 text-sm rounded hover:bg-gray-100 ${
                          selectedTemplate?.id === template.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="flex-1 text-left truncate"
                        >
                          {template.name}
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(template)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTemplateDialog({ 
                              open: true, 
                              templateId: template.id, 
                              templateName: template.name 
                            })}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!templates[category] || templates[category].length === 0) && (
                      <p className="text-xs text-gray-400 p-2">No templates yet</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col">
            {isCreating || isEditing ? (
              <>
                {/* Create/Edit Form */}
                <div className="border-b p-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {isCreating ? 'Create New Template' : 'Edit Template'}
                  </h3>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Template Name</label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter template name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Category</label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultCategories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Subject</label>
                    <Input
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter email subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Content</label>
                    <Textarea
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter email content"
                      className="min-h-96"
                    />
                  </div>
                </div>

                <div className="border-t p-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setNewTemplate({ name: '', subject: '', content: '', category: 'Custom Templates' });
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={isCreating ? handleCreateTemplate : handleEditTemplate}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isCreating ? 'Create Template' : 'Save Changes'}
                  </Button>
                </div>
              </>
            ) : selectedTemplate ? (
              <>
                {/* Template Preview */}
                <div className="border-b p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Subject: {selectedTemplate.subject}
                  </p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="bg-white border rounded-lg p-6">
                    <pre className="whitespace-pre-wrap text-gray-900 font-normal leading-relaxed">
                      {selectedTemplate.content}
                    </pre>
                  </div>
                </div>

                <div className="border-t p-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTemplate.content);
                      alert('Template copied to clipboard!');
                    }}
                  >
                    📋 Copy
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingIndex !== null) {
                        const copy = [...steps];
                        copy[editingIndex] = {
                          ...copy[editingIndex],
                          subject: selectedTemplate.subject,
                          template: selectedTemplate.content
                        };
                        setSteps(copy);
                        onClose();
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    ✓ Use template
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Select a Template</h3>
                  <p className="text-sm mb-4">Choose a template from the left panel to preview it</p>
                  <Button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Template
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Delete Template Confirmation Dialog */}
      <Dialog open={deleteTemplateDialog.open} onOpenChange={(open) => setDeleteTemplateDialog({ open, templateId: null, templateName: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTemplateDialog.templateName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTemplateDialog({ open: false, templateId: null, templateName: '' })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteTemplateDialog.templateId) {
                  handleDeleteTemplate(deleteTemplateDialog.templateId);
                }
                setDeleteTemplateDialog({ open: false, templateId: null, templateName: '' });
              }}
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
