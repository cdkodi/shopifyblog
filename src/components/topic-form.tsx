'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  industries: string[]
  market_segments: string[]
  style_tones: string[]
  article_lengths: string[]
  target_audiences: string[]
  content_templates: string[]
}

export function TopicForm({ initialData, topicId, onSuccess, onCancel }: TopicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [configValues, setConfigValues] = useState<ConfigValues | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      title: initialData?.title || '',
      keywords: initialData?.keywords || '',
      industry: initialData?.industry || '',
      market_segment: initialData?.market_segment || '',
      priority: initialData?.priority || 5,
      search_volume: initialData?.search_volume || undefined,
      competition_score: initialData?.competition_score || undefined,
      style_preferences: {
        tone: initialData?.style_preferences?.tone || '',
        length: initialData?.style_preferences?.length || '',
        target_audience: initialData?.style_preferences?.target_audience || '',
        template: initialData?.style_preferences?.template || '',
      },
    },
    mode: 'onChange',
  })

  const watchedValues = watch()

  // Load configuration values
  useEffect(() => {
    async function loadConfig() {
      const { data, error } = await TopicService.getConfigValues()
      if (data && !error) {
        setConfigValues(data)
      }
    }
    loadConfig()
  }, [])

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        keywords: initialData.keywords || '',
        industry: initialData.industry || '',
        market_segment: initialData.market_segment || '',
        priority: initialData.priority || 5,
        search_volume: initialData.search_volume || undefined,
        competition_score: initialData.competition_score || undefined,
        style_preferences: {
          tone: initialData.style_preferences?.tone || '',
          length: initialData.style_preferences?.length || '',
          target_audience: initialData.style_preferences?.target_audience || '',
          template: initialData.style_preferences?.template || '',
        },
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: TopicFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let result
      if (topicId) {
        result = await TopicService.updateTopic(topicId, data)
      } else {
        result = await TopicService.createTopic(data)
      }

      if (result.error) {
        setSubmitError(result.error)
      } else {
        onSuccess?.(result.data)
        if (!topicId) {
          reset() // Reset form after successful creation
        }
      }
    } catch (error) {
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
        {/* Title - Required */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-gray-700">
            Topic Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Enter topic title..."
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label htmlFor="keywords" className="text-gray-700">
            Keywords
          </Label>
          <Textarea
            id="keywords"
            {...register('keywords')}
            placeholder="Enter relevant keywords (comma-separated)..."
            rows={3}
            className={errors.keywords ? 'border-red-500' : ''}
          />
          {errors.keywords && (
            <p className="text-sm text-red-600">{errors.keywords.message}</p>
          )}
          <p className="text-sm text-gray-500">
            Optional: Add keywords to help with SEO and content targeting
          </p>
        </div>

        {/* Industry & Market Segment */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Industry</Label>
            <Select
              value={watchedValues.industry || ''}
              onValueChange={(value) => setValue('industry', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {configValues?.industries?.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Market Segment</Label>
            <Select
              value={watchedValues.market_segment || ''}
              onValueChange={(value) => setValue('market_segment', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select segment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {configValues?.market_segments?.map((segment) => (
                  <SelectItem key={segment} value={segment}>
                    {segment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Style Preferences */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Style Preferences</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure how the content should be written when this topic is used for article generation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Tone</Label>
              <Select
                value={watchedValues.style_preferences?.tone || ''}
                onValueChange={(value) => setValue('style_preferences.tone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {configValues?.style_tones?.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Article Length</Label>
              <Select
                value={watchedValues.style_preferences?.length || ''}
                onValueChange={(value) => setValue('style_preferences.length', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select length..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {configValues?.article_lengths?.map((length) => (
                    <SelectItem key={length} value={length}>
                      {length}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Target Audience</Label>
              <Select
                value={watchedValues.style_preferences?.target_audience || ''}
                onValueChange={(value) => setValue('style_preferences.target_audience', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audience..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {configValues?.target_audiences?.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {audience}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Content Template</Label>
              <Select
                value={watchedValues.style_preferences?.template || ''}
                onValueChange={(value) => setValue('style_preferences.template', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {configValues?.content_templates?.map((template) => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Priority & SEO Metrics */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-gray-700">
              Priority (1-10)
            </Label>
            <Input
              id="priority"
              type="number"
              min="1"
              max="10"
              {...register('priority', { valueAsNumber: true })}
              className={errors.priority ? 'border-red-500' : ''}
            />
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="search_volume" className="text-gray-700">
              Search Volume
            </Label>
            <Input
              id="search_volume"
              type="number"
              min="0"
              {...register('search_volume', { valueAsNumber: true })}
              placeholder="Monthly searches..."
              className={errors.search_volume ? 'border-red-500' : ''}
            />
            {errors.search_volume && (
              <p className="text-sm text-red-600">{errors.search_volume.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="competition_score" className="text-gray-700">
              Competition (0-100)
            </Label>
            <Input
              id="competition_score"
              type="number"
              min="0"
              max="100"
              {...register('competition_score', { valueAsNumber: true })}
              placeholder="Competition level..."
              className={errors.competition_score ? 'border-red-500' : ''}
            />
            {errors.competition_score && (
              <p className="text-sm text-red-600">{errors.competition_score.message}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {topicId ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              topicId ? 'Update Topic' : 'Create Topic'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 