'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TemplateModal({
  templatesModalOpen,
  setTemplatesModalOpen,
  editingIndex,
  steps,
  setSteps,
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const templatesData = {
    "Custom Templates": [],
    "Lead Generation": [
      {
        id: 1,
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
    ],
    "LeadGen Agency": [],
    "Video Production": [],
    "Marketing & Advertising": [],
    "Coaching": [],
    "Appointment Setting Agency": [],
    "Influencer Marketing": [],
    "Growth Agency": [],
    "Follow-Ups": []
  };

  return (
    <Dialog open={templatesModalOpen} onOpenChange={setTemplatesModalOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <div className="flex h-[80vh]">
          {/* Left Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <span className="text-white text-xs">📄</span>
              </div>
              <h2 className="text-xl font-semibold">Templates</h2>
            </div>
            
            <div className="space-y-2">
              {Object.keys(templatesData).map((category) => (
                <Collapsible key={category} defaultOpen={category === "Lead Generation"}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left text-gray-600 hover:bg-gray-100 rounded">
                    <span className="text-sm font-medium">{category}</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 space-y-1">
                    {templatesData[category].map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`w-full text-left p-2 text-sm rounded hover:bg-gray-100 ${
                          selectedTemplate?.id === template.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {template.subject}
                      </button>
                    ))}
                    {templatesData[category].length === 0 && (
                      <p className="text-xs text-gray-400 p-2">No templates yet</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col">
            {selectedTemplate ? (
              <>
                {/* Header */}
                <div className="border-b p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Subject: {selectedTemplate.subject}
                  </h3>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="bg-white border rounded-lg p-6">
                    <pre className="whitespace-pre-wrap text-gray-900 font-normal leading-relaxed">
                      {selectedTemplate.content}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTemplate.content);
                      // You could add a toast notification here
                    }}
                  >
                    📋 Copy
                  </Button>
                  <Button
                    onClick={() => {
                      // Update the current step with the selected template
                      if (editingIndex !== null) {
                        const copy = [...steps];
                        copy[editingIndex] = {
                          ...copy[editingIndex],
                          subject: selectedTemplate.subject,
                          template: selectedTemplate.content
                        };
                        setSteps(copy);
                        setTemplatesModalOpen(false);
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
                  <p className="text-sm">Choose a template from the left panel to preview it</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
