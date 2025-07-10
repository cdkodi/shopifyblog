import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { parseArticleKeywords } from '@/lib/utils';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  content: string;
  meta_description?: string | null;
  status: string | null;
  target_keywords?: any; // JSON field
  word_count?: number | null;
  reading_time?: number | null;
  seo_score?: number | null;
  created_at: string | null;
  updated_at: string | null;
  published_at?: string | null;
  slug?: string | null;
  shopify_article_id?: number | null;
  shopify_blog_id?: number | null;
  scheduled_publish_date?: string | null;
}

interface ArticleStats {
  total: number;
  draft: number;
  review: number;
  approved: number;
  published: number;
  rejected: number;
}

export function ArticleReviewDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<ArticleStats>({
    total: 0,
    draft: 0,
    review: 0,
    approved: 0,
    published: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');

  // Load articles and stats
  useEffect(() => {
    loadArticles();
    loadStats();
  }, [statusFilter, sortBy]);

  const loadArticles = async () => {
    try {
      let query = supabase
        .from('articles')
        .select('*')
        .order(sortBy as any, { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error loading articles:', error);
        return;
      }

      setArticles(data || []);
    } catch (err) {
      console.error('Unexpected error loading articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('status');

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      const statsData = data?.reduce((acc, article) => {
        acc.total++;
        acc[article.status as keyof ArticleStats]++;
        return acc;
      }, {
        total: 0,
        draft: 0,
        review: 0,
        approved: 0,
        published: 0,
        rejected: 0
      }) || stats;

      setStats(statsData);
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  };

  const updateArticleStatus = async (articleId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: newStatus as any,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'published' ? { published_at: new Date().toISOString() } : {})
        })
        .eq('id', articleId);

      if (error) {
        console.error('Error updating article status:', error);
        return;
      }

      // Refresh data
      loadArticles();
      loadStats();
    } catch (err) {
      console.error('Unexpected error updating article:', err);
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      published: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSEOScoreColor = (score?: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter articles based on search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadArticles();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editorial Dashboard</h1>
          <p className="text-gray-600 mt-1">Review and manage article content</p>
        </div>
        <Link href="/content-generation">
          <Button>Create New Article</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Articles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <div className="text-sm text-gray-600">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.review}</div>
            <div className="text-sm text-gray-600">In Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
            <div className="text-sm text-gray-600">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search articles by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="ready_for_editorial">Ready for Editorial</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="published_visible">Published (Visible)</SelectItem>
                    <SelectItem value="published_hidden">Published (Hidden)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="seo_score">SEO Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <div className="space-y-4">
        {articles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 text-lg">No articles found</div>
              <p className="text-gray-500 mt-2">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Create your first article to get started'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          articles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                        <Link href={`/articles/${article.id}/edit`}>
                          {article.title}
                        </Link>
                      </h3>
                      <Badge className={getStatusColor(article.status)}>
                        {article.status ? article.status.replace('_', ' ') : 'Unknown'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {article.meta_description || article.content.substring(0, 150) + '...'}
                    </p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>📝 {article.word_count || 0} words</span>
                      <span>⏱️ {article.reading_time || 0} min read</span>
                      <span className={getSEOScoreColor(article.seo_score)}>
                        📊 SEO: {article.seo_score || 'N/A'}
                      </span>
                      <span>🗓️ {formatDate(article.updated_at)}</span>
                    </div>
                    
                    {(() => {
                      const keywords = article.target_keywords 
                        ? (typeof article.target_keywords === 'string' 
                            ? parseArticleKeywords(article.target_keywords) 
                            : article.target_keywords)
                        : [];
                      
                      return keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {keywords.slice(0, 3).map((keyword: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {keywords.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{keywords.length - 3} more
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/articles/${article.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    
                    {article.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateArticleStatus(article.id, 'review')}
                      >
                        Submit for Review
                      </Button>
                    )}
                    
                    {article.status === 'review' && (
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="sm" 
                          onClick={() => updateArticleStatus(article.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateArticleStatus(article.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    {article.status === 'approved' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateArticleStatus(article.id, 'published')}
                      >
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 