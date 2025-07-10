'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Palette, FileText, Layout, Sparkles, Target, Clock, Zap, Eye, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog'
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

interface GenerationProgress {
  jobId: string
  phase: 'queued' | 'analyzing' | 'structuring' | 'writing' | 'optimizing' | 'finalizing' | 'completed' | 'error'
  percentage: number
  currentStep: string
  estimatedTimeRemaining?: number
  articleId?: string
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
  
  // V2 Generation States
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [showGenerationDialog, setShowGenerationDialog] = useState(false)
  const [generationResult, setGenerationResult] = useState<any>(null)
  const [estimatedCost, setEstimatedCost] = useState<number>(0)

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
    mode: 'onBlur', // Change from 'onChange' to 'onBlur' to reduce validation frequency
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
          setValue('template', defaultTemplate.name, { shouldValidate: true })
          setSelectedTemplate(defaultTemplate)
        } else if (templates && templates.length > 0 && watchedValues.template) {
          // If template is already set, make sure selectedTemplate is updated
          const existingTemplate = templates.find(t => t.name === watchedValues.template)
          if (existingTemplate) {
            setSelectedTemplate(existingTemplate)
          }
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
      // Update estimated cost
      if (template) {
        setEstimatedCost(template.estimatedCost)
      }
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
        const response = await fetch(`/api/seo/keywords?keyword=${encodeURIComponent(title)}&limit=10`)
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
          setTitleSuggestions(result.titles.slice(0, 5))
        } else {
          setTitleSuggestions([])
        }
      } catch (error) {
        console.error('Title suggestion failed:', error)
        setTitleError('Failed to generate title suggestions. You can still enter titles manually.')
        setTitleSuggestions([])
      } finally {
        setLoadingTitles(false)
      }
    }

    const debounceTimer = setTimeout(generateTitleSuggestions, 1500)
    return () => clearTimeout(debounceTimer)
  }, [watchedValues.title, watchedValues.tone, watchedValues.template, watchedValues.keywords])

  // Poll for generation progress
  useEffect(() => {
    if (!isGenerating || !generationProgress?.jobId) return

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/ai/v2-queue?jobId=${generationProgress.jobId}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setGenerationProgress(result.data)
          
          if (result.data.phase === 'completed') {
            setIsGenerating(false)
            setGenerationResult(result.data)
          } else if (result.data.phase === 'error') {
            setIsGenerating(false)
            setSubmitError(result.data.currentStep || 'Generation failed')
          }
        } else {
          // Handle API error objects properly
          let errorMessage = 'Failed to check progress';
          if (result.error) {
            if (typeof result.error === 'string') {
              errorMessage = result.error;
            } else if (result.error.message) {
              errorMessage = result.error.message;
            }
          }
          console.error('Progress polling failed:', errorMessage);
        }
      } catch (error) {
        console.error('Failed to poll generation progress:', error)
        // Only set error if we're still generating to avoid overriding other errors
        if (isGenerating) {
          let errorMessage = 'Failed to check progress';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          setSubmitError(errorMessage);
        }
      }
    }

    const interval = setInterval(pollProgress, 2000)
    return () => clearInterval(interval)
  }, [isGenerating, generationProgress?.jobId])

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

  const handleGenerateAndPublish = async () => {
    console.log('🔥 Generate & Publish button clicked!')
    console.log('📊 Form validation state:', {
      isValid,
      watchedValues,
      errors,
      title: watchedValues.title,
      titleLength: watchedValues.title?.trim().length
    })
    
    // Check if form is actually valid by checking required fields manually
    const isFormActuallyValid = watchedValues.title && watchedValues.title.trim().length >= 3
    const hasTemplate = watchedValues.template && watchedValues.template.trim().length > 0
    
    console.log('✅ Manual validation:', { 
      isFormActuallyValid, 
      hasTemplate,
      template: watchedValues.template 
    })
    
    if (!isValid && !isFormActuallyValid) {
      console.log('❌ Validation failed - title issue')
      setSubmitError('Please enter a topic title with at least 3 characters')
      return
    }
    
    if (!hasTemplate) {
      console.log('❌ Validation failed - no template selected')
      setSubmitError('Please select a content template before generating content')
      return
    }

    console.log('🎯 Opening generation dialog...')
    setShowGenerationDialog(true)
  }

  const confirmGeneration = async () => {
    console.log('🎬 confirmGeneration started')
    setShowGenerationDialog(false)
    setIsGenerating(true)
    setSubmitError(null)

    try {
      // First, save the topic if it's new
      let topicData = watchedValues
      let savedTopicId = topicId

      console.log('💾 Topic data:', topicData)
      console.log('🆔 Current topicId:', topicId)

      if (!topicId) {
        console.log('📝 Creating new topic...')
        const result = await TopicService.createTopic({
          ...topicData
        })

        if (result.error || !result.data) {
          throw new Error(`Failed to create topic: ${result.error}`)
        }

        savedTopicId = result.data.id
        console.log('✅ Topic created with ID:', savedTopicId)
      }

      // Queue the generation
      const requestBody = {
        action: 'queue', // Add the missing action parameter
        topic: {
          id: savedTopicId,
          title: topicData.title,
          keywords: topicData.keywords,
          tone: topicData.tone,
          length: topicData.length,
          template: topicData.template
        },
        optimizeForSEO: true,
        targetWordCount: selectedTemplate?.targetLength || 800
      }

      console.log('📋 Sending generation request:', requestBody)

      const response = await fetch('/api/ai/v2-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response ok:', response.ok)

      const result = await response.json()
      console.log('📦 Response data:', result)

      if (!response.ok) {
        // Handle API error objects properly
        let errorMessage = 'Failed to queue generation';
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error.message) {
            errorMessage = result.error.message;
          }
        }
        console.log('❌ Request failed:', errorMessage)
        throw new Error(errorMessage)
      }

      console.log('🎯 Setting generation progress with jobId:', result.data.jobId)
      
      setGenerationProgress({
        jobId: result.data.jobId,
        phase: 'queued',
        percentage: 0,
        currentStep: 'Generation queued...',
        estimatedTimeRemaining: Math.ceil((new Date(result.data.estimatedCompletion).getTime() - Date.now()) / 1000)
      })

    } catch (error) {
      console.error('💥 Generation failed:', error)
      // Ensure error message is always a string
      let errorMessage = 'Failed to start generation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setSubmitError(errorMessage)
      setIsGenerating(false)
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

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'queued': return <Clock className="h-4 w-4" />
      case 'analyzing': return <Eye className="h-4 w-4" />
      case 'structuring': return <Layout className="h-4 w-4" />
      case 'writing': return <FileText className="h-4 w-4" />
      case 'optimizing': return <Sparkles className="h-4 w-4" />
      case 'finalizing': return <Target className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'queued': return 'text-gray-500'
      case 'analyzing': return 'text-blue-500'
      case 'structuring': return 'text-purple-500'
      case 'writing': return 'text-green-500'
      case 'optimizing': return 'text-yellow-500'
      case 'finalizing': return 'text-orange-500'
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
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

      {/* Generation Progress Display */}
      {isGenerating && generationProgress && (
        <Card className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${getPhaseColor(generationProgress.phase)} animate-pulse`}>
                {getPhaseIcon(generationProgress.phase)}
              </div>
              <span className="font-medium text-gray-900">
                Generating Content
              </span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {generationProgress.percentage}%
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress.percentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{generationProgress.currentStep}</span>
            {generationProgress.estimatedTimeRemaining && (
              <span className="text-gray-500">
                ~{Math.ceil(generationProgress.estimatedTimeRemaining / 60)}m remaining
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Generation Result Display */}
      {generationResult && (
        <Card className="mb-6 p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Content Generated Successfully!</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Word Count:</span>
              <span className="ml-2 font-medium">{generationResult.wordCount || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">SEO Score:</span>
              <span className="ml-2 font-medium">{generationResult.seoScore || 'N/A'}/100</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(`/articles/${generationResult.articleId}/edit`, '_blank')}>
              <Eye className="h-4 w-4 mr-1" />
              Review Article
            </Button>
            <Button size="sm" variant="outline" onClick={() => setGenerationResult(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

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
            placeholder="e.g., digital marketing, SEO, social media, content strategy"
            className={`min-h-[80px] ${errors.keywords ? 'border-red-500' : ''}`}
          />
          {errors.keywords && (
            <p className="text-sm text-red-600">{errors.keywords.message}</p>
          )}
          
          {keywordError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800">⚠️ {keywordError}</p>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            Separate keywords with commas. These will be used for SEO optimization and content focus.
          </p>
        </div>

        {/* Content Template Selection */}
        <div className="space-y-3">
          <Label className="text-gray-700 font-medium flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Content Template <span className="text-red-500">*</span>
          </Label>
          
          <p className="text-sm text-gray-600">
            Choose the structure and approach for your article. Each template is optimized for different content types and SEO goals.
          </p>
          
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
        
        {/* Template Required Warning */}
        {watchedValues.title && watchedValues.title.trim().length >= 3 && !watchedValues.template && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-700">
              📝 <strong>Template Required:</strong> Please select a content template above to enable the "Generate & Publish" feature.
            </p>
          </div>
        )}

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs">
            <div className="font-medium mb-2">Debug Info:</div>
            <div>Form Valid: {isValid ? 'Yes' : 'No'}</div>
            <div>Errors: {JSON.stringify(errors)}</div>
            <div>Values: {JSON.stringify(watchedValues)}</div>
            <div>Template Selected: {selectedTemplate?.name || 'None'}</div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {(() => {
            // More robust validation check
            const isFormActuallyValid = watchedValues.title && watchedValues.title.trim().length >= 3
            const hasTemplate = watchedValues.template && watchedValues.template.trim().length > 0
            const shouldDisable = (!isValid && !isFormActuallyValid) || !hasTemplate
            
            console.log('🔍 Button state check:', {
              isValid,
              isFormActuallyValid,
              hasTemplate,
              template: watchedValues.template,
              shouldDisable,
              isSubmitting,
              isGenerating,
              finalDisabled: shouldDisable || isSubmitting || isGenerating
            })
            
            return (
              <>
                <Button
                  type="submit"
                  disabled={shouldDisable || isSubmitting || isGenerating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? 'Saving...' : (topicId ? 'Update Topic' : 'Create Topic')}
                </Button>
                
                <Button
                  type="button"
                  disabled={shouldDisable || isSubmitting || isGenerating}
                  onClick={handleGenerateAndPublish}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate & Publish'}
                </Button>
              </>
            )
          })()}
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isGenerating}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Generation Confirmation Dialog */}
      <AlertDialog open={showGenerationDialog} onOpenChange={setShowGenerationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate & Publish Article</AlertDialogTitle>
            <AlertDialogDescription>
              This will use AI to generate a complete article based on your topic configuration. The process will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create SEO-optimized content using the "{watchedValues.template}" template</li>
                <li>Target approximately {selectedTemplate?.targetLength || 800} words</li>
                <li>Use "{watchedValues.tone}" tone and include your keywords</li>
                <li>Generate meta descriptions and optimize for search engines</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Estimated Cost:</span>
                  <span className="text-blue-600">${estimatedCost.toFixed(3)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Processing Time:</span>
                  <span className="text-blue-600">2-5 minutes</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGeneration}>
              Generate Article
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 