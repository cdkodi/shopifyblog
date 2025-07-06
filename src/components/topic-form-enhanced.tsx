'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Palette, FileText, Layout, Sparkles, Target, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { topicSchema, type TopicFormData } from '../lib/validations/topic'
import { TopicService } from '../lib/supabase/topics'
import { ContentTemplateService, ContentTemplate } from '../lib/supabase/content-templates'

interface TopicFormProps {
  initialData?: Partial<TopicFormData>
  topicId?: string
  onSuccess?: (topic: any) => void
  onCancel?: () => void
}

interface ConfigValues {
  style_tones: string[]
  article_lengths: string[]
  content_templates: ContentTemplate[]
}

export function TopicFormEnhanced({ initialData, topicId, onSuccess, onCancel }: TopicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState<ConfigValues | null>(null)
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([])
  const [keywordError, setKeywordError] = useState<string | null>(null)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [loadingTitles, setLoadingTitles] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null)

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
      template: initialData?.template || '',
    },
    mode: 'onChange',
  })

  const watchedValues = watch()

  // Load config values including actual content templates
  useEffect(() => {
    const loadConfigValues = async () => {
      try {
        // Load actual content templates from service
        const { data: templates, error: templateError } = await ContentTemplateService.getContentTemplates()
        
        if (templateError) {
          console.error('Failed to load templates:', templateError)
          // Fallback to mock data
          setConfigValues({
            style_tones: ['Professional', 'Conversational', 'Educational', 'Inspirational', 'Humorous', 'Story Telling'],
            article_lengths: ['Short (500-800 words)', 'Medium (800-1500 words)', 'Long (1500-3000 words)', 'Extended (3000+ words)'],
            content_templates: []
          })
          return
        }

        setConfigValues({
          style_tones: ['Professional', 'Conversational', 'Educational', 'Inspirational', 'Humorous', 'Story Telling'],
          article_lengths: ['Short (500-800 words)', 'Medium (800-1500 words)', 'Long (1500-3000 words)', 'Extended (3000+ words)'],
          content_templates: templates || []
        })

        // Set default template if none selected
        if (templates && templates.length > 0 && !watchedValues.template) {
          const defaultTemplate = templates.find(t => t.name === 'How-To Guide') || templates[0]
          setValue('template', defaultTemplate.name)
          setSelectedTemplate(defaultTemplate)
        }
      } catch (error) {
        console.error('Error loading config values:', error)
        // Fallback to mock data
        setConfigValues({
          style_tones: ['Professional', 'Conversational', 'Educational', 'Inspirational', 'Humorous', 'Story Telling'],
          article_lengths: ['Short (500-800 words)', 'Medium (800-1500 words)', 'Long (1500-3000 words)', 'Extended (3000+ words)'],
          content_templates: []
        })
      }
    }

    loadConfigValues()
  }, [setValue, watchedValues.template])

  // Update selected template when template field changes
  useEffect(() => {
    if (configValues?.content_templates && watchedValues.template) {
      const template = configValues.content_templates.find(t => t.name === watchedValues.template)
      setSelectedTemplate(template || null)
    }
  }, [watchedValues.template, configValues])

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        keywords: initialData.keywords || '',
        tone: initialData.tone || 'Professional',
        length: initialData.length || 'Medium (800-1500 words)',
        template: initialData.template || '',
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

  // AI-powered title suggestions when topic details change
  useEffect(() => {
    const generateTitleSuggestions = async () => {
      const title = watchedValues.title
      const tone = watchedValues.tone
      const template = watchedValues.template
      
      // Need at least a topic title with reasonable length
      if (!title || title.length < 10) {
        setTitleSuggestions([])
        return
      }

      setLoadingTitles(true)
      setTitleError(null)

      try {
        const response = await fetch('/api/ai/suggest-titles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            topic: title,
            tone: tone || 'Professional',
            targetAudience: 'intermediate readers',
            templateType: template || 'How-To Guide',
            keywords: watchedValues.keywords || ''
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate title suggestions')
        }

        if (result.success && result.titles && result.titles.length > 0) {
          setTitleSuggestions(result.titles)
        } else {
          setTitleSuggestions([])
          if (result.fallback && result.fallback.length > 0) {
            setTitleSuggestions(result.fallback)
          }
        }
      } catch (error) {
        console.error('Title generation failed:', error)
        setTitleError('Failed to generate title suggestions. You can enter a title manually.')
        setTitleSuggestions([])
      } finally {
        setLoadingTitles(false)
      }
    }

    const debounceTimer = setTimeout(generateTitleSuggestions, 2000)
    return () => clearTimeout(debounceTimer)
  }, [watchedValues.title, watchedValues.tone, watchedValues.template, watchedValues.keywords])

  const onSubmit = async (data: TopicFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Include the selected content template in the data
      const topicData = {
        ...data,
        content_template: data.template // Store the actual template name
      }

      let result;
      if (topicId) {
        result = await TopicService.updateTopic(topicId, topicData)
      } else {
        result = await TopicService.createTopic(topicData)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      onSuccess?.(result.data)
    } catch (error) {
      console.error('Topic submission failed:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save topic')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTitleSuggestionClick = (suggestion: string) => {
    setValue('title', suggestion, { shouldValidate: true })
  }

  const handleKeywordSuggestionClick = (keyword: string) => {
    const currentKeywords = watchedValues.keywords || ''
    const keywordArray = currentKeywords.split(',').map(k => k.trim()).filter(k => k)
    
    if (!keywordArray.includes(keyword)) {
      const newKeywords = [...keywordArray, keyword].join(', ')
      setValue('keywords', newKeywords, { shouldValidate: true })
    }
  }

  const handleTemplateSelect = (templateName: string) => {
    setValue('template', templateName, { shouldValidate: true })
    const template = configValues?.content_templates.find(t => t.name === templateName)
    setSelectedTemplate(template || null)
  }

  if (!configValues) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form configuration...</p>
        </div>
      </div>
    )
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
          <Label htmlFor="title" className="text-gray-700 font-medium flex items-center gap-2">
            Topic Title <span className="text-red-500">*</span>
            {loadingTitles && (
              <span className="text-purple-600 text-sm flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Generating title ideas...
              </span>
            )}
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
          
          {/* AI Title Suggestions */}
          {titleSuggestions.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-purple-800 flex items-center gap-2">
                  ✨ AI-Generated Title Suggestions 
                  {loadingTitles && (
                    <span className="text-purple-600 text-xs flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Generating...
                    </span>
                  )}
                </p>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  Click to use
                </span>
              </div>
              <div className="space-y-2">
                {titleSuggestions.map((title, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTitleSuggestionClick(title)}
                    className="w-full text-left p-3 bg-white border border-purple-100 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-900 group-hover:text-purple-900 flex-1 leading-relaxed">
                        {title}
                      </span>
                      <span className="text-xs text-purple-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        Use this title
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-2 text-center">
                💡 These titles are optimized for SEO and your selected tone
              </p>
            </div>
          )}
          
          {titleError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800">⚠️ {titleError}</p>
            </div>
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
                    onClick={() => handleKeywordSuggestionClick(keyword)}
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

        {/* Content Template Selection - Rich UI */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content Template</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the structure and format for your article. This will determine the AI generation approach.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configValues?.content_templates?.map((template) => (
              <Card 
                key={template.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  watchedValues.template === template.name 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateSelect(template.name)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{template.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        {template.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {template.targetLength}w
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        ${template.estimatedCost.toFixed(3)}
                      </Badge>
                    </div>
                    
                    {template.seoAdvantages && template.seoAdvantages.length > 0 && (
                      <div className="text-xs text-green-600">
                        ✓ {template.seoAdvantages[0]}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {errors.template && (
            <p className="text-red-500 text-sm">{errors.template.message}</p>
          )}
        </div>

        {/* Selected Template Details */}
        {selectedTemplate && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{selectedTemplate.icon}</div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">
                  Selected: {selectedTemplate.name}
                </h3>
                <p className="text-sm text-blue-700 mb-3">{selectedTemplate.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-blue-600 font-medium">Recommended Provider</div>
                    <div className="text-sm text-blue-800 capitalize">{selectedTemplate.recommendedProvider}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 font-medium">Target Length</div>
                    <div className="text-sm text-blue-800">{selectedTemplate.targetLength} words</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 font-medium">Estimated Cost</div>
                    <div className="text-sm text-blue-800">${selectedTemplate.estimatedCost.toFixed(3)}</div>
                  </div>
                </div>
                
                {selectedTemplate.seoAdvantages && selectedTemplate.seoAdvantages.length > 0 && (
                  <div>
                    <div className="text-xs text-blue-600 font-medium mb-1">SEO Advantages</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.seoAdvantages.map((advantage, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          {advantage}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedTemplate.exampleTitles && selectedTemplate.exampleTitles.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-blue-600 font-medium mb-1">Example Titles</div>
                    <div className="text-sm text-blue-700">
                      {selectedTemplate.exampleTitles.slice(0, 2).map((title, index) => (
                        <div key={index} className="mb-1">• {title}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Style Preferences Section */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Style Preferences</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure how the content should be written when this topic is used for article generation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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