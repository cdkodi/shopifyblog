'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TemplateSelector, ContentTemplate } from '@/components/content-generation/template-selector';
import { ContentConfiguration, ContentConfiguration as ContentConfigInterface } from '@/components/content-generation/content-configuration';
import { ContentTemplateService } from '@/lib/supabase/content-templates';
import { ContentGenerator, GeneratedContent } from '@/components/content-generation/content-generator';
import { ContentEditor, PublishedContent } from '@/components/content-generation/content-editor';
import { GenerationConfig, EnhancedContentConfig } from '@/components/content-generation/generation-config';
import { ProductSelector } from '@/components/content-generation/product-selector';
import { ContentPreview } from '@/components/content-generation/content-preview';
import { ProductForContentGeneration } from '@/lib/supabase/shopify-products';
import { Button } from '@/components/ui/button';

function ContentGenerationInner() {
  const searchParams = useSearchParams();
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | undefined>();
  const [configuration, setConfiguration] = useState<ContentConfigInterface | undefined>();
  const [enhancedConfig, setEnhancedConfig] = useState<EnhancedContentConfig | undefined>();
  const [selectedProducts, setSelectedProducts] = useState<ProductForContentGeneration[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | undefined>();
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
  const mapTopicTemplateToActualTemplate = (topicTemplate: string): string => {
    const mapping: Record<string, string> = {
      'Blog Post': 'Industry Trends', // Map generic blog post to trends
      'How-to Guide': 'How-To Guide', // Fix casing
      'Listicle': 'Product Showcase', // Map listicle to product showcase
      'Review': 'Review',
      'Case Study': 'Case Study', 
      'Tutorial': 'Tutorial'
    };
    return mapping[topicTemplate] || topicTemplate;
  };

  // Parse URL parameters when component mounts
  useEffect(() => {
    const topic = searchParams.get('topic');
    const keywords = searchParams.get('keywords');
    const tone = searchParams.get('tone');
    const length = searchParams.get('length');
    const template = searchParams.get('template');

    if (topic || keywords || tone || length || template) {
      const initialData = {
        topic: topic || '',
        targetKeyword: keywords ? keywords.split(',')[0]?.trim() : '',
        relatedKeywords: keywords ? keywords.split(',').slice(1).map(k => k.trim()).filter(Boolean) : [],
        tone: tone as any || 'professional',
        wordCount: length ? parseInt(length) : undefined,
        suggestedTemplate: template
      };
      
      console.log('📥 URL params parsed:', { topic, keywords, tone, length, template });
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
        const mappedTemplateName = mapTopicTemplateToActualTemplate(initialConfigData.suggestedTemplate);
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

  const handleGenerationComplete = (content: GeneratedContent) => {
    setGeneratedContent(content);
    setCurrentStep(4);
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
    { number: 3, name: 'Generate', description: 'Create content' },
    { number: 4, name: 'Edit', description: 'Review & refine' }
  ];

  return (
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
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Template Pre-selected from Topics: "{selectedTemplate.name}"
                      </h3>
                      <div className="mt-1 text-sm text-green-600">
                        <p>Topic: <span className="font-medium">"{initialConfigData.topic}"</span> • Configuration has been pre-filled based on your topic settings.</p>
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
              {enhancedConfig?.includeProducts && (
                <ProductSelector
                  selectedProducts={selectedProducts}
                  onProductsChange={handleProductsChange}
                  maxProducts={enhancedConfig.productIntegration.maxProducts}
                  contentTopic={enhancedConfig.topic}
                  preferredCollections={enhancedConfig.productIntegration.preferredCollections}
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
                        metaDescription: enhancedConfig.metaDescription || `Discover everything about ${enhancedConfig.topic}`,
                        targetAudience: enhancedConfig.targetAudience,
                        tone: enhancedConfig.tone,
                        wordCount: enhancedConfig.wordCount,
                        includeImages: enhancedConfig.includeImages,
                        includeCallToAction: enhancedConfig.includeCallToAction,
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
          <ContentGenerator
            configuration={configuration}
            onGenerationComplete={handleGenerationComplete}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && generatedContent && (
          <ContentEditor
            generatedContent={generatedContent}
            onPublish={handlePublish}
            onBack={() => setCurrentStep(3)}
          />
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