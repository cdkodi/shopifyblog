'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentTemplate } from '@/lib/supabase/content-templates';

interface GenerationConfigProps {
  selectedTemplate: ContentTemplate;
  onConfigChange: (config: EnhancedContentConfig) => void;
  isDevMode?: boolean;
  initialData?: {
    topic?: string;
    targetKeyword?: string;
    relatedKeywords?: string[];
    tone?: 'professional' | 'casual' | 'authoritative' | 'friendly' | 'technical';
    wordCount?: number;
  };
}

export interface EnhancedContentConfig {
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
  
  // Enhanced product integration options
  includeProducts: boolean;
  productIntegration: {
    maxProducts: number;
    integrationStyle: 'contextual' | 'showcase' | 'subtle';
    wordsPerProduct: number;
    preferredCollections: string[];
    manualProductSelection: boolean;
  };
  
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

const integrationStyles = [
  {
    value: 'contextual' as const,
    label: 'Contextual',
    description: 'Products mentioned naturally within content flow'
  },
  {
    value: 'showcase' as const,
    label: 'Showcase',
    description: 'Dedicated sections highlighting specific products'
  },
  {
    value: 'subtle' as const,
    label: 'Subtle',
    description: 'Minimal product mentions with focus on content'
  }
];

const availableCollections = [
  'Madhubani Art',
  'Pichwai Art', 
  'Kerala Mural',
  'Pattachitra Art',
  'Ganesha Collection',
  'Krishna Collection',
  'Dance Forms',
  'Home Decor',
  'Traditional Art'
];

export function GenerationConfig({ 
  selectedTemplate, 
  onConfigChange, 
  isDevMode = true, 
  initialData 
}: GenerationConfigProps) {
  
  const [config, setConfig] = useState<Partial<EnhancedContentConfig>>({
    template: selectedTemplate,
    topic: initialData?.topic || '',
    targetKeyword: initialData?.targetKeyword || '',
    relatedKeywords: initialData?.relatedKeywords || [],
    title: '',
    metaDescription: '',
    targetAudience: '',
    tone: initialData?.tone || 'professional',
    wordCount: initialData?.wordCount || selectedTemplate.targetLength,
    includeImages: true,
    includeCallToAction: true,
    
    // Default product integration settings
    includeProducts: false,
    productIntegration: {
      maxProducts: 3,
      integrationStyle: 'contextual',
      wordsPerProduct: 300,
      preferredCollections: [],
      manualProductSelection: false
    }
  });

  const [keywordResearch, setKeywordResearch] = useState<any>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  // Auto-save and notify parent of changes
  useEffect(() => {
    if (config.topic && config.wordCount) {
      onConfigChange(config as EnhancedContentConfig);
    }
  }, [config, onConfigChange]);

  // Perform keyword research when topic changes
  useEffect(() => {
    const performKeywordResearch = async () => {
      if (!config.topic || config.topic.length < 3) return;

      setLoadingKeywords(true);
      setKeywordError(null);

      try {
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
          if (primaryKeyword && !config.targetKeyword) {
            setConfig(prev => ({
              ...prev,
              targetKeyword: primaryKeyword.keyword,
              relatedKeywords: keywords.slice(1, 6).map((k: any) => k.keyword)
            }));
          }
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

  const updateConfig = (updates: Partial<EnhancedContentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateProductIntegration = (updates: Partial<EnhancedContentConfig['productIntegration']>) => {
    setConfig(prev => ({
      ...prev,
      productIntegration: {
        maxProducts: 3,
        integrationStyle: 'contextual' as const,
        wordsPerProduct: 300,
        preferredCollections: [],
        manualProductSelection: false,
        ...prev.productIntegration,
        ...updates
      }
    }));
  };

  const toggleCollection = (collection: string) => {
    const current = config.productIntegration?.preferredCollections || [];
    const updated = current.includes(collection)
      ? current.filter(c => c !== collection)
      : [...current, collection];
    
    updateProductIntegration({ preferredCollections: updated });
  };

  return (
    <div className="space-y-6">
      {/* Dev Mode Indicator */}
      {isDevMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-amber-600 text-sm font-medium">🛠️</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Development Mode Active
              </h3>
              <p className="mt-1 text-sm text-amber-600">
                Using mock data for product suggestions and AI responses. AI services not configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Content Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Content Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="topic">Content Topic</Label>
            <Input
              id="topic"
              value={config.topic || ''}
              onChange={(e) => updateConfig({ topic: e.target.value })}
              placeholder="e.g., Madhubani Art Techniques, Home Decor Trends"
              className="mt-1"
            />
            {loadingKeywords && (
              <p className="text-sm text-blue-600 mt-1">🔍 Researching keywords...</p>
            )}
            {keywordError && (
              <p className="text-sm text-amber-600 mt-1">⚠️ {keywordError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wordCount">Target Word Count</Label>
              <Input
                id="wordCount"
                type="number"
                min="300"
                max="3000"
                value={config.wordCount || ''}
                onChange={(e) => updateConfig({ wordCount: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={config.tone || 'professional'}
                onValueChange={(value) => updateConfig({ tone: value as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={config.targetAudience || ''}
              onChange={(e) => updateConfig({ targetAudience: e.target.value })}
              placeholder="e.g., Art enthusiasts, Home decorators, Cultural heritage lovers"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Integration Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Product Integration
            <div className="flex items-center space-x-2">
              <Label htmlFor="includeProducts" className="text-sm">Enable</Label>
              <input
                id="includeProducts"
                type="checkbox"
                checked={config.includeProducts || false}
                onChange={(e) => updateConfig({ includeProducts: e.target.checked })}
                className="rounded"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.includeProducts ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxProducts">Max Products</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    min="1"
                    max="10"
                    value={config.productIntegration?.maxProducts || 3}
                    onChange={(e) => updateProductIntegration({ 
                      maxProducts: parseInt(e.target.value) || 3 
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="wordsPerProduct">Words per Product</Label>
                  <Input
                    id="wordsPerProduct"
                    type="number"
                    min="100"
                    max="500"
                    step="50"
                    value={config.productIntegration?.wordsPerProduct || 300}
                    onChange={(e) => updateProductIntegration({ 
                      wordsPerProduct: parseInt(e.target.value) || 300 
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="integrationStyle">Integration Style</Label>
                  <Select
                    value={config.productIntegration?.integrationStyle || 'contextual'}
                    onValueChange={(value) => updateProductIntegration({ 
                      integrationStyle: value as any 
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrationStyles.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Integration Style Description */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">
                    {integrationStyles.find(s => s.value === config.productIntegration?.integrationStyle)?.label}:
                  </span>{' '}
                  {integrationStyles.find(s => s.value === config.productIntegration?.integrationStyle)?.description}
                </p>
              </div>

              {/* Collection Preferences */}
              <div>
                <Label>Preferred Collections (optional)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableCollections.map(collection => {
                    const isSelected = config.productIntegration?.preferredCollections?.includes(collection) || false;
                    return (
                      <button
                        key={collection}
                        type="button"
                        onClick={() => {
                          console.log('Clicking collection:', collection, 'Current selected:', config.productIntegration?.preferredCollections);
                          toggleCollection(collection);
                        }}
                        className="focus:outline-none"
                      >
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                          {collection}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Click to select preferred product collections. Leave empty for automatic selection.
                </p>
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {JSON.stringify(config.productIntegration?.preferredCollections || [])}
                </div>
              </div>

              {/* Manual Product Selection Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  id="manualSelection"
                  type="checkbox"
                  checked={config.productIntegration?.manualProductSelection || false}
                  onChange={(e) => updateProductIntegration({ 
                    manualProductSelection: e.target.checked 
                  })}
                  className="rounded"
                />
                <Label htmlFor="manualSelection" className="text-sm">
                  Enable manual product selection
                </Label>
              </div>
              {config.productIntegration?.manualProductSelection && (
                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  💡 You'll be able to browse and select specific products in the next step.
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Product integration is disabled.</p>
              <p className="text-sm">Enable to include product suggestions in your content.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Preview */}
      {keywordResearch && (
        <Card>
          <CardHeader>
            <CardTitle>SEO Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label>Suggested Keywords (click to add)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {keywordResearch.slice(0, 8).map((keyword: any, index: number) => {
                    const isSelected = config.targetKeyword === keyword.keyword || 
                                     (config.relatedKeywords || []).includes(keyword.keyword);
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (!config.targetKeyword) {
                            // If no target keyword set, make this the target keyword
                            updateConfig({ targetKeyword: keyword.keyword });
                                                     } else if (!(config.relatedKeywords || []).includes(keyword.keyword) && 
                                    config.targetKeyword !== keyword.keyword) {
                             // Add to related keywords if not already present
                             updateConfig({ 
                               relatedKeywords: [...(config.relatedKeywords || []), keyword.keyword]
                             });
                          }
                        }}
                        disabled={isSelected}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 border-blue-300 text-blue-700 cursor-default' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{keyword.keyword} ({keyword.search_volume || 'N/A'} vol)
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click keywords to add them. First click sets target keyword, additional clicks add related keywords.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 