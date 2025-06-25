'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { TopicService } from '../lib/supabase/topics'
import { formatDate, truncateText } from '../lib/utils'
import type { Database } from '../lib/types/database'
import type { TopicFilterData } from '../lib/validations/topic'
import { Edit, Trash2, Plus, Search, FileText } from 'lucide-react'

type Topic = Database['public']['Tables']['topics']['Row']

interface TopicDashboardProps {
  onCreateTopic?: () => void
  onEditTopic?: (topic: Topic) => void
  onGenerateContent?: (topic: Topic) => void
}

interface ConfigValues {
  style_tones: string[]
  article_lengths: string[]
  content_templates: string[]
}

export function TopicDashboard({ onCreateTopic, onEditTopic, onGenerateContent }: TopicDashboardProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [configValues, setConfigValues] = useState<ConfigValues | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<TopicFilterData>({
    search: '',
  })

  // Load topics and config values
  useEffect(() => {
    loadTopics()
    loadConfig()
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

    const { data, error } = await TopicService.getTopics(filters)
    
    if (error) {
      setError(error)
    } else {
      setTopics(data || [])
    }
    
    setIsLoading(false)
  }

  const loadConfig = async () => {
    const { data, error } = await TopicService.getConfigValues()
    if (data && !error) {
      setConfigValues(data)
    }
  }

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    const { error } = await TopicService.deleteTopic(id)
    
    if (error) {
      setError(error)
    } else {
      setTopics(topics.filter(topic => topic.id !== id))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Topic Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your content topics and style preferences
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

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          {isLoading ? 'Loading...' : `${topics.length} topic${topics.length !== 1 ? 's' : ''} found`}
        </span>
        {Object.values(filters).some(v => v !== '' && v !== undefined) && (
          <span className="text-blue-600">Filters active</span>
        )}
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

      {/* Topics Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
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
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No topics found</h3>
            <p className="text-gray-600 mb-4">
              {Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'No topics match your current filters. Try adjusting your search criteria.'
                : 'Get started by creating your first topic for content generation.'
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
          {topics.map((topic) => (
            <div key={topic.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {truncateText(topic.topic_title, 60)}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {topic.status || 'pending'}
                    </span>
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
                  <div>
                    <span className="font-medium">Style:</span>{' '}
                    {truncateText(getStylePreferencesDisplay(topic.style_preferences), 60)}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    {formatDate(topic.created_at || new Date().toISOString())}
                  </span>
                  <div className="flex gap-2">
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
                      onClick={() => handleDeleteTopic(topic.id)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 