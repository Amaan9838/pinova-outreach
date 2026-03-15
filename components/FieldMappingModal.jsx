'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from "sonner";
import { 
  Plus, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles,
  Database,
  FileText,
  Mail,
  User,
  Building,
  Phone,
  Globe,
  MapPin,
  Tag,
  Calendar,
  Hash,
  Link
} from 'lucide-react';

const PREDEFINED_FIELDS = [
  { value: 'firstName', label: 'First Name', icon: User, type: 'text', required: true },
  { value: 'lastName', label: 'Last Name', icon: User, type: 'text' },
  { value: 'email', label: 'Primary Email', icon: Mail, type: 'email', required: true },
  { value: 'additionalEmail1', label: 'Additional Email 1', icon: Mail, type: 'email' },
  { value: 'additionalEmail2', label: 'Additional Email 2', icon: Mail, type: 'email' },
  { value: 'company', label: 'Company', icon: Building, type: 'text' },
  { value: 'position', label: 'Position/Title', icon: Building, type: 'text' },
  { value: 'phone', label: 'Phone', icon: Phone, type: 'text' },
  { value: 'website', label: 'Website', icon: Globe, type: 'url' },
  { value: 'industry', label: 'Industry', icon: Building, type: 'text' },
  { value: 'linkedin', label: 'LinkedIn URL', icon: Link, type: 'url' },
  { value: 'instagram', label: 'Instagram', icon: Link, type: 'text' },
  { value: 'facebook', label: 'Facebook', icon: Link, type: 'url' },
  { value: 'zillow', label: 'Zillow URL', icon: Link, type: 'url' },
  { value: 'notes', label: 'Notes', icon: FileText, type: 'text' },
  { value: 'personalizationNote', label: 'Personalization Note', icon: FileText, type: 'text' },
  { value: 'tags', label: 'Tags (comma-separated)', icon: Tag, type: 'text' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: FileText },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
];

