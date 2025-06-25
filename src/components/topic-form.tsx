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
  style_tones: string[]
  article_lengths: string[]
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
      tone: initialData?.tone || '',
      length: initialData?.length || '',
      template: initialData?.template || '',
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
        tone: initialData.tone || '',
        length: initialData.length || '',
        template: initialData.template || '',
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

        {/* Style Preferences */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Style Preferences</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure how the content should be written when this topic is used for article generation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Tone</Label>
              <Select
                value={watchedValues.tone || 'default'}
                onValueChange={(value) => setValue('tone', value === 'default' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
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
                value={watchedValues.length || 'default'}
                onValueChange={(value) => setValue('length', value === 'default' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select length..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  {configValues?.article_lengths?.map((length) => (
                    <SelectItem key={length} value={length}>
                      {length}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Content Template</Label>
              <Select
                value={watchedValues.template || 'default'}
                onValueChange={(value) => setValue('template', value === 'default' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
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

        {/* Error Display */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!isValid || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {topicId ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              topicId ? 'Update Topic' : 'Create Topic'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 