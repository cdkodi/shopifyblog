'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';

interface TopicWithArticles {
  id: string;
  topic_title: string;
  keywords: string[];
  content_template: string;
  status: string;
  created_at: string;
  article_count: number;
  published_article_count: number;
  has_published_articles: boolean;
  last_published_at: string | null;
}

interface ArticleWithTopic {
  id: string;
  title: string;
  status: string;
  created_at: string;
  published_at: string | null;
  source_topic: {
    id: string;
    topic_title: string;
    content_template: string;
  } | null;
}

interface TopicArticleLinksProps {
  articleId?: string;
  topicId?: string;
  showNavigation?: boolean;
}

export function TopicArticleLinks({ 
  articleId, 
  topicId, 
  showNavigation = true 
}: TopicArticleLinksProps) {
  const [topicData, setTopicData] = useState<TopicWithArticles | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleWithTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (topicId) {
      fetchTopicWithArticles();
    } else if (articleId) {
      fetchArticleWithTopic();
    }
  }, [topicId, articleId]);

  const fetchTopicWithArticles = async () => {
    if (!topicId) return;

    try {
      setLoading(true);
      const supabase = createClient();

      // Get topic with article stats
      const { data: topic, error: topicError } = await supabase
        .from('topics_with_article_status')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError || !topic || !topic.id) {
        console.error('Error fetching topic:', topicError);
        return;
      }

      setTopicData(topic as any);

      // Get related articles
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          status,
          created_at,
          published_at
        `)
        .eq('source_topic_id', topicId)
        .order('created_at', { ascending: false });

      if (articlesError) {
        console.error('Failed to load related articles:', articlesError);
      } else {
        setRelatedArticles(articles?.map(article => ({
          ...article,
          source_topic: {
            id: topic.id,
            topic_title: topic.topic_title,
            content_template: topic.content_template
          }
        })) as any || []);
      }
    } catch (err) {
      setError('Failed to load topic data');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticleWithTopic = async () => {
    if (!articleId) return;

    try {
      setLoading(true);
      const supabase = createClient();

      // Get article with topic info
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          status,
          created_at,
          published_at,
          source_topic_id,
          topics:source_topic_id (
            id,
            topic_title,
            content_template
          )
        `)
        .eq('id', articleId)
        .single();

      if (articleError) {
        setError('Failed to load article');
        return;
      }

      if (article.topics) {
        const topicInfo = Array.isArray(article.topics) ? article.topics[0] : article.topics;
        setRelatedArticles([{
          ...article,
          source_topic: topicInfo
        } as any]);

        // If we have a topic, get other articles from the same topic
        if (topicInfo) {
          const { data: otherArticles, error: otherError } = await supabase
            .from('articles')
            .select(`
              id,
              title,
              status,
              created_at,
              published_at
            `)
            .eq('source_topic_id', topicInfo.id)
            .neq('id', articleId)
            .order('created_at', { ascending: false });

          if (!otherError && otherArticles) {
            setRelatedArticles(prev => [
              ...prev,
              ...otherArticles.map(otherArticle => ({
                ...otherArticle,
                source_topic: topicInfo
              }))
            ] as any);
          }
        }
      }
    } catch (err) {
      setError('Failed to load article data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemplateIcon = (template: string) => {
    const templateIcons: Record<string, string> = {
      'How-To Guide': '📋',
      'Product Showcase': '🛍️',
      'Industry News': '📰',
      'Tutorial': '🎓',
      'Review': '⭐',
      'Comparison': '⚖️',
      'List Article': '📝',
      'Case Study': '📊',
      'Interview': '🎤',
      'Opinion Piece': '💭'
    };
    return templateIcons[template] || '📄';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topic Information */}
      {topicData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">
                {getTemplateIcon(topicData.content_template)}
              </span>
              Topic: {topicData.topic_title}
              <Badge className={getStatusColor(topicData.status)}>
                {topicData.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {topicData.article_count}
                </div>
                <div className="text-sm text-gray-600">Total Articles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {topicData.published_article_count}
                </div>
                <div className="text-sm text-gray-600">Published</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {topicData.article_count - topicData.published_article_count}
                </div>
                <div className="text-sm text-gray-600">Draft</div>
              </div>
            </div>

            {topicData.keywords && topicData.keywords.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-gray-500" />
                <div className="flex flex-wrap gap-1">
                  {topicData.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {showNavigation && (
              <div className="flex gap-2">
                <Link href={`/topics`}>
                  <Button variant="outline" size="sm">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    View All Topics
                  </Button>
                </Link>
                <Link href={`/content-generation?topicId=${topicData.id}&template=${encodeURIComponent(topicData.content_template)}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Generate New Article
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {topicId ? 'Articles from this Topic' : 'Related Articles'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relatedArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{article.title}</h4>
                      <Badge className={getStatusColor(article.status)}>
                        {article.status}
                      </Badge>
                    </div>
                    {article.source_topic && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <span className="text-xs">
                          {getTemplateIcon(article.source_topic.content_template)}
                        </span>
                        From: {article.source_topic.topic_title}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      Created: {new Date(article.created_at).toLocaleDateString()}
                      {article.published_at && (
                        <>
                          <span>•</span>
                          Published: {new Date(article.published_at).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                  {showNavigation && (
                    <Link href={`/articles/${article.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {relatedArticles.length === 0 && !topicData && (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No topic-article relationships found.
          </CardContent>
        </Card>
      )}
    </div>
  );
} 