'use client';

import { useState, useEffect } from 'react';
import { ArticleList } from '@/components/articles/article-list';
import { ArticleStats } from '@/components/articles/article-stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { ArticleService, ArticleFilterData } from '@/lib/supabase/articles';
import type { Database } from '@/lib/types/database';
import { useRouter } from 'next/navigation';

type Article = Database['public']['Tables']['articles']['Row'];

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState({
    totalArticles: 0,
    draftArticles: 0,
    publishedArticles: 0,
    totalWords: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ArticleFilterData>({
    search: '',
    status: '',
    orderBy: 'updated_at',
    orderDirection: 'desc'
  });

  const loadArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await ArticleService.getArticles(filters);
      
      if (error) {
        setError(error);
      } else {
        setArticles(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error loading articles:', err);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await ArticleService.getArticleStats();
      if (error) {
        console.error('Error loading stats:', error);
      } else {
        setStats(data || stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadArticles();
    loadStats();
  }, [filters]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }));
  };

  const handleSortChange = (value: string) => {
    const [orderBy, orderDirection] = value.split('-') as [string, 'asc' | 'desc'];
    setFilters(prev => ({ ...prev, orderBy: orderBy as any, orderDirection }));
  };

  const handleCreateNew = () => {
    router.push('/content-generation');
  };

  const handleArticleDeleted = () => {
    loadArticles();
    loadStats();
  };

  const handleArticleUpdated = () => {
    loadArticles();
    loadStats();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
            <p className="text-gray-600 mt-1">Manage your content library</p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Create New Article
          </Button>
        </div>

        {/* Stats */}
        <ArticleStats stats={stats} />

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search articles..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select 
                value={`${filters.orderBy}-${filters.orderDirection}`} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                  <SelectItem value="updated_at-asc">Oldest Updated</SelectItem>
                  <SelectItem value="created_at-desc">Recently Created</SelectItem>
                  <SelectItem value="created_at-asc">Oldest Created</SelectItem>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="published_at-desc">Recently Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        <ArticleList
          articles={articles}
          loading={loading}
          error={error}
          onArticleDeleted={handleArticleDeleted}
          onArticleUpdated={handleArticleUpdated}
          onRetry={loadArticles}
        />
      </div>
    </div>
  );
} 