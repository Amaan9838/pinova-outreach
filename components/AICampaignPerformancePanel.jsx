'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Zap,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  BarChart3,
  Mail,
  Eye,
  MessageSquare,
  Clock,
  Target,
  FlaskConical
} from 'lucide-react';

// Grade colors
const gradeColors = {
  'A': 'bg-green-500',
  'B': 'bg-blue-500',
  'C': 'bg-amber-500',
  'D': 'bg-orange-500',
  'F': 'bg-red-500',
  'N/A': 'bg-slate-400'
};

export function AICampaignPerformancePanel({ campaignId, campaignData }) {
  const [analysis, setAnalysis] = useState(null);
  const [variations, setVariations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch AI analysis
  const fetchAnalysis = useCallback(async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns/${campaignId}/ai-variations`);
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
      } else {
        setAnalysis({ error: true });
      }
    } catch (error) {
      setAnalysis({ error: true });
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Generate new AI variations
  const generateVariations = async (stepIndex) => {
    try {
      setGeneratingVariations(true);
      const res = await fetch(`/api/campaigns/${campaignId}/ai-variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_variations',
          stepNumber: stepIndex,
          variationCount: 3,
          purpose: 'follow_up'
        })
      });
      const data = await res.json();
      if (data.success) {
        setVariations(data.data.variations);
        toast.success('AI generated 3 email variations');
      }
    } catch (error) {
      toast.error('Failed to generate variations');
    } finally {
      setGeneratingVariations(false);
    }
  };

  // Apply a variation
  const applyVariation = async (variation, stepIndex) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/ai-variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_variation',
          variation,
          targetStep: stepIndex
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Variation applied to campaign');
        setVariations(null);
        fetchAnalysis();
      }
    } catch (error) {
      toast.error('Failed to apply variation');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const analysisData = analysis?.analysis;
  const stepMetrics = analysis?.stepMetrics || [];

  // Show error state if AI is unavailable
  if (analysis?.error) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50/50 to-slate-100/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-600">AI Performance Analysis</CardTitle>
            <Badge variant="outline" className="bg-white/50 text-slate-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unavailable
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">AI Analysis Unavailable</p>
            <p className="text-sm mt-2">Configure GEMINI_API_KEY in .env to enable AI features</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50/50 to-blue-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">AI Performance Analysis</CardTitle>
            <Badge variant="outline" className="bg-white/50">
              <Sparkles className="h-3 w-3 mr-1" />
              Gemini 2.5 Flash
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAnalysis}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Grade */}
        {analysisData && (
          <div className="flex items-center gap-4 p-4 bg-white/70 rounded-lg">
            <div className={`text-3xl font-bold w-16 h-16 rounded-full ${gradeColors[analysisData.overallGrade]} text-white flex items-center justify-center`}>
              {analysisData.overallGrade}
            </div>
            <div className="flex-1">
              <p className="font-medium">{analysisData.summary}</p>
              <div className="flex gap-4 mt-2">
                {analysisData.strengths?.slice(0, 2).map((s, i) => (
                  <span key={i} className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step Performance */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Sequence Step Performance
          </h4>
          <div className="space-y-3">
            {stepMetrics.map((step, i) => (
              <div key={i} className="p-3 bg-white/70 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Step {step.stepNumber}: {step.subject?.substring(0, 40)}...</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {step.sent} sent
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {step.openRate}% opened
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {step.replyRate}% replied
                      </span>
                    </div>
                  </div>
                  {step.aiGenerated && (
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Progress 
                    value={step.openRate} 
                    className="flex-1 h-2"
                  />
                  <span className={`text-xs ${step.openRate >= 25 ? 'text-green-600' : step.openRate >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                    {step.openRate >= 25 ? '✓ Good' : step.openRate >= 15 ? '○ Avg' : '✗ Low'}
                  </span>
                </div>
                
                {/* Generate new variations button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => generateVariations(i)}
                  disabled={generatingVariations}
                >
                  {generatingVariations ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-3 w-3 mr-2" />
                      Generate A/B Variations
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        {analysisData?.recommendations?.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              AI Recommendations
            </h4>
            <div className="space-y-2">
              {analysisData.recommendations.map((rec, i) => (
                <div key={i} className="p-3 bg-white/70 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rec.issue}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.suggestion}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {rec.expectedImpact}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {rec.area?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Variations Modal */}
        {variations && variations.length > 0 && (
          <Dialog open={!!variations} onOpenChange={() => setVariations(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI-Generated Email Variations
                </DialogTitle>
                <DialogDescription>
                  Choose a variation to apply to your campaign, or copy for manual use
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {variations.map((variation, i) => (
                  <div 
                    key={i} 
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedVariation === i 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedVariation(i)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">
                        {variation.variationName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(`Subject: ${variation.subject}\n\n${variation.body}`, i);
                        }}
                      >
                        {copiedId === i ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <p className="font-medium text-sm mb-2">Subject: {variation.subject}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {variation.body}
                    </p>
                    <p className="text-xs text-purple-600 mt-2">
                      Strategy: {variation.strategy}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setVariations(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={selectedVariation === null}
                  onClick={() => applyVariation(variations[selectedVariation], 0)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Apply Selected Variation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Quick experiments suggestions */}
        {analysisData?.suggestedExperiments?.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
            <p className="font-medium text-sm flex items-center gap-2 mb-2">
              <FlaskConical className="h-4 w-4 text-amber-500" />
              Suggested Experiments
            </p>
            <ul className="text-sm space-y-1">
              {analysisData.suggestedExperiments.map((exp, i) => (
                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {exp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AICampaignPerformancePanel;
