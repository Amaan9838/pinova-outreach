'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Sparkles,
  Users,
  Mail,
  Building,
  Globe,
  Phone,
  User,
  Tag,
  X,
  ArrowRight,
  Shield,
  Zap
} from 'lucide-react';
import FieldMappingModal from './FieldMappingModal';

const CSV_TEMPLATE_HEADERS = [
  'firstName',
  'lastName', 
  'email',
  'additionalEmail1',
  'additionalEmail2',
  'company',
  'position',
  'phone',
  'website',
  'industry',
  'linkedin',
  'instagram',
  'notes',
  'personalizationNote',
  'tags'
];

const SAMPLE_DATA = [
  [
    'John',
    'Doe',
    'john.doe@company.com',
    'johndoe@gmail.com',
    '',
    'Acme Corp',
    'CEO',
    '+1-555-123-4567',
    'https://acme.com',
    'Technology',
    'https://linkedin.com/in/johndoe',
    '@johndoe',
    'Interested in automation tools',
    'Recently posted about AI trends',
    'hot-lead,enterprise'
  ],
  [
    'Jane',
    'Smith',
    'jane@startup.io',
    'jane.smith@personal.com',
    'j.smith@consulting.com',
    'Startup Inc',
    'CTO',
    '+1-555-987-6543',
    'https://startup.io',
    'SaaS',
    'https://linkedin.com/in/janesmith',
    '@janesmith',
    'Looking for growth solutions',
    'Mentioned scaling challenges in recent interview',
    'warm-lead,saas,growth'
  ]
];

