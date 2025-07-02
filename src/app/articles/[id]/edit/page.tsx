'use client';

import { useState, useEffect } from 'react';
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

        {/* Article Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
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
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={articleData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Write your article content here..."
                    rows={20}
                    className="font-mono text-sm"
                  />
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
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={articleData.metaDescription}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    placeholder="Article meta description"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex space-x-2">
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
                  <Label>SEO Score</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="text-lg font-semibold">{articleData.seoScore}/100</div>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={articleData.seoScore}
                      onChange={(e) => handleInputChange('seoScore', parseInt(e.target.value))}
                      className="flex-1"
                    />
                  </div>
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
          </div>
        </div>

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