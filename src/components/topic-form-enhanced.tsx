'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Palette, FileText, Layout } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { topicSchema, type TopicFormData } from '../lib/validations/topic'
import { TopicService } from '../lib/supabase/topics'

interface TopicFormProps {
  initialData?: Partial<TopicFormData>
  topicId?: string
  onSuccess?: (topic: any) => void
  onCancel?: () => void
}

interface ConfigValues {
  style_tones: string[]
  article_lengths: string[]
  content_templates: string[]
}

export function TopicFormEnhanced({ initialData, topicId, onSuccess, onCancel }: TopicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState<ConfigValues | null>(null)
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([])
  const [keywordError, setKeywordError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      title: initialData?.title || '',
      keywords: initialData?.keywords || '',
      tone: initialData?.tone || 'Professional',
      length: initialData?.length || 'Medium (800-1500 words)',
      template: initialData?.template || 'Blog Post',
    },
    mode: 'onChange',
  })

  const watchedValues = watch()

  // Mock config values for demo (replace with real data in production)
  useEffect(() => {
    // Simulating API call with mock data
    const mockConfig: ConfigValues = {
      style_tones: ['Professional', 'Conversational', 'Educational', 'Inspirational', 'Humorous'],
      article_lengths: ['Short (500-800 words)', 'Medium (800-1500 words)', 'Long (1500-3000 words)', 'Extended (3000+ words)'],
      content_templates: ['Blog Post', 'How-to Guide', 'Listicle', 'Review', 'Case Study', 'Tutorial']
    }
    setConfigValues(mockConfig)
  }, [])

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        keywords: initialData.keywords || '',
        tone: initialData.tone || 'Professional',
        length: initialData.length || 'Medium (800-1500 words)',
        template: initialData.template || 'Blog Post',
      })
    }
  }, [initialData, reset])

  // Keyword research when title changes
  useEffect(() => {
    const performKeywordResearch = async () => {
      const title = watchedValues.title
      if (!title || title.length < 3) {
        setKeywordSuggestions([])
        return
      }

      setLoadingKeywords(true)
      setKeywordError(null)

      try {
        const response = await fetch(`/api/seo/keywords?topic=${encodeURIComponent(title)}&limit=10`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch keyword data')
        }

        if (result.success && result.data.keywords && result.data.keywords.length > 0) {
          const keywords = result.data.keywords.map((k: any) => k.keyword).slice(0, 8)
          setKeywordSuggestions(keywords)
          
          // Auto-suggest keywords if field is empty
          if (!watchedValues.keywords || watchedValues.keywords.trim() === '') {
            setValue('keywords', keywords.join(', '))
          }
        } else {
          setKeywordSuggestions([])
        }
      } catch (error) {
        console.error('Keyword research failed:', error)
        setKeywordError('Failed to fetch keyword suggestions. You can still enter keywords manually.')
        setKeywordSuggestions([])
      } finally {
        setLoadingKeywords(false)
      }
    }

    const debounceTimer = setTimeout(performKeywordResearch, 1000)
    return () => clearTimeout(debounceTimer)
  }, [watchedValues.title, setValue, watchedValues.keywords])

  const onSubmit = async (data: TopicFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      console.log('💾 Saving topic with data:', data)
      
      let result;
      if (topicId) {
        // Update existing topic
        result = await TopicService.updateTopic(topicId, data)
      } else {
        // Create new topic
        result = await TopicService.createTopic(data)
      }
      
      if (result.error) {
        setSubmitError(result.error)
        return
      }
      
      console.log('✅ Topic saved successfully:', result.data)
      onSuccess?.(result.data)
      
      if (!topicId) {
        reset() // Reset form after successful creation
      }
    } catch (error) {
      console.error('Topic submission error:', error)
      setSubmitError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {topicId ? 'Edit Topic' : 'Create New Topic'}
        </h2>
        <p className="text-gray-600 mt-1">
          {topicId ? 'Update topic details and style preferences' : 'Add a new topic for content generation'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title - Required Field */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-gray-700 font-medium">
            Topic Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g., 'Digital Marketing Trends 2024' or 'Beginner's Guide to Sustainable Fashion'"
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Be specific and include key details like year, target audience, or main benefit
          </p>
        </div>

        {/* Keywords - Optional Field with AI Suggestions */}
        <div className="space-y-2">
          <Label htmlFor="keywords" className="text-gray-700 font-medium flex items-center gap-2">
            Keywords
            {loadingKeywords && (
              <span className="text-blue-600 text-sm flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Researching keywords...
              </span>
            )}
          </Label>
          
          {/* Keyword Suggestions */}
          {keywordSuggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-800">💡 Suggested Keywords (click to add):</p>
                <button
                  type="button"
                  onClick={() => setValue('keywords', keywordSuggestions.join(', '))}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Add all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywordSuggestions.map((keyword, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const currentKeywords = watchedValues.keywords || ''
                      const keywordList = currentKeywords.split(',').map(k => k.trim()).filter(Boolean)
                      if (!keywordList.includes(keyword)) {
                        const newKeywords = [...keywordList, keyword].join(', ')
                        setValue('keywords', newKeywords)
                      }
                    }}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Textarea
            id="keywords"
            {...register('keywords')}
            placeholder="e.g., digital marketing, social media, SEO, content strategy, 2024 trends"
            rows={3}
            className={errors.keywords ? 'border-red-500' : ''}
          />
          
          {errors.keywords && (
            <p className="text-sm text-red-600">{errors.keywords.message}</p>
          )}
          
          {keywordError && (
            <p className="text-sm text-amber-600">⚠️ {keywordError}</p>
          )}
          
          <p className="text-xs text-gray-500">
            Optional • Keywords will be automatically suggested based on your topic title using SEO research
          </p>
        </div>

        {/* Style Preferences Section */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Style Preferences</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure how the content should be written when this topic is used for article generation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Tone Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-1 font-medium">
                <Palette className="h-4 w-4" />
                Writing Tone
              </Label>
              <Select
                value={watchedValues.tone || 'Professional'}
                onValueChange={(value) => setValue('tone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose writing style..." />
                </SelectTrigger>
                <SelectContent>
                  {configValues?.style_tones?.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                How formal or casual should the writing be?
              </p>
            </div>

            {/* Article Length */}
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-1 font-medium">
                <FileText className="h-4 w-4" />
                Article Length
              </Label>
              <Select
                value={watchedValues.length || 'Medium (800-1500 words)'}
                onValueChange={(value) => setValue('length', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target length..." />
                </SelectTrigger>
                <SelectContent>
                  {configValues?.article_lengths?.map((length) => (
                    <SelectItem key={length} value={length}>
                      {length}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Target word count for generated content
              </p>
            </div>

            {/* Content Template */}
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-1 font-medium">
                <Layout className="h-4 w-4" />
                Content Type
              </Label>
              <Select
                value={watchedValues.template || 'Blog Post'}
                onValueChange={(value) => setValue('template', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose content type..." />
                </SelectTrigger>
                <SelectContent>
                  {configValues?.content_templates?.map((template) => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Structure and format for the article
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Saving...' : (topicId ? 'Update Topic' : 'Create Topic')}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
} 