export default function EnhancedCSVImport({ 
  isOpen, 
  onClose, 
  onImport,
  title = "Import Prospects from CSV",
  description = "Upload your prospect data with advanced field mapping and validation"
}) {
  const [csvData, setCsvData] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const generateTemplate = () => {
    const csvContent = [
      CSV_TEMPLATE_HEADERS.join(','),
      ...SAMPLE_DATA.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'prospect-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully!');
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File size must be less than 50MB');
      return;
    }

    setUploadProgress(0);
    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        setUploadProgress(progress);
      }
    };

    reader.onload = (e) => {
      const content = e.target.result;
      setCsvData(content);
      setUploadProgress(100);
      toast.success('CSV file loaded successfully');
    };

    reader.onerror = () => {
      toast.error('Error reading file');
      setUploadProgress(0);
    };

    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse CSV with proper handling of quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const rows = lines.slice(1).map(line => parseCSVLine(line).map(cell => cell.replace(/^"|"$/g, '').trim()));

    return { headers, rows };
  };

  const handleAnalyzeCSV = () => {
    if (!csvData.trim()) {
      toast.error('Please upload a CSV file or paste CSV data first');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const { headers, rows } = parseCSV(csvData);
      
      if (headers.length === 0) {
        throw new Error('No headers found in CSV');
      }

      if (rows.length === 0) {
        throw new Error('No data rows found in CSV');
      }

      // Validate data quality
      const validRows = rows.filter(row => 
        row.some(cell => cell && cell.trim() !== '')
      );

      if (validRows.length === 0) {
        throw new Error('No valid data rows found');
      }

      setCsvHeaders(headers);
      setCsvRows(validRows);
      setShowFieldMapping(true);
      
      toast.success(`Analyzed ${validRows.length} rows with ${headers.length} columns`);
    } catch (error) {
      toast.error(`CSV Analysis Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportComplete = async (mappedData) => {
    setIsImporting(true);
    try {
      await onImport(mappedData);
      setShowFieldMapping(false);
      setCsvData('');
      setCsvHeaders([]);
      setCsvRows([]);
      setUploadProgress(0);
      toast.success(`Successfully imported ${mappedData.length} prospects!`);
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const clearData = () => {
    setCsvData('');
    setCsvHeaders([]);
    setCsvRows([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col bg-white border-0 shadow-2xl p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gray-900 rounded-xl">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <span className="hidden sm:inline">{title}</span>
                  <span className="sm:hidden">Import Prospects</span>
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600 max-w-2xl">
                  {description}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Secure & Fast Processing</span>
                <span className="sm:hidden">Secure</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Upload Section */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-700" />
                  </div>
                  Upload Your Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Drag & Drop Area */}
                <div
                  className={`group relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer ${
                    dragActive 
                      ? 'border-gray-400 bg-gray-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                  
                  <div className="space-y-6">
                    <div className="mx-auto w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <Upload className="h-10 w-10 text-white" />
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-xl font-semibold text-gray-900">
                        <span className="hidden sm:inline">Drop your CSV file here, or click to browse</span>
                        <span className="sm:hidden">Upload CSV File</span>
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-gray-600" />
                          <span>Up to 50MB</span>
                        </div>
                        <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-gray-600" />
                          <span>Secure Processing</span>
                        </div>
                      </div>
                    </div>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="max-w-sm mx-auto space-y-3">
                        <Progress value={uploadProgress} className="h-3 bg-gray-200" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Uploading...</span>
                          <span className="font-semibold text-gray-900">{Math.round(uploadProgress)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Input Option */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Paste CSV Data
                  </label>
                  <Textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="firstName,lastName,email,company...\nJohn,Doe,john@company.com,Acme Corp..."
                    rows={6}
                    className="font-mono text-sm border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-xl transition-all duration-200"
                  />
                  {csvData && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-gray-700" />
                        <span className="font-medium">{csvData.split('\n').length} lines detected</span>
                      </div>
                      <Button
                        onClick={clearData}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Template & Examples */}
            <Card className="bg-gray-50 border border-gray-200 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-gray-900 rounded-xl">
                        <Download className="h-5 w-5 text-white" />
                      </div>
                      Need a template?
                    </h3>
                    <p className="text-gray-700 text-base leading-relaxed">
                      Download our CSV template with sample data and all supported fields to get started quickly.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon: User, label: 'Contact Info', count: '5 fields', color: 'from-emerald-500 to-teal-600' },
                        { icon: Mail, label: 'Multiple Emails', count: '3 fields', color: 'from-blue-500 to-indigo-600' },
                        { icon: Building, label: 'Company Data', count: '4 fields', color: 'from-purple-500 to-pink-600' },
                        { icon: Sparkles, label: 'Custom Fields', count: 'Unlimited', color: 'from-orange-500 to-red-600' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <item.icon className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{item.label}</div>
                            <div className="text-xs text-gray-600">{item.count}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    onClick={generateTemplate}
                    className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3 font-semibold"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download Template</span>
                    <span className="sm:hidden">Template</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Supported Fields Info */}
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Info className="h-5 w-5 text-gray-700" />
                  </div>
                  Supported Fields & Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-gray-700" />
                      Standard Fields
                    </h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Contact Info', fields: 'firstName, lastName, phone', icon: User },
                        { label: 'Email Addresses', fields: 'email, additionalEmail1, additionalEmail2', icon: Mail },
                        { label: 'Company Details', fields: 'company, position, industry, website', icon: Building },
                        { label: 'Social Profiles', fields: 'linkedin, instagram', icon: Globe },
                        { label: 'Notes & Tags', fields: 'notes, personalizationNote, tags', icon: Tag }
                      ].map((group, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <group.icon className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-gray-800">{group.label}</span>
                          </div>
                          <span className="text-sm text-gray-600 font-mono">{group.fields}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-gray-700" />
                      Advanced Features
                    </h4>
                    <div className="space-y-3">
                      {[
                        { icon: Sparkles, label: 'Custom Fields', desc: 'Create unlimited custom fields for any data', color: 'text-purple-600' },
                        { icon: Mail, label: 'Multiple Emails', desc: 'Support for primary + additional email addresses', color: 'text-blue-600' },
                        { icon: CheckCircle2, label: 'Smart Mapping', desc: 'Automatic field detection and mapping', color: 'text-emerald-600' },
                        { icon: AlertTriangle, label: 'Data Validation', desc: 'Real-time validation and error checking', color: 'text-amber-600' }
                      ].map((feature, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                          <feature.icon className="h-5 w-5 text-gray-700 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-gray-800 mb-1">{feature.label}</div>
                            <div className="text-sm text-gray-600 leading-relaxed">{feature.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Action Buttons */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="order-2 sm:order-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-3 font-medium transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAnalyzeCSV}
                disabled={!csvData.trim() || isAnalyzing}
                className="order-1 sm:order-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white shadow-lg hover:shadow-xl disabled:shadow-none rounded-xl px-8 py-3 font-semibold transition-all duration-200 group"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="hidden sm:inline">Analyzing...</span>
                    <span className="sm:hidden">Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                    <span className="hidden sm:inline">Analyze & Map Fields</span>
                    <span className="sm:hidden">Analyze</span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Mapping Modal */}
      <FieldMappingModal
        isOpen={showFieldMapping}
        onClose={() => setShowFieldMapping(false)}
        csvHeaders={csvHeaders}
        csvRows={csvRows}
        onImport={handleImportComplete}
        isImporting={isImporting}
      />
    </>
  );
}

