'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  Upload, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Globe,
  Clock
} from 'lucide-react';

interface ShopifyBlog {
  id: string;
  numericId: number;
  title: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
}

interface ShopifyIntegrationProps {
  articleId: string;
  articleTitle: string;
  articleStatus: string;
  shopifyArticleId?: number | null;
  shopifyBlogId?: number | null;
  onStatusChange?: () => void;
}

export function ShopifyIntegration({ 
  articleId, 
  articleTitle, 
  articleStatus,
  shopifyArticleId,
  shopifyBlogId,
  onStatusChange 
}: ShopifyIntegrationProps) {
  const [blogs, setBlogs] = useState<ShopifyBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check if article is published to Shopify
  const isPublished = !!shopifyArticleId;
  
  // Load blogs on component mount
  useEffect(() => {
    loadBlogs();
  }, []);

  // Set default blog if article is already published
  useEffect(() => {
    if (shopifyBlogId && blogs.length > 0) {
      const blog = blogs.find(b => b.numericId === shopifyBlogId);
      if (blog) {
        setSelectedBlogId(blog.id);
      }
    }
  }, [shopifyBlogId, blogs]);

  const loadBlogs = async () => {
    setBlogsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/shopify/blogs');
      const data = await response.json();
      
      if (data.success) {
        setBlogs(data.blogs);
        setIsConfigured(true);
        
        // Auto-select first blog if none selected
        if (data.blogs.length > 0 && !selectedBlogId) {
          setSelectedBlogId(data.blogs[0].id);
        }
      } else {
        setError(data.error || 'Failed to load blogs');
        setIsConfigured(false);
      }
    } catch (err) {
      setError('Network error loading blogs');
      setIsConfigured(false);
    } finally {
      setBlogsLoading(false);
    }
  };

  const publishToShopify = async () => {
    if (!selectedBlogId) {
      setError('Please select a blog first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/shopify/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          blogId: selectedBlogId,
          published: articleStatus === 'published'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Article published to Shopify successfully!');
        onStatusChange?.();
      } else {
        setError(data.error || 'Failed to publish article');
      }
    } catch (err) {
      setError('Network error publishing article');
    } finally {
      setLoading(false);
    }
  };

  const updateInShopify = async () => {
    if (!selectedBlogId) {
      setError('Please select a blog first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/shopify/articles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          blogId: selectedBlogId,
          published: articleStatus === 'published'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Article updated in Shopify successfully!');
        onStatusChange?.();
      } else {
        setError(data.error || 'Failed to update article');
      }
    } catch (err) {
      setError('Network error updating article');
    } finally {
      setLoading(false);
    }
  };

  const deleteFromShopify = async () => {
    if (!confirm('Are you sure you want to delete this article from Shopify?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/shopify/articles?articleId=${articleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Article deleted from Shopify successfully!');
        onStatusChange?.();
      } else {
        setError(data.error || 'Failed to delete article');
      }
    } catch (err) {
      setError('Network error deleting article');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // If Shopify is not configured, show setup message
  if (!isConfigured && !blogsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Shopify Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Shopify integration is not configured. Please check your environment variables:
              <ul className="mt-2 list-disc list-inside text-sm">
                <li>SHOPIFY_STORE_DOMAIN</li>
                <li>SHOPIFY_ACCESS_TOKEN</li>
                <li>SHOPIFY_WEBHOOK_SECRET</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Shopify Integration
          {isPublished && (
            <Badge variant="secondary" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Published
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {isPublished ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Published to Shopify</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Not published</span>
              </>
            )}
          </div>
          {isPublished && (
            <Badge variant="outline" className="text-xs">
              ID: {shopifyArticleId}
            </Badge>
          )}
        </div>

        {/* Blog Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Blog</label>
          <div className="flex gap-2">
            <Select 
              value={selectedBlogId} 
              onValueChange={setSelectedBlogId}
              disabled={blogsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={blogsLoading ? "Loading blogs..." : "Select a blog"} />
              </SelectTrigger>
              <SelectContent>
                {blogs.map((blog) => (
                  <SelectItem key={blog.id} value={blog.id}>
                    {blog.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBlogs}
              disabled={blogsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${blogsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isPublished ? (
            <Button 
              onClick={publishToShopify}
              disabled={loading || !selectedBlogId}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Publish to Shopify
            </Button>
          ) : (
            <>
              <Button 
                onClick={updateInShopify}
                disabled={loading || !selectedBlogId}
                variant="outline"
                className="flex-1"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Update in Shopify
              </Button>
              <Button 
                onClick={deleteFromShopify}
                disabled={loading}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={clearMessages}>
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between text-green-800">
              {success}
              <Button variant="ghost" size="sm" onClick={clearMessages}>
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Blog Info */}
        {selectedBlogId && blogs.length > 0 && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            <strong>Selected Blog:</strong> {blogs.find(b => b.id === selectedBlogId)?.title}
            <br />
            <strong>Handle:</strong> {blogs.find(b => b.id === selectedBlogId)?.handle}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Articles are published with the same status as in your CMS</p>
          <p>• Keywords are converted to Shopify tags</p>
          <p>• Meta descriptions become article excerpts</p>
          <p>• Changes here sync with your Shopify store</p>
        </div>
      </CardContent>
    </Card>
  );
} 