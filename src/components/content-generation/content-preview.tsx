'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductForContentGeneration } from '@/lib/supabase/shopify-products';
import { EnhancedContentConfig } from './generation-config';

interface ContentPreviewProps {
  config: Partial<EnhancedContentConfig>;
  selectedProducts: ProductForContentGeneration[];
  isDevMode?: boolean;
}

export function ContentPreview({ config, selectedProducts, isDevMode = true }: ContentPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'structure' | 'sample'>('structure');

  // Generate content structure preview
  const contentStructure = useMemo(() => {
    if (!config.topic || !config.wordCount) return null;

    const sections = [];
    const wordCount = config.wordCount || 1000;
    const wordsPerProduct = config.productIntegration?.wordsPerProduct || 300;
    const maxProducts = Math.min(
      selectedProducts.length,
      config.productIntegration?.maxProducts || 3
    );

    // Introduction section
    sections.push({
      title: 'Introduction',
      words: Math.round(wordCount * 0.15),
      type: 'content'
    });

    // Main content sections with product integration
    if (config.includeProducts && selectedProducts.length > 0) {
      const mainContentWords = wordCount - Math.round(wordCount * 0.25); // Reserve for intro/conclusion
      const sectionsWithProducts = Math.min(maxProducts, Math.floor(mainContentWords / wordsPerProduct));
      const wordsPerSection = Math.floor(mainContentWords / (sectionsWithProducts + 1));

      for (let i = 0; i < sectionsWithProducts; i++) {
        // Content section
        sections.push({
          title: `${config.topic} - Part ${i + 1}`,
          words: wordsPerSection,
          type: 'content'
        });

        // Product integration
        if (selectedProducts[i]) {
          sections.push({
            title: `Featured: ${selectedProducts[i].title}`,
            words: Math.round(wordsPerProduct * 0.3), // Product mentions are brief
            type: 'product',
            product: selectedProducts[i],
            integrationStyle: config.productIntegration?.integrationStyle || 'contextual'
          });
        }
      }

      // Remaining content
      if (sectionsWithProducts > 0) {
        sections.push({
          title: `${config.topic} - Advanced Techniques`,
          words: wordsPerSection,
          type: 'content'
        });
      }
    } else {
      // Regular content sections without products
      const sectionCount = Math.max(3, Math.floor(wordCount / 400));
      const wordsPerSection = Math.floor((wordCount * 0.85) / sectionCount);

      for (let i = 0; i < sectionCount; i++) {
        sections.push({
          title: `${config.topic} - Section ${i + 1}`,
          words: wordsPerSection,
          type: 'content'
        });
      }
    }

    // Conclusion
    sections.push({
      title: 'Conclusion',
      words: Math.round(wordCount * 0.1),
      type: 'content'
    });

    return sections;
  }, [config, selectedProducts]);

  // Generate sample content preview
  const sampleContent = useMemo(() => {
    if (!config.topic) return '';

    const topic = config.topic;
    const tone = config.tone || 'professional';
    
    // Generate sample based on topic and tone
    let sample = '';
    
    if (topic.toLowerCase().includes('madhubani')) {
      sample = generateMadhubanSample(tone);
    } else if (topic.toLowerCase().includes('pichwai')) {
      sample = generatePichwaiSample(tone);
    } else if (topic.toLowerCase().includes('kerala')) {
      sample = generateKeralaSample(tone);
    } else if (topic.toLowerCase().includes('home') || topic.toLowerCase().includes('decor')) {
      sample = generateHomeDecorSample(tone);
    } else {
      sample = generateGenericSample(topic, tone);
    }

    // Add product integration examples
    if (config.includeProducts && selectedProducts.length > 0) {
      sample += generateProductIntegrationExample(selectedProducts[0], config.productIntegration?.integrationStyle || 'contextual');
    }

    return sample;
  }, [config, selectedProducts]);

  const estimatedReadingTime = Math.ceil((config.wordCount || 0) / 200);

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Content Preview</h3>
        <div className="flex space-x-2">
          <Button
            variant={previewMode === 'structure' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('structure')}
          >
            Structure
          </Button>
          <Button
            variant={previewMode === 'sample' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('sample')}
          >
            Sample
          </Button>
        </div>
      </div>

      {/* Content Metrics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{config.wordCount || 0}</p>
              <p className="text-sm text-gray-500">Target Words</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{estimatedReadingTime}</p>
              <p className="text-sm text-gray-500">Min Read</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{selectedProducts.length}</p>
              <p className="text-sm text-gray-500">Products</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{contentStructure?.length || 0}</p>
              <p className="text-sm text-gray-500">Sections</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Content */}
      {previewMode === 'structure' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Structure</CardTitle>
          </CardHeader>
          <CardContent>
            {contentStructure ? (
              <div className="space-y-3">
                {contentStructure.map((section, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      section.type === 'product' 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`
                          w-2 h-2 rounded-full 
                          ${section.type === 'product' ? 'bg-blue-500' : 'bg-gray-500'}
                        `} />
                        <h4 className="font-medium text-sm">{section.title}</h4>
                        {section.type === 'product' && (
                          <Badge variant="outline" className="text-xs">
                            {section.integrationStyle}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">~{section.words} words</span>
                    </div>
                    
                    {section.type === 'product' && section.product && (
                      <div className="mt-2 pl-4 border-l-2 border-blue-300">
                        <p className="text-xs text-gray-600">
                          Product: {section.product.title}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {section.product.collections.slice(0, 2).map(collection => (
                            <Badge key={collection} variant="outline" className="text-xs">
                              {collection}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Configure your content settings to see the structure preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sample Content</CardTitle>
          </CardHeader>
          <CardContent>
            {sampleContent ? (
              <div className="prose prose-sm max-w-none">
                <div 
                  className="text-gray-700 leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: sampleContent }}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Configure your content topic to see a sample preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEO Preview */}
      {config.topic && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-blue-600 text-lg hover:underline cursor-pointer">
                  {config.title || `Complete Guide to ${config.topic}`}
                </h4>
                <p className="text-green-600 text-sm">
                  https://culturati.in/blogs/news/{(config.topic || '').toLowerCase().replace(/\s+/g, '-')}
                </p>
                <p className="text-gray-600 text-sm">
                  {config.metaDescription || `Learn about ${config.topic}. Expert insights, techniques, and cultural significance. ${config.includeProducts ? 'Featuring authentic traditional products from Culturati.' : ''}`}
                </p>
              </div>
              
              {config.targetKeyword && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Target Keyword:</span> {config.targetKeyword}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dev Mode Indicator */}
      {isDevMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            🛠️ <span className="font-medium">Preview Mode:</span> This is a sample preview. 
            Actual content will be generated using AI with real product data.
          </p>
        </div>
      )}
    </div>
  );
}

// Sample content generators
function generateMadhubanSample(tone: string): string {
  const intro = tone === 'casual' 
    ? "Hey art lovers! Let's dive into the amazing world of Madhubani art..."
    : "Madhubani art, originating from the Bihar region of India, represents one of the most vibrant and culturally significant folk art traditions...";

  return `${intro}

This ancient art form, traditionally practiced by women in the Mithila region, showcases intricate geometric patterns, vibrant colors, and mythological themes. The distinctive style uses natural pigments and depicts scenes from Hindu epics, nature, and daily life.

<strong>Key Characteristics:</strong>
• Bold, geometric patterns and motifs
• Natural pigments derived from plants and minerals
• Themes from Hindu mythology and nature
• Traditional techniques passed down through generations

The art form gained international recognition in the 1960s and continues to be a vital part of India's cultural heritage...`;
}

function generatePichwaiSample(tone: string): string {
  const intro = tone === 'casual'
    ? "Get ready to be amazed by Pichwai art - it's absolutely stunning!"
    : "Pichwai paintings represent an exquisite tradition of devotional art from Rajasthan, specifically created to adorn temples dedicated to Lord Krishna.";

  return `${intro}

These intricate paintings traditionally serve as backdrops in Krishna temples, depicting various episodes from the deity's life. The word 'Pichwai' comes from 'pich' (back) and 'wai' (hanging), literally meaning 'that which hangs from the back.'

<strong>Artistic Elements:</strong>
• Rich, vibrant colors with gold leaf detailing
• Intricate patterns and motifs
• Devotional themes centered around Krishna
• Large-scale compositions designed for temple walls

Master artisans spend months creating these masterpieces, using traditional techniques that have remained unchanged for centuries...`;
}

function generateKeralaSample(tone: string): string {
  const intro = tone === 'casual'
    ? "Kerala mural art is like stepping into a ancient temple - it's magical!"
    : "Kerala mural painting stands as one of India's most sophisticated and spiritually significant art forms, adorning temple walls across the state.";

  return `${intro}

Dating back to the 7th-8th centuries, these murals showcase a unique blend of indigenous and classical traditions. The paintings typically depict Hindu deities, scenes from epics, and celestial beings, executed with remarkable precision and devotional fervor.

<strong>Distinctive Features:</strong>
• Distinctive color palette of ochre, red, yellow, and blue
• Elaborate facial expressions and hand gestures
• Mythological narratives and divine themes
• Traditional preparation methods using natural pigments

The art form requires years of training and deep understanding of Hindu iconography...`;
}

function generateHomeDecorSample(tone: string): string {
  const intro = tone === 'casual'
    ? "Ready to transform your space with stunning Indian home decor? Let's explore!"
    : "Traditional Indian home decor elements bring timeless elegance and cultural richness to contemporary living spaces.";

  return `${intro}

Indian home decor seamlessly blends functionality with spiritual significance, creating spaces that are both beautiful and meaningful. From intricate brass artifacts to handwoven textiles, each element tells a story of India's rich cultural heritage.

<strong>Essential Elements:</strong>
• Brass and copper artifacts for spiritual ambiance
• Handwoven textiles and fabrics
• Traditional wall hangings and art pieces
• Natural materials and earthy color palettes

The key to authentic Indian decor lies in understanding the cultural significance behind each piece...`;
}

function generateGenericSample(topic: string, tone: string): string {
  const intro = tone === 'casual'
    ? `Let's explore the fascinating world of ${topic} together!`
    : `Understanding ${topic} requires a deep appreciation for its cultural significance and artistic value.`;

  return `${intro}

This comprehensive guide will take you through the essential aspects of ${topic}, exploring its historical background, cultural importance, and contemporary relevance. Whether you're a beginner or an enthusiast, this article provides valuable insights and practical knowledge.

<strong>What You'll Discover:</strong>
• Historical origins and cultural context
• Key characteristics and unique features  
• Traditional techniques and modern adaptations
• Practical applications and significance

Join us as we delve into the rich tapestry of ${topic} and discover why it continues to captivate audiences worldwide...`;
}

function generateProductIntegrationExample(product: ProductForContentGeneration, style: string): string {
  switch (style) {
    case 'showcase':
      return `

<div style="border: 1px solid #e5e7eb; padding: 16px; margin: 16px 0; border-radius: 8px; background: #f9fafb;">
<strong>Featured Product: ${product.title}</strong>
<p style="margin: 8px 0; color: #6b7280;">${product.description}</p>
<p style="margin: 0; color: #3b82f6; font-size: 14px;">View at Culturati →</p>
</div>`;

    case 'subtle':
      return `\n\nFor those interested in authentic pieces, consider exploring ${product.title} and similar traditional artworks that embody these techniques.`;

    case 'contextual':
    default:
      return `\n\nA perfect example of this artistry can be seen in pieces like the <a href="#" style="color: #3b82f6;">${product.title}</a>, which showcases the intricate details and cultural significance we've discussed. ${product.description.split('.')[0]}.`;
  }
} 