export default function FieldMappingModal({ 
  isOpen, 
  onClose, 
  csvHeaders = [], 
  csvRows = [], 
  onImport,
  isImporting = false 
}) {
  const [fieldMapping, setFieldMapping] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [showPreview, setShowPreview] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [duplicateFields, setDuplicateFields] = useState(new Set());

  useEffect(() => {
    if (csvHeaders.length > 0) {
      autoMapFields();
    }
  }, [csvHeaders]);

  useEffect(() => {
    validateMapping();
  }, [fieldMapping, customFields]);

  const autoMapFields = () => {
    const autoMapping = {};
    const usedFields = new Set();

    csvHeaders.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Find exact or partial matches with predefined fields
      const matchedField = PREDEFINED_FIELDS.find(field => {
        const fieldName = field.value.toLowerCase();
        const fieldLabel = field.label.toLowerCase();
        
        return (
          lowerHeader === fieldName ||
          lowerHeader === fieldLabel ||
          lowerHeader.includes(fieldName) ||
          fieldName.includes(lowerHeader) ||
          (field.value === 'firstName' && (lowerHeader.includes('first') && lowerHeader.includes('name'))) ||
          (field.value === 'lastName' && (lowerHeader.includes('last') && lowerHeader.includes('name'))) ||
          (field.value === 'email' && lowerHeader.includes('email') && !lowerHeader.includes('additional')) ||
          (field.value === 'additionalEmail1' && (lowerHeader.includes('email2') || lowerHeader.includes('secondary'))) ||
          (field.value === 'company' && (lowerHeader.includes('company') || lowerHeader.includes('organization'))) ||
          (field.value === 'position' && (lowerHeader.includes('position') || lowerHeader.includes('title') || lowerHeader.includes('job'))) ||
          (field.value === 'phone' && (lowerHeader.includes('phone') || lowerHeader.includes('mobile'))) ||
          (field.value === 'website' && (lowerHeader.includes('website') || lowerHeader.includes('site'))) ||
          (field.value === 'linkedin' && lowerHeader.includes('linkedin')) ||
          (field.value === 'instagram' && lowerHeader.includes('instagram')) ||
          (field.value === 'facebook' && lowerHeader.includes('facebook')) ||
          (field.value === 'zillow' && lowerHeader.includes('zillow'))
        );
      });

      if (matchedField && !usedFields.has(matchedField.value)) {
        autoMapping[index] = matchedField.value;
        usedFields.add(matchedField.value);
      } else if (!matchedField) {
        // Create custom field for unmatched headers
        const customFieldName = header.trim();
        if (customFieldName && !customFields.some(cf => cf.name === customFieldName)) {
          setCustomFields(prev => [...prev, {
            name: customFieldName,
            type: 'text',
            originalHeader: header
          }]);
          autoMapping[index] = `custom_${customFieldName}`;
        }
      }
    });

    setFieldMapping(autoMapping);
  };

  const validateMapping = () => {
    const errors = {};
    const duplicates = new Set();
    const mappedValues = Object.values(fieldMapping);
    
    // Check for required fields
    const hasEmail = mappedValues.includes('email');
    const hasFirstName = mappedValues.includes('firstName');
    
    // Check if at least one link is mapped
    const hasLinkMapped = mappedValues.includes('website') || 
                          mappedValues.includes('linkedin') || 
                          mappedValues.includes('instagram') || 
                          mappedValues.includes('facebook') || 
                          mappedValues.includes('zillow');

    if (!hasEmail) {
      errors.email = 'Email field is required for import';
    }
    if (!hasFirstName) {
      errors.firstName = 'First Name field is required for import';
    }
    if (!hasLinkMapped) {
      errors.link = 'At least one link field (Website, LinkedIn, Instagram, Facebook, Zillow) must be mapped';
    }

    // Check for duplicates
    const valueCount = {};
    mappedValues.forEach(value => {
      if (value && value !== 'skip') {
        valueCount[value] = (valueCount[value] || 0) + 1;
        if (valueCount[value] > 1) {
          duplicates.add(value);
        }
      }
    });

    setValidationErrors(errors);
    setDuplicateFields(duplicates);
  };

  const handleFieldMappingChange = (csvIndex, mappedField) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvIndex]: mappedField
    }));
  };

  const addCustomField = () => {
    const newFieldName = `Custom Field ${customFields.length + 1}`;
    setCustomFields(prev => [...prev, {
      name: newFieldName,
      type: 'text',
      originalHeader: ''
    }]);
  };

  const updateCustomField = (index, updates) => {
    setCustomFields(prev => prev.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    ));
  };

  const removeCustomField = (index) => {
    const fieldToRemove = customFields[index];
    setCustomFields(prev => prev.filter((_, i) => i !== index));
    
    // Remove from mapping if it was mapped
    const mappingEntries = Object.entries(fieldMapping);
    const updatedMapping = {};
    mappingEntries.forEach(([csvIndex, mappedField]) => {
      if (mappedField !== `custom_${fieldToRemove.name}`) {
        updatedMapping[csvIndex] = mappedField;
      }
    });
    setFieldMapping(updatedMapping);
  };

  const getMappedData = () => {
    return csvRows.map((row, rowIndex) => {
      const mappedRow = {};
      const customFieldsData = [];

      Object.entries(fieldMapping).forEach(([csvIndex, mappedField]) => {
        const cellValue = row[csvIndex]?.trim();
        
        if (!cellValue || mappedField === 'skip') return;

        if (mappedField.startsWith('custom_')) {
          const customFieldName = mappedField.replace('custom_', '');
          const customField = customFields.find(cf => cf.name === customFieldName);
          
          // Special handling for customSubject and customTemplate - they go directly to mappedRow
          if (customFieldName === 'customSubject' || customFieldName === 'customTemplate') {
            // Convert literal \n to actual newlines for customTemplate
            mappedRow[customFieldName] = customFieldName === 'customTemplate' 
              ? cellValue.replace(/\\n/g, '\n') 
              : cellValue;
          } else if (customField) {
            // Regular custom fields go to customFields array
            customFieldsData.push({
              name: customFieldName,
              value: cellValue,
              type: customField.type
            });
          }
        } else if (mappedField === 'additionalEmail1' || mappedField === 'additionalEmail2') {
          if (!mappedRow.additionalEmails) mappedRow.additionalEmails = [];
          mappedRow.additionalEmails.push({
            email: cellValue,
            type: 'work',
            isPrimary: false
          });
        } else if (mappedField === 'tags') {
          mappedRow.tags = cellValue.split(',').map(tag => tag.trim()).filter(tag => tag);
        } else {
          mappedRow[mappedField] = cellValue;
        }
      });

      if (customFieldsData.length > 0) {
        mappedRow.customFields = customFieldsData;
      }

      mappedRow.source = 'csv_import';
      mappedRow.importMetadata = {
        importId: `import_${Date.now()}`,
        importDate: new Date(),
        originalData: row
      };

      return mappedRow;
    }).filter(row => row.email); // Only include rows with email
  };

  const handleImport = () => {
    if (Object.keys(validationErrors).length > 0 || duplicateFields.size > 0) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    const mappedData = getMappedData();
    if (mappedData.length === 0) {
      toast.error('No valid data to import. Please check your field mapping.');
      return;
    }

    // New validation for link requirement
    const rowsWithoutLink = mappedData.filter(row => !row.website && !row.linkedin && !row.instagram && !row.facebook && !row.zillow);
    if (rowsWithoutLink.length > 0) {
      toast.error(`${rowsWithoutLink.length} prospect(s) are missing a required social/web link. Please ensure every prospect has at least one link (Website, LinkedIn, Instagram, Facebook, or Zillow).`);
      return;
    }

    onImport(mappedData);
  };

  const getFieldIcon = (fieldValue) => {
    if (fieldValue?.startsWith('custom_')) {
      return Sparkles;
    }
    const field = PREDEFINED_FIELDS.find(f => f.value === fieldValue);
    return field?.icon || Database;
  };

  const isValidMapping = Object.keys(validationErrors).length === 0 && duplicateFields.size === 0;
  const mappedRowsCount = getMappedData().length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col bg-white border-0 shadow-2xl p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-xl">
              <Database className="h-6 w-6 text-white" />
            </div>
            Smart Field Mapping
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            Map your CSV columns to prospect fields. We've automatically detected and mapped common fields.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 px-6 py-6">
          {/* Left Panel - Field Mapping */}
          <div className="flex-1 space-y-6 overflow-y-auto min-h-0">
            {/* Validation Status */}
            <Card className={`border ${isValidMapping ? 'border-gray-300 bg-gray-50' : 'border-gray-400 bg-gray-100'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {isValidMapping ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-gray-700" />
                      <div>
                        <p className="font-medium text-gray-900">Ready to Import</p>
                        <p className="text-sm text-gray-600">{mappedRowsCount} prospects will be imported</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-gray-700" />
                      <div>
                        <p className="font-medium text-gray-900">Validation Issues</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          {Object.values(validationErrors).map((error, i) => (
                            <p key={i}>• {error}</p>
                          ))}
                          {duplicateFields.size > 0 && (
                            <p>• Duplicate field mappings detected</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Field Mapping Grid */}
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-3 text-gray-900">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    <FileText className="h-4 w-4 text-gray-700" />
                  </div>
                  Field Mapping ({csvHeaders.length} columns)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <div className="space-y-4">
                    {csvHeaders.map((header, index) => {
                      const mappedField = fieldMapping[index];
                      const isDuplicate = duplicateFields.has(mappedField);
                      const Icon = getFieldIcon(mappedField);
                      
                      return (
                        <div key={index} className={`p-4 border rounded-xl ${isDuplicate ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white'} hover:border-gray-300 transition-colors`}>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-900">{header}</span>
                                {csvRows[0] && csvRows[0][index] && (
                                  <Badge variant="outline" className="text-xs">
                                    e.g., {csvRows[0][index]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <Select 
                                value={mappedField || ''} 
                                onValueChange={(value) => handleFieldMappingChange(index, value)}
                              >
                                <SelectTrigger className={`w-full border-gray-200 ${isDuplicate ? 'border-gray-400' : ''} focus:border-gray-900 focus:ring-1 focus:ring-gray-900`}>
                                  <SelectValue placeholder="Select field or create custom">
                                    {mappedField && (
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        {mappedField.startsWith('custom_') 
                                          ? `Custom: ${mappedField.replace('custom_', '')}`
                                          : PREDEFINED_FIELDS.find(f => f.value === mappedField)?.label || mappedField
                                        }
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip" className="text-gray-500">
                                    <div className="flex items-center gap-2">
                                      <X className="h-4 w-4" />
                                      Skip this field
                                    </div>
                                  </SelectItem>
                                  
                                  <Separator className="my-2" />
                                  
                                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Standard Fields
                                  </div>
                                  {PREDEFINED_FIELDS.map(field => {
                                    const FieldIcon = field.icon;
                                    return (
                                      <SelectItem key={field.value} value={field.value}>
                                        <div className="flex items-center gap-2">
                                          <FieldIcon className="h-4 w-4" />
                                          {field.label}
                                          {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                  
                                  {customFields.length > 0 && (
                                    <>
                                      <Separator className="my-2" />
                                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Custom Fields
                                      </div>
                                      {customFields.map(field => (
                                        <SelectItem key={`custom_${field.name}`} value={`custom_${field.name}`}>
                                          <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-purple-500" />
                                            {field.name}
                                            <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              {isDuplicate && (
                                <p className="text-xs text-gray-600 mt-1">This field is mapped multiple times</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Fields Management */}
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-3 text-gray-900">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <Sparkles className="h-4 w-4 text-gray-700" />
                    </div>
                    Custom Fields ({customFields.length})
                  </CardTitle>
                  <Button onClick={addCustomField} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customFields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                      <Sparkles className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-700">No custom fields created yet</p>
                    <p className="text-sm text-gray-500">Add custom fields to capture additional prospect data</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
                        <Input
                          value={field.name}
                          onChange={(e) => updateCustomField(index, { name: e.target.value })}
                          placeholder="Field name"
                          className="flex-1"
                        />
                        <Select 
                          value={field.type} 
                          onValueChange={(value) => updateCustomField(index, { type: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(type => {
                              const TypeIcon = type.icon;
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <TypeIcon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => removeCustomField(index)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:w-96 space-y-6 overflow-y-auto min-h-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Data Preview
                  </CardTitle>
                  <Button
                    onClick={() => setShowPreview(!showPreview)}
                    variant="ghost"
                    size="sm"
                  >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showPreview && (
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {getMappedData().slice(0, 3).map((row, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-gray-50">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Row {index + 1}
                          </div>
                          <div className="space-y-2 text-xs">
                            {Object.entries(row).map(([key, value]) => {
                              if (key === 'source' || key === 'importMetadata') return null;
                              return (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600">{key}:</span>
                                  <span className="text-gray-900 font-medium">
                                    {Array.isArray(value) ? `[${value.length} items]` : String(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">Pro Tips:</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Email and First Name are required fields</li>
                      <li>• Use custom fields for unique data like social handles</li>
                      <li>• Multiple emails will be stored as additional contacts</li>
                      <li>• Tags should be comma-separated</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Footer with Action Buttons */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              {mappedRowsCount} prospects ready to import
            </div>
            <div className="flex gap-3 order-1 sm:order-2">
              <Button variant="outline" onClick={onClose} disabled={isImporting} className="px-6">
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!isValidMapping || isImporting}
                className="bg-black hover:bg-gray-700 px-6"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="hidden sm:inline">Importing...</span>
                    <span className="sm:hidden">Import</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Import {mappedRowsCount} Prospects</span>
                    <span className="sm:hidden">Import ({mappedRowsCount})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
