'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { supabase } from '../lib/supabase'
import { formatDate, truncateText } from '../lib/utils'
import type { Database } from '../lib/types/database'
import type { TopicFilterData } from '../lib/validations/topic'
import { Edit, Trash2, Plus, Search, FileText, Clock, Target, Sparkles, ArrowRight, CheckCircle } from 'lucide-react'

type TopicWithStatus = Database['public']['Views']['topics_with_article_status']['Row']

interface TopicDashboardProps {
  onCreateTopic?: () => void
  onEditTopic?: (topic: TopicWithStatus) => void
  onGenerateContent?: (topic: TopicWithStatus) => void
}

export function TopicDashboard({ onCreateTopic, onEditTopic, onGenerateContent }: TopicDashboardProps) {
  const [topics, setTopics] = useState<TopicWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'available' | 'published'>('available')

  // Filter state
  const [filters, setFilters] = useState<TopicFilterData>({
    search: '',
  })

  // Load topics with article status
  useEffect(() => {
    loadTopics()
  }, [])

  // Reload topics when filters change
  useEffect(() => {
    const delayedFilter = setTimeout(() => {
      loadTopics()
    }, 300) // Debounce filter changes

    return () => clearTimeout(delayedFilter)
  }, [filters])

  const loadTopics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('topics_with_article_status')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply search filter
      if (filters?.search) {
        query = query.or(`topic_title.ilike.%${filters.search}%,keywords.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setTopics(data || [])
      }
    } catch (err) {
      console.error('Unexpected error fetching topics:', err)
      setError('Failed to fetch topics')
    }
    
    setIsLoading(false)
  }

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)
      
      if (error) {
        setError(error.message)
      } else {
        setTopics(topics.filter(topic => topic.id !== id))
      }
    } catch (err) {
      console.error('Error deleting topic:', err)
      setError('Failed to delete topic')
    }
    
    setDeletingId(null)
  }

  const updateFilter = (key: keyof TopicFilterData, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
    })
  }

  const getStylePreferencesDisplay = (stylePreferences: any) => {
    if (!stylePreferences) return 'Default'
    
    const prefs = []
    if (stylePreferences.tone) prefs.push(stylePreferences.tone)
    if (stylePreferences.length) prefs.push(stylePreferences.length)
    if (stylePreferences.template) prefs.push(stylePreferences.template)
    
    return prefs.length > 0 ? prefs.join(', ') : 'Default'
  }

  const getTemplateIcon = (templateName: string | null) => {
    const iconMap: Record<string, string> = {
      'How-To Guide': '📖',
      'Product Showcase': '🛍️',
      'Industry Trends': '📊',
      'Buying Guide': '🛒',
      'Case Study': '📈',
      'News & Updates': '📰',
      'Tutorial': '🎓',
      'Review': '⭐',
      'Comparison': '⚖️',
      'Interview': '🎤',
      'Analysis': '📋',
      'Announcement': '📢'
    };
    return iconMap[templateName || ''] || '📄';
  }

  // Separate topics into available and published
  const availableTopics = topics.filter(topic => !topic.has_published_articles)
  const publishedTopics = topics.filter(topic => topic.has_published_articles)

  const renderTopicCard = (topic: TopicWithStatus) => (
    <Card key={topic.id} className="p-6 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getTemplateIcon(topic.content_template)}</span>
              <h3 className="font-semibold text-gray-900 truncate">
                {truncateText(topic.topic_title || '', 50)}
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {topic.content_template && (
                <Badge variant="secondary" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {topic.content_template}
                </Badge>
              )}
              
              <Badge variant={topic.topic_status === 'published' ? 'default' : 'secondary'} className="text-xs">
                {topic.topic_status === 'published' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Published
                  </>
                ) : topic.topic_status === 'generated' ? (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    Generated
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Available
                  </>
                )}
              </Badge>
              
              {topic.article_count && topic.article_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  {topic.article_count} article{topic.article_count !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 text-sm text-gray-600">
          {topic.keywords && (
            <div>
              <span className="font-medium">Keywords:</span>{' '}
              {truncateText(
                Array.isArray(topic.keywords) 
                  ? topic.keywords.join(', ')
                  : typeof topic.keywords === 'string' 
                    ? topic.keywords 
                    : '', 
                80
              )}
            </div>
          )}
          
          {topic.style_preferences && (
            <div>
              <span className="font-medium">Style:</span>{' '}
              {truncateText(getStylePreferencesDisplay(topic.style_preferences), 60)}
            </div>
          )}

          {topic.has_published_articles && topic.last_published_at && (
            <div>
              <span className="font-medium">Last Published:</span>{' '}
              {formatDate(topic.last_published_at)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-xs text-gray-500">
            Created {formatDate(topic.created_at || new Date().toISOString())}
          </span>
          <div className="flex gap-2">
            {!topic.has_published_articles && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onGenerateContent?.(topic)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                title="Generate Content"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Generate</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditTopic?.(topic)}
              className="p-2"
              title="Edit Topic"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteTopic(topic.id!)}
              disabled={deletingId === topic.id}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete Topic"
            >
              {deletingId === topic.id ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Topic Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your content topics with streamlined template selection
          </p>
        </div>
        <Button onClick={onCreateTopic} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Topic
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search topics and keywords..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Topics</p>
              <p className="text-2xl font-bold text-gray-900">{availableTopics.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Published Topics</p>
              <p className="text-2xl font-bold text-gray-900">{publishedTopics.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">
                {topics.reduce((sum, topic) => sum + (topic.article_count || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Available Topics ({availableTopics.length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'published'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Published Topics ({publishedTopics.length})
          </button>
        </nav>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={loadTopics} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Topics Content */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          {activeTab === 'available' ? (
            availableTopics.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No available topics</h3>
                  <p className="text-gray-600 mb-4">
                    {Object.values(filters).some(v => v !== '' && v !== undefined)
                      ? 'No available topics match your search criteria.'
                      : 'Create your first topic to start generating content.'
                    }
                  </p>
                  {Object.values(filters).some(v => v !== '' && v !== undefined) ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={onCreateTopic}>
                      Create Your First Topic
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTopics.map(renderTopicCard)}
              </div>
            )
          ) : (
            publishedTopics.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No published topics yet</h3>
                  <p className="text-gray-600 mb-4">
                    Topics will appear here once their generated articles are published to Shopify.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <span>Generate content from available topics</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>Publish to Shopify</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedTopics.map(renderTopicCard)}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
} 