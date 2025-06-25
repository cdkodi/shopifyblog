'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentTemplateService, ContentTemplate } from '@/lib/supabase/content-templates';

interface TemplateSelectorProps {
  onTemplateSelect: (template: ContentTemplate) => void;
  selectedTemplate?: ContentTemplate;
}

export function TemplateSelector({ onTemplateSelect, selectedTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        const { data, error } = await ContentTemplateService.getContentTemplates();
        
        if (error) {
          setError(error);
        } else if (data) {
          setTemplates(data);
        }
      } catch (err) {
        setError('Failed to load content templates');
        console.error('Error fetching templates:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'openai': return 'bg-blue-100 text-blue-800';
      case 'google': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Claude';
      case 'openai': return 'GPT-4';
      case 'google': return 'Gemini';
      default: return provider;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Content Template</h2>
          <p className="text-gray-600">
            Loading content templates...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-96"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Content Template</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load templates: {error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-2"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Content Template</h2>
        <p className="text-gray-600">
          Select the type of content you want to generate. Each template is optimized for specific SEO goals and uses the best AI provider for that content type.
        </p>
        <p className="text-sm text-blue-600 mt-2">
          {templates.length} templates available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {templates.map((template, index) => (
          <Card
            key={template.id}
            className={`p-4 md:p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 relative ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onMouseEnter={() => setHoveredTemplate(template.id)}
            onMouseLeave={() => setHoveredTemplate(null)}
            onClick={() => onTemplateSelect(template)}
          >
            <div className="flex flex-col h-full min-h-[400px]">
              {/* Template Number Badge */}
              <div className="absolute top-2 right-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {index + 1}
              </div>
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pt-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base md:text-lg">{template.name}</h3>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                      <Badge className={getDifficultyColor(template.difficulty)}>
                        {template.difficulty}
                      </Badge>
                      <Badge className={getProviderColor(template.recommendedProvider)}>
                        {getProviderName(template.recommendedProvider)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 flex-grow">
                {template.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Est. Cost:</span>
                  <p className="font-medium">${template.estimatedCost.toFixed(3)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Length:</span>
                  <p className="font-medium">{template.targetLength.toLocaleString()} words</p>
                </div>
              </div>

              {/* SEO Advantages */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">SEO Advantages:</h4>
                <div className="flex flex-wrap gap-1">
                  {template.seoAdvantages.map((advantage, index) => (
                    <span
                      key={index}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                    >
                      {advantage}
                    </span>
                  ))}
                </div>
              </div>

              {/* Example Titles (shown on hover or selection) */}
              {(hoveredTemplate === template.id || selectedTemplate?.id === template.id) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Example Titles:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {template.exampleTitles.slice(0, 2).map((title, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-1">•</span>
                        <span>{title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Selection Button */}
              {selectedTemplate?.id === template.id && (
                <div className="mt-auto pt-4">
                  <Button className="w-full" size="sm">
                    Selected ✓
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">{selectedTemplate.icon}</span>
            <div>
              <h3 className="font-semibold text-blue-900">{selectedTemplate.name} Selected</h3>
              <p className="text-sm text-blue-700">
                Ready to generate content using {getProviderName(selectedTemplate.recommendedProvider)}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">AI Provider:</span>
              <p className="text-blue-800">{getProviderName(selectedTemplate.recommendedProvider)}</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Estimated Cost:</span>
              <p className="text-blue-800">${selectedTemplate.estimatedCost.toFixed(3)}</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Target Length:</span>
              <p className="text-blue-800">{selectedTemplate.targetLength.toLocaleString()} words</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the ContentTemplate type for use in other components
export type { ContentTemplate }; 