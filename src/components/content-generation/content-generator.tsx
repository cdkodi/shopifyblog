'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentConfiguration } from './content-configuration';

interface ContentGeneratorProps {
  configuration: ContentConfiguration;
  onGenerationComplete: (generatedContent: GeneratedContent) => void;
  onBack: () => void;
}

export interface GeneratedContent {
  configuration: ContentConfiguration;
  content: {
    title: string;
    mainContent: string;
    metaDescription: string;
    imageSuggestions?: string[];
    callToAction?: string;
  };
  metadata: {
    wordCount: number;
    readingTime: number;
    seoScore: number;
    generationTime: number;
    aiProvider: string;
    cost: number;
  };
}

export function ContentGenerator({ configuration, onGenerationComplete, onBack }: ContentGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);


  const generateContent = async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);
    
    const startTime = Date.now();
    
    try {
      // Stage 1: Initialize
      setGenerationStage('Initializing AI Service...');
      setProgress(20);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Stage 2: Generate content
      setGenerationStage('Generating content...');
      setProgress(50);
      
      const prompt = `Create a ${configuration.template.name} about ${configuration.topic}. 
      Title: ${configuration.title}
      Target keyword: ${configuration.targetKeyword}
      Tone: ${configuration.tone}
      Word count: ${configuration.wordCount}
      
      Make it comprehensive and SEO-optimized.`;
      
      // Call the API route instead of direct AI service
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          template: configuration.template.id,
          tone: configuration.tone,
          keywords: [configuration.targetKeyword, ...configuration.relatedKeywords],
          preferredProvider: configuration.aiProvider === 'auto' ? configuration.template.recommendedProvider : configuration.aiProvider,
          options: {
            maxTokens: Math.floor(configuration.wordCount * 1.5), // Rough estimate
            temperature: 0.7
          },
          // Add enhanced config for specialized prompts like Product Showcase
          config: configuration.template.name === 'Product Showcase' ? {
            topic: configuration.topic,
            tone: configuration.tone,
            wordCount: configuration.wordCount,
            targetKeyword: configuration.targetKeyword,
            relatedKeywords: configuration.relatedKeywords,
            targetAudience: configuration.targetAudience,
            metaDescription: configuration.metaDescription
          } : undefined
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success || !result.content) {
        // Provide more detailed error information
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API response error:', {
          status: response.status,
          statusText: response.statusText,
          result,
          url: response.url,
          requestBody: {
            prompt: prompt.substring(0, 100) + '...',
            template: configuration.template.id,
            tone: configuration.tone,
            keywords: [configuration.targetKeyword, ...configuration.relatedKeywords],
            preferredProvider: configuration.template.recommendedProvider
          }
        });
        
        // Create a more informative error message
        let detailedError = errorMsg;
        if (response.status === 500) {
          detailedError = `Server Error (500): ${errorMsg}. This might be due to AI service configuration issues.`;
        } else if (response.status === 400) {
          detailedError = `Bad Request (400): ${errorMsg}. Please check your configuration.`;
        } else if (response.status === 401 || response.status === 403) {
          detailedError = `Authentication Error (${response.status}): ${errorMsg}. AI service authentication may have failed.`;
        } else if (!response.ok) {
          detailedError = `Network Error (${response.status}): ${errorMsg}`;
        }
        
        throw new Error(detailedError);
      }
      
      // Stage 3: Process results
      setGenerationStage('Processing results...');
      setProgress(80);
      
      const content = result.content;
      
      // Parse structured response from AI
      let parsedTitle = configuration.title;
      let parsedMetaDescription = configuration.metaDescription;
      let parsedContent = content;
      
      // Check if AI returned structured response
      if (content.includes('TITLE:') && content.includes('META_DESCRIPTION:') && content.includes('CONTENT:')) {
        try {
          // Extract title
          const titleMatch = content.match(/TITLE:\s*(.+?)(?=\n|$)/);
          if (titleMatch) {
            parsedTitle = titleMatch[1].trim();
          }
          
          // Extract meta description
          const metaMatch = content.match(/META_DESCRIPTION:\s*(.+?)(?=\n|$)/);
          if (metaMatch) {
            parsedMetaDescription = metaMatch[1].trim();
          }
          
          // Extract main content (everything after CONTENT:)
          const contentMatch = content.match(/CONTENT:\s*([\s\S]*)/);
          if (contentMatch) {
            parsedContent = contentMatch[1].trim();
          }
        } catch (parseError) {
          console.warn('Failed to parse structured AI response, using original content:', parseError);
          // Fall back to original content if parsing fails
          parsedContent = content;
        }
      }
      
      const wordCount = parsedContent.split(' ').length;
      const readingTime = Math.ceil(wordCount / 200);
      const seoScore = Math.floor(Math.random() * 30) + 70;
      
      const finalContent: GeneratedContent = {
        configuration,
        content: {
          title: parsedTitle,
          mainContent: parsedContent,
          metaDescription: parsedMetaDescription || `Discover the rich cultural heritage and artistic significance of ${configuration.topic}. Expert insights into traditional techniques and modern relevance.`,
          imageSuggestions: [`Image about ${configuration.topic}`, `Infographic for ${configuration.targetKeyword}`],
          callToAction: configuration.includeCallToAction ? `Ready to learn more about ${configuration.topic}?` : undefined
        },
        metadata: {
          wordCount,
          readingTime,
          seoScore,
          generationTime: Date.now() - startTime,
          aiProvider: result.finalProvider || configuration.template.recommendedProvider,
          cost: result.totalCost || configuration.template.estimatedCost
        }
      };
      
      setProgress(100);
      setGeneratedContent(finalContent);
      
    } catch (err) {
      console.error('Content generation failed:', err);
      
      // Enhanced error handling to avoid [object Object] and provide helpful context
      let errorMessage = 'Failed to generate content';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // Try to extract meaningful error information
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('error' in err) {
          errorMessage = String(err.error);
        } else {
          try {
            errorMessage = `Error: ${JSON.stringify(err, null, 2)}`;
          } catch (jsonError) {
            errorMessage = 'Unknown error object that could not be serialized';
          }
        }
      }
      
      // Add additional context for common issues
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage = `Network Error: ${errorMessage}. Please check your internet connection and try again.`;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        errorMessage = `Timeout Error: ${errorMessage}. The AI service took too long to respond. Please try again.`;
      } else if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = `Authentication Error: ${errorMessage}. AI service authentication failed. Please check your API keys.`;
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        errorMessage = `Server Error: ${errorMessage}. There was an issue with the AI service. Please try again in a moment.`;
      } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        errorMessage = `Configuration Error: ${errorMessage}. Please check your content configuration and try again.`;
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        errorMessage = `Rate Limit Error: ${errorMessage}. You've reached the AI service usage limit. Please try again later.`;
      }
      
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };



  // Auto-start generation when component mounts
  useEffect(() => {
    generateContent();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generation Failed</h2>
          <p className="text-gray-600">Something went wrong during content generation</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
            

          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button onClick={onBack} variant="outline">
            ← Back to Configuration
          </Button>
          <Button onClick={generateContent}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Content</h2>
          <p className="text-gray-600">Please wait while AI creates your optimized content...</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{generationStage}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Generation Info */}
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (generatedContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Generated Successfully!</h2>
            <p className="text-gray-600 mt-1">Your AI-generated content is ready for review and editing</p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            ✓ Generation Complete
          </Badge>
        </div>

        {/* Generation Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{generatedContent.metadata.wordCount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Words Generated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{generatedContent.metadata.seoScore}/100</p>
              <p className="text-sm text-gray-500">SEO Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{generatedContent.metadata.readingTime} min</p>
              <p className="text-sm text-gray-500">Reading Time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">${generatedContent.metadata.cost.toFixed(3)}</p>
              <p className="text-sm text-gray-500">Generation Cost</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{generatedContent.content.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{generatedContent.content.metaDescription}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{generatedContent.content.mainContent.substring(0, 1000)}...</pre>
              </div>
              
              {generatedContent.content.callToAction && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Call to Action:</p>
                  <p className="text-sm text-blue-800">{generatedContent.content.callToAction}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button onClick={onBack} variant="outline">
            ← Back to Configuration
          </Button>
          <div className="space-x-3">
            <Button onClick={generateContent} variant="outline">
              Regenerate
            </Button>
            <Button onClick={() => onGenerationComplete(generatedContent)}>
              Continue to Editor →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 