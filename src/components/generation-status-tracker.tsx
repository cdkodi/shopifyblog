'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Clock, Eye, Layout, FileText, Sparkles, Target, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'

interface GenerationProgress {
  jobId: string
  articleId?: string
  phase: 'queued' | 'analyzing' | 'structuring' | 'writing' | 'optimizing' | 'finalizing' | 'completed' | 'error'
  percentage: number
  currentStep: string
  estimatedTimeRemaining?: number
  startTime?: string
  metadata?: {
    wordCount?: number
    seoScore?: number
    provider?: string
    cost?: number
  }
}

interface GenerationStatusTrackerProps {
  jobId: string
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onCancel?: () => void
  autoRefresh?: boolean
  showActions?: boolean
}

const PHASE_CONFIG = {
  queued: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Queued',
    description: 'Waiting for processing slot'
  },
  analyzing: {
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    label: 'Analyzing',
    description: 'Understanding topic requirements'
  },
  structuring: {
    icon: Layout,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    label: 'Structuring',
    description: 'Creating content outline'
  },
  writing: {
    icon: FileText,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    label: 'Writing',
    description: 'Generating article content'
  },
  optimizing: {
    icon: Sparkles,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    label: 'Optimizing',
    description: 'Enhancing SEO and readability'
  },
  finalizing: {
    icon: Target,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    label: 'Finalizing',
    description: 'Final quality checks'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Completed',
    description: 'Article ready for review'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    label: 'Error',
    description: 'Generation failed'
  }
}

export function GenerationStatusTracker({ 
  jobId, 
  onComplete, 
  onError, 
  onCancel,
  autoRefresh = true,
  showActions = true
}: GenerationStatusTrackerProps) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/ai/v2-queue?jobId=${jobId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch progress')
      }

      if (result.success && result.data) {
        setProgress(result.data)
        setLastUpdated(new Date())
        
        // Handle completion
        if (result.data.phase === 'completed') {
          onComplete?.(result.data)
        } else if (result.data.phase === 'error') {
          onError?.(result.data.currentStep || 'Generation failed')
        }
      }
    } catch (err) {
      console.error('Failed to fetch generation progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch progress')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/ai/v2-queue`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId })
      })

      if (response.ok) {
        onCancel?.()
      }
    } catch (err) {
      console.error('Failed to cancel generation:', err)
    }
  }

  const handleRetry = async () => {
    setIsLoading(true)
    setError(null)
    await fetchProgress()
  }

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (progress?.phase && !['completed', 'error'].includes(progress.phase)) {
        fetchProgress()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, progress?.phase])

  // Initial fetch
  useEffect(() => {
    fetchProgress()
  }, [jobId])

  if (isLoading && !progress) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
          <span className="text-gray-600">Loading generation status...</span>
        </div>
      </Card>
    )
  }

  if (error && !progress) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-600">Error: {error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  if (!progress) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="text-center text-gray-500">
          No generation progress found
        </div>
      </Card>
    )
  }

  const phaseConfig = PHASE_CONFIG[progress.phase]
  const IconComponent = phaseConfig.icon

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${phaseConfig.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${phaseConfig.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Content Generation
              </h3>
              <p className="text-sm text-gray-600">
                {phaseConfig.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={phaseConfig.bgColor}>
              {phaseConfig.label}
            </Badge>
            <Badge variant="outline" className="bg-white">
              {progress.percentage}%
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{progress.currentStep}</span>
            {progress.estimatedTimeRemaining && progress.phase !== 'completed' && (
              <span className="text-gray-500">
                ~{Math.ceil(progress.estimatedTimeRemaining / 60)}m remaining
              </span>
            )}
          </div>
          <Progress 
            value={progress.percentage} 
            className="h-2"
          />
        </div>

        {/* Phase Timeline */}
        <div className="flex items-center justify-between text-xs">
          {Object.entries(PHASE_CONFIG).slice(0, -1).map(([phase, config], index) => {
            const isActive = progress.phase === phase
            const isCompleted = Object.keys(PHASE_CONFIG).indexOf(progress.phase) > index
            
            return (
              <div key={phase} className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isActive ? config.bgColor : 
                  isCompleted ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <config.icon className={`h-3 w-3 ${
                    isActive ? config.color :
                    isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <span className={`mt-1 ${
                  isActive ? 'text-gray-900 font-medium' :
                  isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {config.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Metadata */}
        {progress.metadata && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
            {progress.metadata.wordCount && (
              <div className="text-sm">
                <span className="text-gray-500">Word Count:</span>
                <span className="ml-2 font-medium">{progress.metadata.wordCount}</span>
              </div>
            )}
            {progress.metadata.seoScore && (
              <div className="text-sm">
                <span className="text-gray-500">SEO Score:</span>
                <span className="ml-2 font-medium">{progress.metadata.seoScore}/100</span>
              </div>
            )}
            {progress.metadata.provider && (
              <div className="text-sm">
                <span className="text-gray-500">Provider:</span>
                <span className="ml-2 font-medium capitalize">{progress.metadata.provider}</span>
              </div>
            )}
            {progress.metadata.cost && (
              <div className="text-sm">
                <span className="text-gray-500">Cost:</span>
                <span className="ml-2 font-medium">${progress.metadata.cost.toFixed(3)}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <div className="flex gap-2">
              {progress.phase === 'completed' && progress.articleId && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`/articles/${progress.articleId}/edit`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Review Article
                </Button>
              )}
              {!['completed', 'error'].includes(progress.phase) && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={fetchProgress}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
} 