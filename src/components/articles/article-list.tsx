import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  EditIcon, 
  MoreVerticalIcon, 
  TrashIcon, 
  CopyIcon, 
  ExternalLinkIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  TagIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  FilterIcon
} from 'lucide-react';
import { ArticleService } from '@/lib/supabase/articles';
import { parseArticleKeywords } from '@/lib/utils';
import type { Database } from '@/lib/types/database';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';

type Article = Database['public']['Tables']['articles']['Row'];

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  error: string | null;
  onArticleDeleted: () => void;
  onArticleUpdated: () => void;
  onRetry: () => void;
  showFilters?: boolean;
}

type FilterStatus = 'all' | 'draft' | 'review' | 'approved' | 'published' | 'rejected' | 'ai-generated' | 'ready-for-review';

export function ArticleList({ 
  articles, 
  loading, 
  error, 
  onArticleDeleted, 
  onArticleUpdated, 
  onRetry,
  showFilters = true
}: ArticleListProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; article: Article | null }>({
    open: false,
    article: null
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'ai-generated': return 'bg-purple-100 text-purple-800';
      case 'ready-for-review': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string, isAiGenerated: boolean) => {
    if (isAiGenerated) {
      return <SparklesIcon className="w-3 h-3 mr-1" />;
    }
    
    switch (status) {
      case 'review': return <EyeIcon className="w-3 h-3 mr-1" />;
      case 'approved': return <CheckCircleIcon className="w-3 h-3 mr-1" />;
      case 'published': return <ExternalLinkIcon className="w-3 h-3 mr-1" />;
      case 'rejected': return <AlertCircleIcon className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const isAiGenerated = (article: Article) => {
    return article.ai_model_used !== null || article.generation_started_at !== null;
  };

  const isReadyForReview = (article: Article) => {
    return isAiGenerated(article) && article.status === 'draft' && article.content !== null;
  };

  const getFilteredArticles = () => {
    if (filterStatus === 'all') return articles;
    if (filterStatus === 'ai-generated') return articles.filter(isAiGenerated);
    if (filterStatus === 'ready-for-review') return articles.filter(isReadyForReview);
    return articles.filter(article => article.status === filterStatus);
  };

  const getFilterCounts = () => {
    const stats = {
      all: articles.length,
      draft: articles.filter(a => a.status === 'draft').length,
      review: articles.filter(a => a.status === 'ready_for_editorial').length,
      approved: articles.filter(a => a.status === 'published').length,
      published: articles.filter(a => a.status === 'published_visible').length,
      rejected: articles.filter(a => a.status === 'generation_failed').length,
      aiGenerated: articles.filter(isAiGenerated).length,
      readyForReview: articles.filter(isReadyForReview).length
    };
    return stats;
  };

  const handleEditArticle = (articleId: string) => {
    router.push(`/articles/${articleId}/edit`);
  };

  const handleDuplicateArticle = async (article: Article) => {
    try {
      setActionLoading(article.id);
      const { data, error } = await ArticleService.duplicateArticle(article.id);
      
      if (error) {
        alert(`Failed to duplicate article: ${error}`);
      } else {
        onArticleUpdated();
      }
    } catch (err) {
      console.error('Error duplicating article:', err);
      alert('Failed to duplicate article');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteArticle = async () => {
    if (!deleteDialog.article) return;

    try {
      setActionLoading(deleteDialog.article.id);
      const { error } = await ArticleService.deleteArticle(deleteDialog.article.id);
      
      if (error) {
        alert(`Failed to delete article: ${error}`);
      } else {
        onArticleDeleted();
        setDeleteDialog({ open: false, article: null });
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (articleId: string, newStatus: string) => {
    try {
      setActionLoading(articleId);
      const { error } = await ArticleService.updateArticleStatus(
        articleId, 
        newStatus as 'draft' | 'generating' | 'generation_failed' | 'ready_for_editorial' | 'published' | 'published_hidden' | 'published_visible'
      );
      
      if (error) {
        alert(`Failed to update status: ${error}`);
      } else {
        onArticleUpdated();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async (articleIds: string[]) => {
    try {
      setActionLoading('bulk-approve');
      const results = await Promise.all(
        articleIds.map(id => ArticleService.updateArticleStatus(id, 'published'))
      );
      
      const hasError = results.some(result => result.error);
      if (hasError) {
        alert('Some articles failed to approve');
      } else {
        onArticleUpdated();
      }
    } catch (err) {
      console.error('Error bulk approving:', err);
      alert('Failed to bulk approve articles');
    } finally {
      setActionLoading(null);
    }
  };

  const renderGenerationMetadata = (article: Article) => {
    if (!isAiGenerated(article)) return null;

    const metadata = {
      aiModel: article.ai_model_used,
      promptVersion: article.generation_prompt_version,
      startedAt: article.generation_started_at,
      completedAt: article.generation_completed_at
    };
    return (
      <div className="flex items-center space-x-4 text-xs text-purple-600 bg-purple-50 rounded-lg p-2">
        <div className="flex items-center space-x-1">
          <SparklesIcon className="w-3 h-3" />
          <span>AI Generated</span>
        </div>
        {article.source_topic_id && (
          <span>Topic: {article.source_topic_id}</span>
        )}
        {article.ai_model_used && (
          <span>Provider: {article.ai_model_used}</span>
        )}
        {article.word_count && (
          <span>{article.word_count} words</span>
        )}
        {article.seo_score && (
          <span>SEO: {article.seo_score}%</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading articles...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredArticles = getFilteredArticles();
  const filterCounts = getFilterCounts();

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">No articles found.</p>
            <Button onClick={() => router.push('/content-generation')}>
              Create Your First Article
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilterIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filterCounts).map(([status, count]) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(status as FilterStatus)}
                    className="text-xs"
                  >
                    {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({count})
                  </Button>
                ))}
              </div>
            </div>

            {/* Bulk Actions for Ready for Review */}
            {filterStatus === 'ready-for-review' && filteredArticles.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EyeIcon className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {filteredArticles.length} articles ready for review
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleBulkApprove(filteredArticles.map(a => a.id))}
                    disabled={actionLoading === 'bulk-approve'}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {actionLoading === 'bulk-approve' ? 'Approving...' : 'Approve All'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-gray-600">No articles found for the selected filter.</p>
              <Button 
                variant="outline" 
                onClick={() => setFilterStatus('all')}
              >
                Show All Articles
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        filteredArticles.map((article) => (
          <Card key={article.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Title and Status */}
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                        onClick={() => handleEditArticle(article.id)}>
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isReadyForReview(article) && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <EyeIcon className="w-3 h-3 mr-1" />
                          Ready for Review
                        </Badge>
                      )}
                      <Badge className={getStatusColor(article.status || 'draft')}>
                        {getStatusIcon(article.status || 'draft', isAiGenerated(article))}
                        {article.status || 'draft'}
                      </Badge>
                    </div>
                  </div>

                  {/* Generation Metadata */}
                  {renderGenerationMetadata(article)}

                  {/* Meta Description */}
                  {article.meta_description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {article.meta_description}
                    </p>
                  )}

                  {/* Article Metrics */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {article.word_count && (
                      <div className="flex items-center space-x-1">
                        <FileTextIcon className="w-4 h-4" />
                        <span>{article.word_count.toLocaleString()} words</span>
                      </div>
                    )}
                    
                    {article.reading_time && (
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{article.reading_time} min read</span>
                      </div>
                    )}
                    
                    {article.seo_score && (
                      <div className="flex items-center space-x-1">
                        <TagIcon className="w-4 h-4" />
                        <span>SEO: {article.seo_score}/100</span>
                      </div>
                    )}
                  </div>

                  {/* Target Keywords */}
                  {article.target_keywords && (
                    <div className="flex flex-wrap gap-2">
                      {parseArticleKeywords(article.target_keywords).slice(0, 3).map((keyword: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {parseArticleKeywords(article.target_keywords).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{parseArticleKeywords(article.target_keywords).length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex items-center space-x-6 text-xs text-gray-400">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-3 h-3" />
                      <span>Updated {formatDistanceToNow(new Date(article.updated_at!))} ago</span>
                    </div>
                    {article.published_at && (
                      <div className="flex items-center space-x-1">
                        <ExternalLinkIcon className="w-3 h-3" />
                        <span>Published {format(new Date(article.published_at), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-4">
                      <MoreVerticalIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => handleEditArticle(article.id)}>
                      <EditIcon className="w-4 h-4 mr-2" />
                      Edit Article
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => handleDuplicateArticle(article)}
                      disabled={actionLoading === article.id}
                    >
                      <CopyIcon className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    
                    {article.status !== 'draft' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(article.id, 'draft')}>
                        Move to Draft
                      </DropdownMenuItem>
                    )}
                    {article.status !== 'ready_for_editorial' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(article.id, 'ready_for_editorial')}>
                        Send for Review
                      </DropdownMenuItem>
                    )}
                    {article.status !== 'published' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(article.id, 'published')}>
                        Approve
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteDialog({ open: true, article })}
                      className="text-red-600 focus:text-red-600"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, article: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.article?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteArticle}
              disabled={actionLoading === deleteDialog.article?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading === deleteDialog.article?.id ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 