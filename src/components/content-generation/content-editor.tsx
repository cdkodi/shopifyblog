'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GeneratedContent } from './content-generator';
import { blogIntegration } from '@/lib/publishing/blog-integration';
import { ArticleService } from '@/lib/supabase/articles';
import { supabase } from '@/lib/supabase';
import { ImageBrowser } from './image-browser';
import { Image } from 'lucide-react';

interface ContentEditorProps {
  generatedContent: GeneratedContent;
  onPublish: (publishedContent: PublishedContent) => void;
  onBack: () => void;
}

export interface PublishedContent {
  generatedContent: GeneratedContent;
  editedContent: {
    title: string;
    content: string;
    metaDescription: string;
    slug: string;
    tags: string[];
    featuredImage?: string;
    scheduledDate?: string;
  };
  seoOptimizations: {
    keywordDensity: number;
    readabilityScore: number;
    headingsStructure: number;
    internalLinks: number;
    externalLinks: number;
  };
}

export function ContentEditor({ generatedContent, onPublish, onBack }: ContentEditorProps) {
  const [editedContent, setEditedContent] = useState({
    title: generatedContent.content.title,
    content: generatedContent.content.mainContent,
    metaDescription: generatedContent.content.metaDescription,
    slug: generateSlug(generatedContent.content.title),
    tags: extractTags(generatedContent.configuration),
    featuredImage: '',
    scheduledDate: ''
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'preview'>('editor');
  const [seoSuggestions, setSeoSuggestions] = useState<string[]>([]);
  const [isImageBrowserOpen, setIsImageBrowserOpen] = useState(false);

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function extractTags(config: any): string[] {
    const tags = [config.topic];
    if (config.relatedKeywords) {
      tags.push(...config.relatedKeywords.slice(0, 3));
    }
    return tags;
  }

  const calculateSEOScore = () => {
    const content = editedContent.content.toLowerCase();
    const targetKeyword = generatedContent.configuration.targetKeyword.toLowerCase();
    
    // Keyword density calculation
    const keywordCount = (content.match(new RegExp(targetKeyword, 'g')) || []).length;
    const totalWords = editedContent.content.split(' ').length;
    const keywordDensityPercentage = (keywordCount / totalWords) * 100;
    
    // Convert keyword density to SEO score (1-2% is optimal = 100 points)
    let keywordDensityScore = 0;
    if (keywordDensityPercentage >= 1 && keywordDensityPercentage <= 2) {
      keywordDensityScore = 100; // Optimal range
    } else if (keywordDensityPercentage >= 0.5 && keywordDensityPercentage < 1) {
      keywordDensityScore = 60 + (keywordDensityPercentage - 0.5) * 80; // 60-100 scale
    } else if (keywordDensityPercentage > 2 && keywordDensityPercentage <= 3) {
      keywordDensityScore = 100 - ((keywordDensityPercentage - 2) * 50); // 100-50 scale
    } else if (keywordDensityPercentage > 3) {
      keywordDensityScore = Math.max(0, 50 - ((keywordDensityPercentage - 3) * 25)); // Penalize over-optimization
    } else {
      keywordDensityScore = keywordDensityPercentage * 120; // Under 0.5% gets proportional score
    }
    
    // Readability (simplified)
    const avgWordsPerSentence = totalWords / (editedContent.content.split(/[.!?]+/).length || 1);
    const readabilityScore = Math.max(0, 100 - (avgWordsPerSentence * 2));
    
    // Headings structure
    const headingsCount = (editedContent.content.match(/^#+\s/gm) || []).length;
    const headingsStructure = Math.min(100, headingsCount * 20);
    
    // Links (mock data)
    const internalLinks = (editedContent.content.match(/\[.*?\]\(\/.*?\)/g) || []).length;
    const externalLinks = (editedContent.content.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length;

    return {
      keywordDensity: keywordDensityPercentage, // Keep original percentage for display
      keywordDensityScore, // New: actual SEO score for keyword density
      readabilityScore,
      headingsStructure,
      internalLinks,
      externalLinks
    };
  };

  const seoOptimizations = calculateSEOScore();

  const handleImageSelect = (imageUrl: string, alt: string) => {
    const imageMarkdown = `![${alt}](${imageUrl})`;
    setEditedContent(prev => ({ 
      ...prev, 
      content: prev.content + '\n\n' + imageMarkdown 
    }));
  };

  const handlePublish = () => {
    const publishedContent: PublishedContent = {
      generatedContent,
      editedContent,
      seoOptimizations
    };
    onPublish(publishedContent);
  };

  const handleSaveDraft = async () => {
    const publishedContent: PublishedContent = {
      generatedContent,
      editedContent,
      seoOptimizations
    };
    
    const result = await blogIntegration.saveAsDraft(publishedContent);
    if (result.success) {
      alert('Draft saved successfully!');
    } else {
      alert(`Failed to save draft: ${result.error}`);
    }
  };

  const handleSaveToArticles = async () => {
    try {
      const articleData = {
        title: editedContent.title,
        content: editedContent.content,
        metaDescription: editedContent.metaDescription,
        slug: editedContent.slug,
        status: 'draft' as const,
        targetKeywords: editedContent.tags,
        seoScore: Math.round((seoOptimizations.keywordDensityScore + seoOptimizations.readabilityScore + seoOptimizations.headingsStructure) / 3),
        scheduledPublishDate: editedContent.scheduledDate || undefined,
        sourceTopicId: generatedContent.configuration.topicId
      };

      const { data: article, error } = await ArticleService.createArticle(articleData);
      
      if (error) {
        alert(`Failed to save article: ${error}`);
      } else {
        // Update the topic's used_at timestamp if it came from a topic
        if (generatedContent.configuration.topicId) {
          try {
            await supabase
              .from('topics')
              .update({ 
                used_at: new Date().toISOString(),
                status: 'generated'
              })
              .eq('id', generatedContent.configuration.topicId);
          } catch (topicError) {
            console.error('Failed to update topic status:', topicError);
            // Don't fail the article creation if topic update fails
          }
        }
        
        alert('Article saved to database successfully!');
      }
    } catch (err) {
      console.error('Error saving article:', err);
      alert('Failed to save article to database');
    }
  };

  const handleExport = async () => {
    const publishedContent: PublishedContent = {
      generatedContent,
      editedContent,
      seoOptimizations
    };
    
    const files = await blogIntegration.exportAsFiles(publishedContent);
    
    // Create and download markdown file
    const blob = new Blob([files.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedContent.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatContent = (content: string) => {
    // Enhanced content formatting for display with markdown support
    return content
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) {
          return `<h1 class="text-3xl font-bold mb-4">${formatInlineMarkdown(line.substring(2))}</h1>`;
        } else if (line.startsWith('## ')) {
          return `<h2 class="text-2xl font-semibold mb-3">${formatInlineMarkdown(line.substring(3))}</h2>`;
        } else if (line.startsWith('### ')) {
          return `<h3 class="text-xl font-medium mb-2">${formatInlineMarkdown(line.substring(4))}</h3>`;
        } else if (line.trim() === '') {
          return '<br/>';
        } else {
          return `<p class="mb-4">${formatInlineMarkdown(line)}</p>`;
        }
      })
      .join('');
  };

  const formatInlineMarkdown = (text: string) => {
    // Convert markdown formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold: **text** -> <strong>text</strong>
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic: *text* -> <em>text</em>
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>') // Inline code
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>'); // Links
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Editor</h2>
          <p className="text-gray-600 mt-1">Review, edit, and optimize your content before publishing</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800">
            SEO Score: {Math.round((seoOptimizations.keywordDensityScore + seoOptimizations.readabilityScore + seoOptimizations.headingsStructure) / 3)}/100
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">
            {editedContent.content.split(' ').length} words
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['editor', 'seo', 'preview'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedContent.title}
                    onChange={(e) => setEditedContent(prev => ({ 
                      ...prev, 
                      title: e.target.value,
                      slug: generateSlug(e.target.value)
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={editedContent.slug}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, slug: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Content</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImageBrowserOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Image className="w-4 h-4" />
                      Add Image
                    </Button>
                  </div>
                  <Textarea
                    id="content"
                    value={editedContent.content}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, content: e.target.value }))}
                    className="mt-1"
                    rows={20}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use markdown for formatting: # for headings, **bold**, *italic*. Images: ![alt text](url)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publishing Options */}
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={editedContent.metaDescription}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, metaDescription: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {editedContent.metaDescription.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={editedContent.tags.join(', ')}
                    onChange={(e) => setEditedContent(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                    }))}
                    className="mt-1"
                    placeholder="Enter tags separated by commas"
                  />
                </div>

                <div>
                  <Label htmlFor="featuredImage">Featured Image URL</Label>
                  <Input
                    id="featuredImage"
                    value={editedContent.featuredImage}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, featuredImage: e.target.value }))}
                    className="mt-1"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Schedule Publishing</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={editedContent.scheduledDate}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Content Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Word Count:</span>
                    <span className="font-medium">{editedContent.content.split(' ').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Characters:</span>
                    <span className="font-medium">{editedContent.content.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reading Time:</span>
                    <span className="font-medium">{Math.ceil(editedContent.content.split(' ').length / 200)} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Headings:</span>
                    <span className="font-medium">{(editedContent.content.match(/^#+\s/gm) || []).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Keyword Density:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{seoOptimizations.keywordDensity.toFixed(1)}%</span>
                    <Badge className={
                      seoOptimizations.keywordDensity >= 1 && seoOptimizations.keywordDensity <= 2 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {seoOptimizations.keywordDensity >= 1 && seoOptimizations.keywordDensity <= 2 ? 'Good' : 'Needs work'}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Readability Score:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{Math.round(seoOptimizations.readabilityScore)}/100</span>
                    <Badge className={
                      seoOptimizations.readabilityScore >= 70 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {seoOptimizations.readabilityScore >= 70 ? 'Good' : 'Needs work'}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Headings Structure:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{Math.round(seoOptimizations.headingsStructure)}/100</span>
                    <Badge className={
                      seoOptimizations.headingsStructure >= 60 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {seoOptimizations.headingsStructure >= 60 ? 'Good' : 'Add more headings'}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Internal Links:</span>
                  <span className="font-medium">{seoOptimizations.internalLinks}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>External Links:</span>
                  <span className="font-medium">{seoOptimizations.externalLinks}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seoOptimizations.keywordDensity < 1 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">Consider increasing keyword density to 1-2%</p>
                  </div>
                )}
                {seoOptimizations.headingsStructure < 60 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">Add more headings to improve content structure</p>
                  </div>
                )}
                {seoOptimizations.internalLinks === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">Consider adding internal links to related content</p>
                  </div>
                )}
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">Your content is well-optimized for: {generatedContent.configuration.targetKeyword}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: formatContent(editedContent.content) }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline">
          ← Back to Generation
        </Button>
        <div className="space-x-3">
          <Button onClick={handleSaveToArticles} className="bg-blue-600 text-white hover:bg-blue-700 px-6">
            💾 Save to Articles
          </Button>
          <Button onClick={handleSaveDraft} variant="outline">
            💾 Save Draft
          </Button>
          <Button onClick={handleExport} variant="outline">
            📥 Export Files
          </Button>
        </div>
      </div>

      {/* Image Browser */}
      <ImageBrowser
        isOpen={isImageBrowserOpen}
        onClose={() => setIsImageBrowserOpen(false)}
        onImageSelect={handleImageSelect}
        articleTitle={editedContent.title}
        articleContent={editedContent.content}
        articleTags={editedContent.tags}
      />
    </div>
  );
} 