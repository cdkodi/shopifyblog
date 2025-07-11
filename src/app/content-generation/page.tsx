'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { TemplateSelector, ContentTemplate } from '@/components/content-generation/template-selector';
import { ContentConfiguration, ContentConfiguration as ContentConfigInterface } from '@/components/content-generation/content-configuration';
import { ContentTemplateService } from '@/lib/supabase/content-templates';
import { ContentEditor, PublishedContent } from '@/components/content-generation/content-editor';
import { GenerationConfig, EnhancedContentConfig } from '@/components/content-generation/generation-config';
import { ProductSelector } from '@/components/content-generation/product-selector';
import { ContentPreview } from '@/components/content-generation/content-preview';
import { ProductForContentGeneration } from '@/lib/supabase/shopify-products';
import { Button } from '@/components/ui/button';
import { GenerationStatusTracker } from '@/components/generation-status-tracker';

interface V2GenerationWrapperProps {
  configuration: ContentConfigInterface;
  initialConfigData: any;
  onComplete: (articleId: string) => void;
  onError: (error: string) => void;
}

function V2GenerationWrapper({ configuration, initialConfigData, onComplete, onError }: V2GenerationWrapperProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const startGeneration = async () => {
      try {
        // Validate and clean topicId
        const isValidUUID = (str: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };

        const cleanTopicId = initialConfigData?.topicId && 
                           initialConfigData.topicId !== 'undefined' && 
                           isValidUUID(initialConfigData.topicId) 
                           ? initialConfigData.topicId 
                           : crypto.randomUUID();

        console.log('🚀 Starting V2 generation with cleaned topicId:', cleanTopicId);

        // Use the V2 generation API
        const response = await fetch('/api/ai/v2-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: {
              id: cleanTopicId,
              title: configuration.topic,
              keywords: [configuration.targetKeyword, ...configuration.relatedKeywords],
              tone: configuration.tone,
              wordCount: configuration.wordCount,
              template: configuration.template.id
            },
            template: {
              id: configuration.template.id,
              name: configuration.template.name,
              icon: configuration.template.icon,
              targetLength: configuration.wordCount,
              difficulty: configuration.template.difficulty,
              estimatedCost: configuration.template.estimatedCost,
              recommendedProvider: configuration.template.recommendedProvider
            },
            aiProvider: configuration.aiProvider === 'auto' ? 'anthropic' : configuration.aiProvider,
            includeProducts: false,
            productSelectionCriteria: null,
            createArticle: true,
            targetAudience: configuration.targetAudience || '',
            seoData: configuration.seoData,
            customInstructions: `Generate a ${configuration.template.name} about ${configuration.topic}. Target keyword: ${configuration.targetKeyword}. Tone: ${configuration.tone}. Word count: ${configuration.wordCount}.`
          })
        });

        const result = await response.json();
        console.log('📋 V2 generation response:', result);

        if (!response.ok) {
          throw new Error(result.error || 'Failed to start generation');
        }

        if (result.success && result.jobId) {
          console.log('✅ V2 generation started successfully, jobId:', result.jobId);
          setJobId(result.jobId);
        } else {
          throw new Error('Failed to get job ID from generation response');
        }
      } catch (error) {
        console.error('❌ Failed to start V2 generation:', error);
        onError(error instanceof Error ? error.message : 'Failed to start generation');
      } finally {
        setIsStarting(false);
      }
    };

    startGeneration();
  }, []);

  if (isStarting) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Starting generation...</p>
        </div>
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to start generation. Please try again.</p>
      </div>
    );
  }

  return (
    <GenerationStatusTracker
      jobId={jobId}
      onComplete={(result) => {
        if (result.articleId) {
          onComplete(result.articleId);
        } else {
          onError('Generation completed but no article was created');
        }
      }}
      onError={onError}
    />
  );
}

