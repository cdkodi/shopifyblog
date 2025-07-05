'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, ExternalLink, Upload, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface ShopifyBlog {
  id: string;
  title: string;
  handle: string;
  commentable: string;
  tags: string;
}

interface ShopifyIntegrationProps {
  articleId: string;
  articleTitle: string;
  isPublished: boolean;
  shopifyArticleId?: number | null;
  shopifyBlogId?: number | null;
  onStatusChange?: (status: 'published' | 'draft', shopifyData?: any) => void;
}

export function ShopifyIntegration({
  articleId,
  articleTitle,
  isPublished,
  shopifyArticleId,
  shopifyBlogId,
  onStatusChange
}: ShopifyIntegrationProps) {
  const [blogs, setBlogs] = useState<ShopifyBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>(shopifyBlogId?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load available blogs on component mount
  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setBlogsLoading(true);
      const response = await fetch('/api/shopify/blogs');
      const data = await response.json();

      if (data.success) {
        setBlogs(data.blogs);
        // Auto-select the first blog if none is selected
        if (!selectedBlogId && data.blogs.length > 0) {
          setSelectedBlogId(data.blogs[0].id);
        }
      } else {
        setError('Failed to load Shopify blogs');
      }
    } catch (err) {
      setError('Error loading blogs');
      console.error('Error loading blogs:', err);
    } finally {
      setBlogsLoading(false);
    }
  };

  const publishToShopify = async () => {
    if (!selectedBlogId) {
      setError('Please select a blog');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/shopify/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          blogId: selectedBlogId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Article published to Shopify successfully!');
        onStatusChange?.('published', {
          shopifyArticleId: data.shopifyArticleId,
          shopifyBlogId: data.shopifyBlogId,
        });
      } else {
        setError(data.error || 'Failed to publish article');
      }
    } catch (err) {
      setError('Error publishing article');
      console.error('Error publishing article:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateInShopify = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/shopify/articles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Article updated in Shopify successfully!');
      } else {
        setError(data.error || 'Failed to update article');
      }
    } catch (err) {
      setError('Error updating article');
      console.error('Error updating article:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFromShopify = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/shopify/articles?articleId=${articleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Article removed from Shopify successfully!');
        onStatusChange?.('draft');
      } else {
        setError(data.error || 'Failed to delete article');
      }
    } catch (err) {
      setError('Error deleting article');
      console.error('Error deleting article:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const getShopifyUrl = () => {
    if (!shopifyArticleId || !shopifyBlogId) return null;
    const storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'culturati-1279.myshopify.com';
    return `https://${storeDomain}/admin/blogs/${shopifyBlogId}/articles/${shopifyArticleId}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          Shopify Integration
        </CardTitle>
        <CardDescription>
          Publish and manage this article on your Shopify blog
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {isPublished && shopifyArticleId ? (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Published to Shopify
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="w-3 h-3 mr-1" />
              Not Published
            </Badge>
          )}
        </div>

        {/* Shopify Link */}
        {isPublished && shopifyArticleId && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Shopify URL:</span>
            <a
              href={getShopifyUrl() || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              View in Shopify Admin
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Blog Selection */}
        {!isPublished && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Blog:</label>
            {blogsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading blogs...
              </div>
            ) : blogs.length > 0 ? (
              <Select value={selectedBlogId} onValueChange={setSelectedBlogId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a blog" />
                </SelectTrigger>
                <SelectContent>
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title} ({blog.handle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-500">No blogs found</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isPublished ? (
            <Button
              onClick={publishToShopify}
              disabled={loading || !selectedBlogId}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Publish to Shopify
            </Button>
          ) : (
            <>
              <Button
                onClick={updateInShopify}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Update
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove from Shopify?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete "{articleTitle}" from your Shopify blog. The article will remain in your CMS but will no longer be published on Shopify.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteFromShopify}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remove from Shopify
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex justify-between items-start">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={clearMessages}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex justify-between items-start">
              <p className="text-sm text-green-800">{success}</p>
              <button
                onClick={clearMessages}
                className="text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Refresh Blogs Button */}
        <div className="pt-2 border-t">
          <Button
            onClick={loadBlogs}
            variant="ghost"
            size="sm"
            disabled={blogsLoading}
            className="text-xs"
          >
            {blogsLoading ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Refresh Blogs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 