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
import { Edit, Trash2, Plus, Search, Filter } from 'lucide-react'

type Topic = Database['public']['Tables']['topics']['Row']

interface TopicDashboardProps {
  onCreateTopic?: () => void
  onEditTopic?: (topic: Topic) => void
}

interface ConfigValues {
  industries: string[]
  market_segments: string[]
}

export function TopicDashboard({ onCreateTopic, onEditTopic }: TopicDashboardProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [configValues, setConfigValues] = useState<ConfigValues | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<TopicFilterData>({
    search: '',
    industry: '',
    market_segment: '',
    priority_min: undefined,
    priority_max: undefined,
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
      setConfigValues({
        industries: data.industries || [],
        market_segments: data.market_segments || [],
      })
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
      industry: '',
      market_segment: '',
      priority_min: undefined,
      priority_max: undefined,
    })
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800'
    if (priority >= 6) return 'bg-yellow-100 text-yellow-800'
    if (priority >= 4) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStylePreferencesDisplay = (stylePreferences: any) => {
    if (!stylePreferences) return 'Default'
    
    const prefs = []
    if (stylePreferences.tone) prefs.push(stylePreferences.tone)
    if (stylePreferences.length) prefs.push(stylePreferences.length)
    if (stylePreferences.target_audience) prefs.push(stylePreferences.target_audience)
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

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search topics and keywords..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Industry</Label>
              <Select
                value={filters.industry || ''}
                onValueChange={(value) => updateFilter('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All industries</SelectItem>
                  {configValues?.industries?.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Market Segment</Label>
              <Select
                value={filters.market_segment || ''}
                onValueChange={(value) => updateFilter('market_segment', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All segments</SelectItem>
                  {configValues?.market_segments?.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Min Priority</Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="1"
                value={filters.priority_min || ''}
                onChange={(e) => updateFilter('priority_min', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Max Priority</Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="10"
                value={filters.priority_max || ''}
                onChange={(e) => updateFilter('priority_max', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            </div>
          </div>
        )}
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
                    {truncateText(topic.title, 60)}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(topic.priority)}`}>
                      Priority {topic.priority}
                    </span>
                    {topic.industry && (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {topic.industry}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2 text-sm text-gray-600">
                  {topic.keywords && (
                    <div>
                      <span className="font-medium">Keywords:</span>{' '}
                      {truncateText(topic.keywords, 80)}
                    </div>
                  )}
                  {topic.market_segment && (
                    <div>
                      <span className="font-medium">Segment:</span> {topic.market_segment}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Style:</span>{' '}
                    {truncateText(getStylePreferencesDisplay(topic.style_preferences), 60)}
                  </div>
                  {(topic.search_volume || topic.competition_score) && (
                    <div className="flex gap-4">
                      {topic.search_volume && (
                        <span>
                          <span className="font-medium">Volume:</span> {topic.search_volume.toLocaleString()}
                        </span>
                      )}
                      {topic.competition_score && (
                        <span>
                          <span className="font-medium">Competition:</span> {topic.competition_score}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    {formatDate(topic.created_at)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditTopic?.(topic)}
                      className="p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTopic(topic.id)}
                      disabled={deletingId === topic.id}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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