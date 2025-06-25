'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentTemplate } from '@/lib/supabase/content-templates';

interface ContentConfigurationProps {
  selectedTemplate: ContentTemplate;
  onConfigurationComplete: (config: ContentConfiguration) => void;
  onBack: () => void;
}

export interface ContentConfiguration {
  template: ContentTemplate;
  topic: string;
  targetKeyword: string;
  relatedKeywords: string[];
  title: string;
  metaDescription: string;
  targetAudience: string;
  tone: 'professional' | 'casual' | 'authoritative' | 'friendly' | 'technical';
  wordCount: number;
  includeImages: boolean;
  includeCallToAction: boolean;
  seoData?: {
    primaryKeyword: {
      keyword: string;
      searchVolume: number;
      competition: number;
      difficulty: number;
    };
    relatedKeywords: Array<{
      keyword: string;
      searchVolume: number;
      relevanceScore: number;
    }>;
    serp_features: string[];
  };
}

export function ContentConfiguration({ selectedTemplate, onConfigurationComplete, onBack }: ContentConfigurationProps) {
  const [config, setConfig] = useState<Partial<ContentConfiguration>>({
    template: selectedTemplate,
    topic: '',
    targetKeyword: '',
    relatedKeywords: [],
    title: '',
    metaDescription: '',
    targetAudience: '',
    tone: 'professional',
    wordCount: selectedTemplate.targetLength,
    includeImages: true,
    includeCallToAction: true
  });

  const [keywordResearch, setKeywordResearch] = useState<any>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);

  // Perform keyword research when topic changes
  useEffect(() => {
    const performKeywordResearch = async () => {
      if (!config.topic || config.topic.length < 3) return;

      setLoadingKeywords(true);
      setKeywordError(null);

      try {
        // Call the keyword research API endpoint
        const response = await fetch(`/api/seo/keywords?topic=${encodeURIComponent(config.topic)}&limit=20`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch keyword data');
        }

        if (result.success && result.data.keywords && result.data.keywords.length > 0) {
          const keywords = result.data.keywords;
          setKeywordResearch(keywords);
          
          // Auto-suggest primary keyword
          const primaryKeyword = keywords[0];
          if (primaryKeyword) {
            setConfig(prev => ({
              ...prev,
              targetKeyword: primaryKeyword.keyword,
              relatedKeywords: keywords.slice(1, 6).map((k: any) => k.keyword)
            }));
          }
          
          // Generate title suggestions
          generateTitleSuggestions();
        }
      } catch (error) {
        console.error('Keyword research failed:', error);
        setKeywordError('Failed to fetch keyword data. You can still continue without SEO insights.');
      } finally {
        setLoadingKeywords(false);
      }
    };

    const debounceTimer = setTimeout(performKeywordResearch, 1000);
    return () => clearTimeout(debounceTimer);
  }, [config.topic]);

  const generateTitleSuggestions = () => {
    if (!config.topic) return;
    
    const templateTitles = {
      'how-to-guide': [
        `How to ${config.topic}`,
        `Complete Guide to ${config.topic}`,
        `Step-by-Step ${config.topic} Tutorial`,
        `${config.topic}: A Beginner's Guide`
      ],
      'product-showcase': [
        `Best ${config.topic} for 2024`,
        `Top ${config.topic} Reviews`,
        `${config.topic}: Product Showcase`,
        `Ultimate ${config.topic} Comparison`
      ],
      'buying-guide': [
        `${config.topic} Buying Guide`,
        `How to Choose the Right ${config.topic}`,
        `${config.topic}: What to Look For`,
        `Complete ${config.topic} Purchase Guide`
      ],
      'case-study': [
        `${config.topic}: A Success Story`,
        `How We Achieved ${config.topic}`,
        `${config.topic} Case Study`,
        `Real Results: ${config.topic}`
      ],
      'industry-trends': [
        `${config.topic} Trends for 2024`,
        `The Future of ${config.topic}`,
        `${config.topic}: Market Analysis`,
        `Emerging ${config.topic} Trends`
      ]
    };

    const suggestions = templateTitles[selectedTemplate.id as keyof typeof templateTitles] || [
      `${config.topic}: Complete Guide`,
      `Everything About ${config.topic}`,
      `${config.topic} Explained`,
      `Understanding ${config.topic}`
    ];

    setSuggestedTitles(suggestions);
  };

  const handleSubmit = () => {
    const finalConfig: ContentConfiguration = {
      template: selectedTemplate,
      topic: config.topic || '',
      targetKeyword: config.targetKeyword || '',
      relatedKeywords: config.relatedKeywords || [],
      title: config.title || '',
      metaDescription: config.metaDescription || '',
      targetAudience: config.targetAudience || '',
      tone: config.tone || 'professional',
      wordCount: config.wordCount || selectedTemplate.targetLength,
      includeImages: config.includeImages ?? true,
      includeCallToAction: config.includeCallToAction ?? true,
      seoData: keywordResearch ? {
        primaryKeyword: {
          keyword: config.targetKeyword || '',
          searchVolume: keywordResearch[0]?.search_volume || 0,
          competition: keywordResearch[0]?.competition_level || 0,
          difficulty: keywordResearch[0]?.difficulty || 0
        },
        relatedKeywords: keywordResearch.slice(1, 6).map((k: any) => ({
          keyword: k.keyword,
          searchVolume: k.search_volume,
          relevanceScore: k.relevance_score
        })),
        serp_features: []
      } : undefined
    };

    onConfigurationComplete(finalConfig);
  };

  const isFormValid = config.topic && config.title && config.targetKeyword;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configure Your Content</h2>
          <p className="text-gray-600 mt-1">
            Set up your content parameters and let AI research the best SEO keywords
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          {selectedTemplate.icon} {selectedTemplate.name}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Basic Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Topic */}
              <div>
                <Label htmlFor="topic">Content Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Shopify SEO optimization"
                  value={config.topic}
                  onChange={(e) => setConfig(prev => ({ ...prev, topic: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This will be used for keyword research and content generation
                </p>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Article Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter your article title"
                  value={config.title}
                  onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
                
                {/* Title Suggestions */}
                {suggestedTitles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Suggested titles:</p>
                    <div className="space-y-1">
                      {suggestedTitles.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setConfig(prev => ({ ...prev, title: suggestion }))}
                          className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Meta Description */}
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  placeholder="Brief description for search engines (150-160 characters)"
                  value={config.metaDescription}
                  onChange={(e) => setConfig(prev => ({ ...prev, metaDescription: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {config.metaDescription?.length || 0}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Target Audience */}
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  placeholder="e.g., Small business owners, E-commerce beginners"
                  value={config.targetAudience}
                  onChange={(e) => setConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Tone */}
              <div>
                <Label htmlFor="tone">Writing Tone</Label>
                <select
                  id="tone"
                  value={config.tone}
                  onChange={(e) => setConfig(prev => ({ ...prev, tone: e.target.value as any }))}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="friendly">Friendly</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              {/* Word Count */}
              <div>
                <Label htmlFor="wordCount">Target Word Count</Label>
                <Input
                  id="wordCount"
                  type="number"
                  min="500"
                  max="5000"
                  value={config.wordCount}
                  onChange={(e) => setConfig(prev => ({ ...prev, wordCount: parseInt(e.target.value) }))}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Recommended: {selectedTemplate.targetLength} words for {selectedTemplate.name}
                </p>
              </div>

              {/* Additional Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includeImages}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeImages: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Include image suggestions</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includeCallToAction}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeCallToAction: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Include call-to-action</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: SEO Research */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                SEO Keyword Research
                {loadingKeywords && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-600">Researching...</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {keywordError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">{keywordError}</p>
                </div>
              )}

              {/* Primary Keyword */}
              <div>
                <Label htmlFor="targetKeyword">Primary Keyword *</Label>
                <Input
                  id="targetKeyword"
                  placeholder="Main keyword to target"
                  value={config.targetKeyword}
                  onChange={(e) => setConfig(prev => ({ ...prev, targetKeyword: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Keyword Research Results */}
              {keywordResearch && keywordResearch.length > 0 && (
                <div>
                  <Label>Keyword Suggestions</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {keywordResearch.slice(0, 10).map((keyword: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setConfig(prev => ({ ...prev, targetKeyword: keyword.keyword }))}
                      >
                        <div>
                          <p className="font-medium text-sm">{keyword.keyword}</p>
                          <p className="text-xs text-gray-500">
                            Volume: {keyword.search_volume?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <Badge 
                          className={`text-xs ${
                            keyword.competition_level === 'low' ? 'bg-green-100 text-green-800' :
                            keyword.competition_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {keyword.competition_level || 'Medium'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Keywords */}
              <div>
                <Label htmlFor="relatedKeywords">Related Keywords</Label>
                <Textarea
                  id="relatedKeywords"
                  placeholder="Enter related keywords (comma separated)"
                  value={config.relatedKeywords?.join(', ')}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    relatedKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                  }))}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost Estimation */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>AI Provider:</span>
                  <span className="font-medium">
                    {selectedTemplate.recommendedProvider === 'anthropic' ? 'Claude' :
                     selectedTemplate.recommendedProvider === 'openai' ? 'GPT-4' : 'Gemini'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated Cost:</span>
                  <span className="font-medium">${selectedTemplate.estimatedCost.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Target Length:</span>
                  <span className="font-medium">{config.wordCount?.toLocaleString()} words</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reading Time:</span>
                  <span className="font-medium">{Math.ceil((config.wordCount || 0) / 200)} min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline">
          ← Back to Templates
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="px-8"
        >
          Generate Content →
        </Button>
      </div>
    </div>
  );
} 