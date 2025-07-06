'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeftIcon, SaveIcon, TrashIcon } from 'lucide-react';
import { ArticleService, ArticleFormData } from '@/lib/supabase/articles';
import { ProductIntegrationManager } from '@/components/articles/product-integration-manager';
import { ShopifyIntegration } from '@/components/shopify/shopify-integration';
import { TopicArticleLinks } from '@/components/articles/topic-article-links';
import type { Database } from '@/lib/types/database';

type Article = Database['public']['Tables']['articles']['Row'];

interface ArticleEditorState {
  title: string;
  content: string;
  metaDescription: string;
  slug: string;
  status: 'draft' | 'review' | 'approved' | 'published' | 'rejected';
  targetKeywords: string[];
  scheduledPublishDate: string;
  seoScore: number;
}

// Feature flag for product integration
const ENABLE_PRODUCT_INTEGRATION = false; // Set to true to re-enable

export default function ArticleEditPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [articleData, setArticleData] = useState<ArticleEditorState>({
    title: '',
    content: '',
    metaDescription: '',
    slug: '',
    status: 'draft',
    targetKeywords: [],
    scheduledPublishDate: '',
    seoScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'preview' | 'topic'>('editor');

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await ArticleService.getArticle(articleId);
      
      if (error) {
        setError(error);
      } else if (data) {
        setArticle(data);
        setArticleData({
          title: data.title,
          content: data.content,
          metaDescription: data.meta_description || '',
          slug: data.slug || '',
          status: data.status as any,
          targetKeywords: data.target_keywords ? JSON.parse(data.target_keywords as string) : [],
          scheduledPublishDate: data.scheduled_publish_date || '',
          seoScore: data.seo_score || 0
        });
      }
    } catch (err) {
      console.error('Error loading article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ArticleEditorState, value: any) => {
    setArticleData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !articleData.targetKeywords.includes(newKeyword.trim())) {
      setArticleData(prev => ({
        ...prev,
        targetKeywords: [...prev.targetKeywords, newKeyword.trim()]
      }));
      setNewKeyword('');
      setHasChanges(true);
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setArticleData(prev => ({
      ...prev,
      targetKeywords: prev.targetKeywords.filter(k => k !== keyword)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updateData: Partial<ArticleFormData> = {
        title: articleData.title,
        content: articleData.content,
        metaDescription: articleData.metaDescription,
        slug: articleData.slug,
        status: articleData.status,
        targetKeywords: articleData.targetKeywords,
        scheduledPublishDate: articleData.scheduledPublishDate || undefined,
        seoScore: articleData.seoScore
      };

      const { data, error } = await ArticleService.updateArticle(articleId, updateData);
      
      if (error) {
        alert(`Failed to save article: ${error}`);
      } else {
        setHasChanges(false);
        setArticle(data);
        alert('Article saved successfully!');
      }
    } catch (err) {
      console.error('Error saving article:', err);
      alert('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await ArticleService.deleteArticle(articleId);
      
      if (error) {
        alert(`Failed to delete article: ${error}`);
      } else {
        router.push('/articles');
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article');
    }
  };

  const generateSlug = () => {
    const slug = articleData.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    handleInputChange('slug', slug);
  };

  // Enhanced markdown formatting for better preview
  function formatInlineMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
  }

  function formatContent(content: string) {
    if (!content.trim()) {
      return '<p class="text-gray-500 italic">Start writing your article content...</p>';
    }

    return content
      .split('\n')
      .map(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
          return '<div class="h-4"></div>'; // Spacing between paragraphs
        } else if (line.startsWith('# ')) {
          return `<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">${formatInlineMarkdown(line.substring(2))}</h1>`;
        } else if (line.startsWith('## ')) {
          return `<h2 class="text-xl font-semibold text-gray-800 mb-3 mt-5 first:mt-0">${formatInlineMarkdown(line.substring(3))}</h2>`;
        } else if (line.startsWith('### ')) {
          return `<h3 class="text-lg font-medium text-gray-800 mb-2 mt-4 first:mt-0">${formatInlineMarkdown(line.substring(4))}</h3>`;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          return `<li class="mb-1 ml-4 list-disc">${formatInlineMarkdown(line.substring(2))}</li>`;
        } else if (/^\d+\.\s/.test(line)) {
          return `<li class="mb-1 ml-4 list-decimal">${formatInlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>`;
        } else {
          return `<p class="mb-4 text-gray-700 leading-relaxed">${formatInlineMarkdown(line)}</p>`;
        }
      })
      .join('');
  }

  const contentPreview = useMemo(() => formatContent(articleData.content), [articleData.content]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading article...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <p className="text-red-600">Error: {error}</p>
                <Button onClick={() => router.push('/articles')} variant="outline">
                  Back to Articles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/articles')}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Article</h1>
              {hasChanges && (
                <p className="text-sm text-orange-600 mt-1">You have unsaved changes</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2"
            >
              <SaveIcon className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              onClick={() => setDeleteDialog(true)}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Editor Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Editor</h2>
            <p className="text-gray-600 mt-1">Review, edit, and optimize your content before publishing</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800">
              SEO Score: {articleData.seoScore}/100
            </Badge>
            <Badge className="bg-blue-100 text-blue-800">
              {articleData.content.split(' ').length} words
            </Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['editor', 'topic', 'seo', 'preview'].map((tab) => (
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
                      value={articleData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Article title"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        id="slug"
                        value={articleData.slug}
                        onChange={(e) => handleInputChange('slug', e.target.value)}
                        placeholder="article-slug"
                      />
                      <Button onClick={generateSlug} variant="outline" size="sm">
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={articleData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Write your article content here..."
                      className="mt-1 font-mono text-sm"
                      rows={20}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Use markdown for formatting: # for headings, **bold**, *italic*
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Product Integration - Hidden for Launch */}
              {ENABLE_PRODUCT_INTEGRATION && (
                <ProductIntegrationManager
                  articleId={articleId}
                  articleTitle={articleData.title}
                  articleContent={articleData.content}
                  onUpdate={() => {
                    // Optionally refresh article data or show notification
                    console.log('Product suggestions updated');
                  }}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status & Publishing */}
              <Card>
                <CardHeader>
                  <CardTitle>Publishing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={articleData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduled">Scheduled Date</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={articleData.scheduledPublishDate}
                      onChange={(e) => handleInputChange('scheduledPublishDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <Textarea
                      id="metaDescription"
                      value={articleData.metaDescription}
                      onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                      placeholder="Article meta description"
                      rows={3}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {articleData.metaDescription.length}/160 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle>Target Keywords</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add keyword"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    />
                    <Button onClick={handleAddKeyword} size="sm">Add</Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {articleData.targetKeywords.map((keyword, index) => (
                      <div
                        key={index}
                        className="cursor-pointer"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        <Badge variant="secondary">
                          {keyword} ×
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Content Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Word Count:</span>
                      <span className="font-medium">{articleData.content.split(' ').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Characters:</span>
                      <span className="font-medium">{articleData.content.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reading Time:</span>
                      <span className="font-medium">{Math.ceil(articleData.content.split(' ').length / 200)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Headings:</span>
                      <span className="font-medium">{(articleData.content.match(/^#+\s/gm) || []).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shopify Integration */}
              <ShopifyIntegration
                articleId={articleId}
                articleTitle={articleData.title}
                isPublished={articleData.status === 'published' && !!article?.shopify_article_id}
                shopifyArticleId={article?.shopify_article_id}
                shopifyBlogId={article?.shopify_blog_id}
                onStatusChange={(status, shopifyData) => {
                  if (shopifyData) {
                    // Update article with Shopify data
                    setArticle(prev => prev ? {
                      ...prev,
                      shopify_article_id: shopifyData.shopifyArticleId,
                      shopify_blog_id: shopifyData.shopifyBlogId
                    } : prev);
                  }
                  // Update status
                  setArticleData(prev => ({ ...prev, status }));
                  setHasChanges(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Topic Tab */}
        {activeTab === 'topic' && (
          <div className="space-y-6">
            <TopicArticleLinks 
              articleId={articleId}
              showNavigation={true}
            />
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
                      <span className="font-medium">2.2%</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Needs work
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Readability Score:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">58/100</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Needs work
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Headings Structure:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">80/100</span>
                      <Badge className="bg-green-100 text-green-800">
                        Good
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>SEO Score:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{articleData.seoScore}/100</span>
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={articleData.seoScore}
                        onChange={(e) => handleInputChange('seoScore', parseInt(e.target.value))}
                        className="w-24 h-2"
                      />
                    </div>
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">Consider improving keyword density to 1-2%</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">Consider adding internal links to related content</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">Good heading structure for SEO</p>
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
              <div className="border rounded-md bg-white p-6 min-h-[500px] max-h-[700px] overflow-auto shadow-sm">
                {/* Title Preview */}
                <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
                  {articleData.title || 'Untitled Article'}
                </h1>
                
                {/* Content Preview */}
                <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm">
                  <div dangerouslySetInnerHTML={{ __html: contentPreview }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{articleData.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 