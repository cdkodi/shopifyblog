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
    
    // Keyword density
    const keywordCount = (content.match(new RegExp(targetKeyword, 'g')) || []).length;
    const totalWords = editedContent.content.split(' ').length;
    const keywordDensity = (keywordCount / totalWords) * 100;
    
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
      keywordDensity,
      readabilityScore,
      headingsStructure,
      internalLinks,
      externalLinks
    };
  };

  const seoOptimizations = calculateSEOScore();

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
        seoScore: Math.round((seoOptimizations.keywordDensity + seoOptimizations.readabilityScore + seoOptimizations.headingsStructure) / 3),
        scheduledPublishDate: editedContent.scheduledDate || undefined
      };

      const { data: article, error } = await ArticleService.createArticle(articleData);
      
      if (error) {
        alert(`Failed to save article: ${error}`);
      } else {
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
    // Simple content formatting for display
    return content
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) {
          return `<h1 class="text-3xl font-bold mb-4">${line.substring(2)}</h1>`;
        } else if (line.startsWith('## ')) {
          return `<h2 class="text-2xl font-semibold mb-3">${line.substring(3)}</h2>`;
        } else if (line.startsWith('### ')) {
          return `<h3 class="text-xl font-medium mb-2">${line.substring(4)}</h3>`;
        } else if (line.trim() === '') {
          return '<br/>';
        } else {
          return `<p class="mb-4">${line}</p>`;
        }
      })
      .join('');
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
            SEO Score: {Math.round((seoOptimizations.keywordDensity + seoOptimizations.readabilityScore + seoOptimizations.headingsStructure) / 3)}/100
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
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={editedContent.content}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, content: e.target.value }))}
                    className="mt-1"
                    rows={20}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use markdown for formatting: # for headings, **bold**, *italic*
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
    </div>
  );
} 