function ContentGenerationInner() {
  const searchParams = useSearchParams();
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | undefined>();
  const [configuration, setConfiguration] = useState<ContentConfigInterface | undefined>();
  const [enhancedConfig, setEnhancedConfig] = useState<EnhancedContentConfig | undefined>();
  const [selectedProducts, setSelectedProducts] = useState<ProductForContentGeneration[]>([]);
  const [publishedContent, setPublishedContent] = useState<PublishedContent | undefined>();
  const [currentStep, setCurrentStep] = useState(1);
  const [initialConfigData, setInitialConfigData] = useState<any>(null);
  const [isDevMode, setIsDevMode] = useState(true);
  const [aiServiceStatus, setAiServiceStatus] = useState<{
    available: boolean;
    providers: string[];
    loading: boolean;
  }>({ available: false, providers: [], loading: true });
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [comingFromTopics, setComingFromTopics] = useState(false);

  // Template name mapping from Topics form to actual template names
  const mapTopicTemplateToActualTemplate = (topicTemplate: string, topicContent?: string): string => {
    const mapping: Record<string, string> = {
      'How-to Guide': 'How-To Guide', // Fix casing
      'Listicle': 'Product Showcase', // Map listicle to product showcase
      'Review': 'Review',
      'Case Study': 'Case Study', 
      'Tutorial': 'Tutorial'
    };

    // Handle "Blog Post" with context-aware mapping
    if (topicTemplate === 'Blog Post') {
      if (!topicContent) {
        return 'Industry Trends'; // Default fallback
      }
      
      const content = topicContent.toLowerCase();
      
      // Context-aware mapping based on topic content
      if (content.includes('how to') || content.includes('guide') || content.includes('step')) {
        return 'How-To Guide';
      } else if (content.includes('best') || content.includes('top') || content.includes('product') || content.includes('review')) {
        return 'Product Showcase';
      } else if (content.includes('vs') || content.includes('versus') || content.includes('comparison') || content.includes('compare')) {
        return 'Comparison';
      } else if (content.includes('buy') || content.includes('choose') || content.includes('select') || content.includes('purchase')) {
        return 'Buying Guide';
      } else if (content.includes('trend') || content.includes('future') || content.includes('2024') || content.includes('2025')) {
        return 'Industry Trends';
      } else if (content.includes('news') || content.includes('update') || content.includes('announcement')) {
        return 'News & Updates';
      } else if (content.includes('analysis') || content.includes('study') || content.includes('research')) {
        return 'Analysis';
      } else {
        return 'Industry Trends'; // Default for generic blog posts
      }
    }
    
    return mapping[topicTemplate] || topicTemplate;
  };

  // Parse URL parameters when component mounts
  useEffect(() => {
    const topicId = searchParams.get('topicId');
    const topic = searchParams.get('topic');
    const keywords = searchParams.get('keywords');
    const tone = searchParams.get('tone');
    const length = searchParams.get('length');
    const template = searchParams.get('template');

    if (topic || keywords || tone || length || template || topicId) {
      // Validate UUID
      const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return str && str !== 'undefined' && uuidRegex.test(str);
      };

      const initialData = {
        topicId: isValidUUID(topicId || '') ? topicId : undefined,
        topic: topic || '',
        targetKeyword: keywords ? keywords.split(',')[0]?.trim() : '',
        relatedKeywords: keywords ? keywords.split(',').slice(1).map(k => k.trim()).filter(Boolean) : [],
        tone: tone as any || 'professional',
        wordCount: length ? parseInt(length) : undefined,
        suggestedTemplate: template
      };
      
      console.log('📥 URL params parsed:', { topicId: initialData.topicId, topic, keywords, tone, length, template });
      setInitialConfigData(initialData);
      
      // If coming from Topics with template, set flag for auto-selection
      if (topic && template) {
        console.log('🎯 Coming from Topics with template:', template);
        setComingFromTopics(true);
      } else {
        console.log('🔍 Not from Topics - missing topic or template:', { hasTopic: !!topic, hasTemplate: !!template });
      }
    }
  }, [searchParams]);

  // Check AI service availability
  useEffect(() => {
    const checkAiServices = async () => {
      try {
        const response = await fetch('/api/ai/generate-content');
        const data = await response.json();
        
        setAiServiceStatus({
          available: data.success && data.availableProviders && data.availableProviders.length > 0,
          providers: data.availableProviders || [],
          loading: false
        });
        
        setIsDevMode(!(data.success && data.availableProviders && data.availableProviders.length > 0));
      } catch (error) {
        console.error('Failed to check AI services:', error);
        setAiServiceStatus({
          available: false,
          providers: [],
          loading: false
        });
        setIsDevMode(true);
      }
    };

    checkAiServices();
  }, []);

  // Auto-select template when coming from Topics
  useEffect(() => {
    const autoSelectTemplate = async () => {
      console.log('🔍 Auto-selection check:', { 
        comingFromTopics, 
        hasInitialData: !!initialConfigData, 
        suggestedTemplate: initialConfigData?.suggestedTemplate,
        templatesLoaded 
      });

      if (!comingFromTopics || !initialConfigData?.suggestedTemplate) {
        console.log('❌ Auto-selection skipped: missing requirements');
        return;
      }

      if (templatesLoaded) {
        console.log('❌ Auto-selection skipped: templates already loaded');
        return;
      }

      try {
        console.log('🔄 Auto-selecting template for:', initialConfigData.suggestedTemplate);
        
        // Load templates from service
        const { data: templates, error } = await ContentTemplateService.getContentTemplates();
        
        if (error || !templates) {
          console.error('Failed to load templates for auto-selection:', error);
          return;
        }

        console.log('📚 Available templates:', templates.map(t => t.name));

        // Map topic template name to actual template name
        const mappedTemplateName = mapTopicTemplateToActualTemplate(initialConfigData.suggestedTemplate, initialConfigData.topic);
        console.log('🗺️ Mapped template name:', `"${initialConfigData.suggestedTemplate}" → "${mappedTemplateName}"`);
        
        // Find matching template
        const matchingTemplate = templates.find(t => t.name === mappedTemplateName);
        
        if (matchingTemplate) {
          console.log('✅ Auto-selected template:', matchingTemplate.name);
          setSelectedTemplate(matchingTemplate);
          setCurrentStep(2); // Skip to Configuration step
        } else {
          console.warn('⚠️ No matching template found for:', mappedTemplateName);
          console.log('Available template names:', templates.map(t => `"${t.name}"`));
        }
        
        setTemplatesLoaded(true);
      } catch (error) {
        console.error('Auto-selection failed:', error);
      }
    };

    // Delay slightly to ensure all state is ready
    const timer = setTimeout(autoSelectTemplate, 100);
    return () => clearTimeout(timer);
  }, [comingFromTopics, initialConfigData]);

  const handleTemplateSelect = (template: ContentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleNext = () => {
    if (selectedTemplate) {
      setCurrentStep(2);
    }
  };

  const handleConfigurationComplete = (config: ContentConfigInterface) => {
    setConfiguration(config);
    setCurrentStep(3);
  };

  const handleEnhancedConfigChange = (config: EnhancedContentConfig) => {
    setEnhancedConfig(config);
  };

  const handleProductsChange = (products: ProductForContentGeneration[]) => {
    setSelectedProducts(products);
  };

  const handlePublish = (content: PublishedContent) => {
    setPublishedContent(content);
    // Here you would integrate with your blog platform
    // For now, we'll show a success message
    alert('Content published successfully!');
  };

  const steps = [
    { number: 1, name: 'Template', description: 'Choose content type' },
    { number: 2, name: 'Configure', description: 'Set parameters' },
    { number: 3, name: 'Generate', description: 'Create content' }
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Content Generation</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create SEO-optimized content using AI and keyword research
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    aiServiceStatus.loading ? 'bg-yellow-500' : 
                    isDevMode ? 'bg-amber-500' : 'bg-green-500'
                  }`}></div>
                  {aiServiceStatus.loading ? 'Checking AI Services...' :
                   isDevMode ? 'Development Mode' : 
                   `AI Services Active (${aiServiceStatus.providers.join(', ')})`}
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  SEO Services Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                {steps.map((step, stepIdx) => (
                  <li key={step.number} className={`${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}>
                    <div className="flex items-center">
                      <div className={`
                        relative flex h-8 w-8 items-center justify-center rounded-full
                        ${currentStep > step.number 
                          ? 'bg-blue-600 text-white' 
                          : currentStep === step.number 
                            ? 'border-2 border-blue-600 bg-white text-blue-600' 
                            : 'border-2 border-gray-300 bg-white text-gray-500'
                        }
                      `}>
                        {currentStep > step.number ? (
                          <span className="text-white">✓</span>
                        ) : (
                          <span className="text-sm font-medium">{step.number}</span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0">
                        <p className={`text-sm font-medium ${
                          currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {step.name}
                        </p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    {stepIdx !== steps.length - 1 && (
                      <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 1 && (
          <div className="space-y-8">
            {/* Topic Pre-filled Notification */}
            {initialConfigData?.topic && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">📝</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Topic Selected: "{initialConfigData.topic}"
                    </h3>
                    <div className="mt-1 text-sm text-blue-600">
                      <p>Choose a content template below to generate content for this topic.</p>
                      {initialConfigData.targetKeyword && (
                        <p className="mt-1">
                          <span className="font-medium">Keywords:</span> {initialConfigData.targetKeyword}
                          {initialConfigData.relatedKeywords?.length > 0 && `, ${initialConfigData.relatedKeywords.join(', ')}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <TemplateSelector
              onTemplateSelect={handleTemplateSelect}
              selectedTemplate={selectedTemplate}
            />

            {/* Next Button */}
            {selectedTemplate && (
              <div className="flex justify-end">
                <Button onClick={handleNext} size="lg" className="px-8">
                  Continue to Configuration →
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && selectedTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Topics Auto-Selection Notification */}
            {comingFromTopics && initialConfigData?.topic && (
              <div className="lg:col-span-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">🎯</span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-green-800">
                        Template Pre-selected from Topics: "{selectedTemplate.name}"
                      </h3>
                      <div className="mt-1 text-sm text-green-600 space-y-1">
                        <p>Topic: <span className="font-medium">"{initialConfigData.topic}"</span> • Configuration has been pre-filled based on your topic settings.</p>
                        {(initialConfigData.targetKeyword || (initialConfigData.relatedKeywords && initialConfigData.relatedKeywords.length > 0)) && (
                          <div className="flex items-start space-x-2">
                            <span className="text-blue-600 font-medium">🔑 Keywords inherited:</span>
                            <div className="flex flex-wrap gap-1">
                              {initialConfigData.targetKeyword && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200">
                                  {initialConfigData.targetKeyword} (target)
                                </span>
                              )}
                              {initialConfigData.relatedKeywords?.map((keyword: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setComingFromTopics(false);
                          setCurrentStep(1);
                        }}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        Change Template
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              <GenerationConfig
                selectedTemplate={selectedTemplate}
                onConfigChange={handleEnhancedConfigChange}
                isDevMode={isDevMode}
                initialData={initialConfigData}
              />

              {/* Product Selection Panel */}
              {/* Feature flag: Hide Product Selection for launch simplicity */}
              {false && enhancedConfig?.includeProducts && (
                <ProductSelector
                  selectedProducts={selectedProducts}
                  onProductsChange={handleProductsChange}
                  maxProducts={enhancedConfig?.productIntegration?.maxProducts || 3}
                  contentTopic={enhancedConfig?.topic || ''}
                  preferredCollections={enhancedConfig?.productIntegration?.preferredCollections || []}
                  isDevMode={isDevMode}
                />
              )}

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back to Templates
                </Button>
                <Button 
                  onClick={() => {
                    // Convert enhanced config to legacy format for now
                    if (enhancedConfig) {
                      setConfiguration({
                        template: enhancedConfig.template,
                        topic: enhancedConfig.topic,
                        targetKeyword: enhancedConfig.targetKeyword,
                        relatedKeywords: enhancedConfig.relatedKeywords,
                        title: enhancedConfig.title || `Complete Guide to ${enhancedConfig.topic}`,
                        metaDescription: enhancedConfig.metaDescription || '',
                        targetAudience: enhancedConfig.targetAudience,
                        tone: enhancedConfig.tone,
                        wordCount: enhancedConfig.wordCount,
                        includeImages: enhancedConfig.includeImages,
                        includeCallToAction: enhancedConfig.includeCallToAction,
                        aiProvider: enhancedConfig.aiProvider,
                        seoData: enhancedConfig.seoData
                      });
                      setCurrentStep(3);
                    }
                  }}
                  disabled={!enhancedConfig?.topic || !enhancedConfig?.wordCount}
                  size="lg"
                  className="px-8"
                >
                  Generate Content →
                </Button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <ContentPreview
                config={enhancedConfig || {}}
                selectedProducts={selectedProducts}
                isDevMode={isDevMode}
              />
            </div>
          </div>
        )}

        {currentStep === 3 && configuration && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Content</h2>
              <p className="text-gray-600">Please wait while AI creates your optimized content...</p>
            </div>

            <V2GenerationWrapper
              configuration={configuration}
              initialConfigData={initialConfigData}
              onComplete={(articleId) => {
                console.log('✅ V2 Generation completed, article created:', articleId);
                // Navigate to edit the created article
                window.location.href = `/articles/${articleId}/edit`;
              }}
              onError={(error) => {
                console.error('❌ V2 Generation failed:', error);
                alert(`Generation failed: ${error}`);
                setCurrentStep(2); // Go back to configuration
              }}
            />

            <div className="flex justify-center pt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to Configuration
              </button>
            </div>

            {/* Generation Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Template:</span>
                  <p className="font-medium">{configuration.template.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">AI Provider:</span>
                  <p className="font-medium">
                    {(() => {
                      const provider = configuration.aiProvider === 'auto' ? configuration.template.recommendedProvider : configuration.aiProvider;
                      return provider === 'anthropic' ? 'Claude' :
                             provider === 'openai' ? 'GPT-4' : 
                             provider === 'google' ? 'Gemini' : 'Auto';
                    })()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Target Length:</span>
                  <p className="font-medium">{configuration.wordCount.toLocaleString()} words</p>
                </div>
                <div>
                  <span className="text-gray-500">Topic:</span>
                  <p className="font-medium">{configuration.topic}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
        <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <p>AI + SEO Content Generation • Powered by Claude, GPT-4, Gemini & DataForSEO</p>
            </div>
            <div className="flex items-center space-x-4">
              <span>Targeting: India (IN)</span>
              <span>Language: English</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

export default function ContentGenerationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content generation...</p>
        </div>
      </div>
    }>
      <ContentGenerationInner />
    </Suspense>
  );
} 