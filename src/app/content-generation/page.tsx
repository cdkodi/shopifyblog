'use client';

import { useState } from 'react';
import { TemplateSelector, ContentTemplate } from '@/components/content-generation/template-selector';
import { ContentConfiguration, ContentConfiguration as ContentConfigInterface } from '@/components/content-generation/content-configuration';
import { ContentGenerator, GeneratedContent } from '@/components/content-generation/content-generator';
import { ContentEditor, PublishedContent } from '@/components/content-generation/content-editor';
import { Button } from '@/components/ui/button';

export default function ContentGenerationPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | undefined>();
  const [configuration, setConfiguration] = useState<ContentConfigInterface | undefined>();
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | undefined>();
  const [publishedContent, setPublishedContent] = useState<PublishedContent | undefined>();
  const [currentStep, setCurrentStep] = useState(1);

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
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  AI Services Active
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
          <ContentConfiguration
            selectedTemplate={selectedTemplate}
            onConfigurationComplete={handleConfigurationComplete}
            onBack={() => setCurrentStep(1)}
          />
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