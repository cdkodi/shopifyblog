'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { TopicDashboard } from '../../components/topic-dashboard'
import { TopicFormEnhanced } from '../../components/topic-form-enhanced'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, FileText, Sparkles, Target, Layout, Eye, RefreshCw } from 'lucide-react'
import type { Database } from '../../lib/types/database'
import { dbTopicToFormData } from '../../lib/types/database'

type Topic = Database['public']['Tables']['topics']['Row']
type TopicWithStatus = Database['public']['Views']['topics_with_article_status']['Row']

type ViewMode = 'dashboard' | 'create' | 'edit'

interface GenerationProgress {
  jobId: string
  phase: 'queued' | 'analyzing' | 'structuring' | 'writing' | 'optimizing' | 'finalizing' | 'completed' | 'error'
  percentage: number
  currentStep: string
  estimatedTimeRemaining?: number
  articleId?: string
}

export default function TopicsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Generation state
  const [showGenerationDialog, setShowGenerationDialog] = useState(false)
  const [selectedTopicForGeneration, setSelectedTopicForGeneration] = useState<TopicWithStatus | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const handleCreateTopic = () => {
    setEditingTopic(null)
    setViewMode('create')
  }

  const handleEditTopic = (topic: TopicWithStatus) => {
    // Convert TopicWithStatus to Topic for editing
    const topicForEdit: Topic = {
      id: topic.id!,
      topic_title: topic.topic_title!,
      keywords: topic.keywords,
      content_template: topic.content_template,
      style_preferences: topic.style_preferences,
      competition_score: topic.competition_score,
      created_at: topic.created_at,
      industry: topic.industry,
      market_segment: topic.market_segment,
      priority_score: topic.priority_score,
      search_volume: topic.search_volume,
      status: topic.status,
      used_at: topic.used_at,
    }
    setEditingTopic(topicForEdit)
    setViewMode('edit')
  }

  const handleFormSuccess = () => {
    setViewMode('dashboard')
    setEditingTopic(null)
    setRefreshKey(prev => prev + 1) // Force dashboard refresh
  }

  const handleFormCancel = () => {
    setViewMode('dashboard')
    setEditingTopic(null)
  }

  const handleGenerateContent = (topic: TopicWithStatus) => {
    console.log('🚀 Generate clicked for topic:', topic);
    console.log('📊 Style preferences:', topic.style_preferences);
    console.log('🔍 Topic structure:', {
      id: topic.id,
      idType: typeof topic.id,
      title: topic.topic_title,
      hasStylePrefs: !!topic.style_preferences
    });
    
    // Check if topic has required data
    if (!topic.topic_title) {
      alert('Topic must have a title to generate content');
      return;
    }

    // Enhanced debugging for Safari issues
    if (!topic.id) {
      console.error('❌ SAFARI DEBUG: Topic has no ID!', topic);
      alert('Topic is missing an ID. Please refresh the page and try again.');
      return;
    }

    // Extract template from style preferences
    let template = 'article'; // default
    if (topic.style_preferences) {
      const prefs = topic.style_preferences as any;
      template = prefs.template_type || prefs.template || 'article';
    }

    if (!template || template === 'article') {
      alert('Topic must have a content template selected to generate content. Please edit the topic and select a template.');
      return;
    }

    console.log('✅ SAFARI DEBUG: Topic validation passed', {
      id: topic.id,
      template: template,
      title: topic.topic_title
    });

    setSelectedTopicForGeneration(topic);
    setShowGenerationDialog(true);
  }

  // Add force refresh function
  const forceRefreshTopics = () => {
    console.log('🔄 Force refreshing topics data...');
    setRefreshKey(prev => prev + 1);
  }

  const confirmGeneration = async () => {
    if (!selectedTopicForGeneration) {
      alert('No topic selected for generation');
      return;
    }

    const topic = selectedTopicForGeneration;
    
    // Enhanced validation with debugging
    console.log('🎬 confirmGeneration started for topic:', topic.topic_title);
    console.log('📊 Full topic object:', topic);
    console.log('🔍 Topic ID:', topic.id, 'Type:', typeof topic.id);
    
    // Validate topic ID exists and is a valid UUID format
    if (!topic.id) {
      alert('Topic ID is missing. Please refresh the page and try again.');
      setShowGenerationDialog(false);
      return;
    }
    
    // Basic UUID format validation (should be 36 characters with hyphens)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(topic.id)) {
      console.error('❌ Invalid topic ID format:', topic.id);
      alert(`Invalid topic ID format: ${topic.id}. Please refresh the page and try again.`);
      setShowGenerationDialog(false);
      return;
    }

    console.log('✅ Topic ID validation passed:', topic.id);

    setShowGenerationDialog(false);
    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Extract data from topic
      const prefs = topic.style_preferences as any || {};
      const template = prefs.template_type || prefs.template || 'article';
      const tone = prefs.tone || 'professional';
      const length = prefs.length || 'medium';
      
      // Handle keywords
      let keywordsStr = '';
      if (topic.keywords) {
        if (Array.isArray(topic.keywords)) {
          keywordsStr = topic.keywords.join(', ');
        } else if (typeof topic.keywords === 'string') {
          keywordsStr = topic.keywords;
        }
      }

      // Build request body for V2 API with validated data
      const requestBody = {
        topic: {
          id: topic.id, // Now validated to be a proper UUID
          title: topic.topic_title,
          keywords: keywordsStr,
          tone: tone,
          length: length,
          template: template
        },
        optimizeForSEO: true,
        targetWordCount: 800, // default
        createArticle: true // Create article immediately
      };

      console.log('📋 Sending direct V2 generation request:', requestBody);
      console.log('🔍 Request body topic ID:', requestBody.topic.id);

      // Show immediate progress for direct generation
      setGenerationProgress({
        jobId: `direct_${Date.now()}`,
        phase: 'writing',
        percentage: 10,
        currentStep: 'Starting content generation...',
        estimatedTimeRemaining: 120
      });

      const response = await fetch('/api/ai/v2-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Direct generation response status:', response.status);

      const result = await response.json();
      console.log('📦 Direct generation response data:', result);

      if (!response.ok) {
        let errorMessage = 'Failed to generate content';
        if (result.error) {
          errorMessage = typeof result.error === 'string' ? result.error : result.error.message || errorMessage;
        }
        console.log('❌ Direct generation failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Update progress to completion
      setGenerationProgress({
        jobId: `direct_${Date.now()}`,
        phase: 'completed',
        percentage: 100,
        currentStep: result.data?.articleCreation?.article ? 'Article created successfully!' : 'Content generated successfully!',
        estimatedTimeRemaining: 0
      });

      console.log('🎯 Direct generation completed successfully!');
      console.log('📊 Full API response structure:', JSON.stringify(result, null, 2));
      
      // Navigate to article or show success
      if (result.data?.articleCreation?.success && result.data?.articleCreation?.article?.id) {
        const articleId = result.data.articleCreation.article.id;
        console.log('✅ Article created successfully, navigating to:', articleId);
        
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(null);
          router.push(`/articles/${articleId}/edit`);
        }, 2000);
      } else {
        // Handle failed article creation
        console.log('⚠️ Article creation failed or missing article ID');
        console.log('📊 Article creation data:', result.data?.articleCreation);
        
        let errorMsg = 'Content generated successfully, but failed to create article record.';
        if (result.data?.articleCreation?.error) {
          errorMsg += ` Error: ${result.data.articleCreation.error}`;
        }
        
        setGenerationError(errorMsg);
        
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(null);
          setRefreshKey(prev => prev + 1); // Refresh dashboard
        }, 3000);
      }

    } catch (error) {
      console.error('💥 Direct generation failed:', error);
      
      // Update progress to show error
      setGenerationProgress({
        jobId: `direct_${Date.now()}`,
        phase: 'error',
        percentage: 0,
        currentStep: 'Generation failed',
        estimatedTimeRemaining: 0
      });
      
      let errorMessage = 'Failed to generate content';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setGenerationError(errorMessage);
      
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(null);
      }, 3000);
    }
  };

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
  };

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
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Generation Progress Display */}
          {isGenerating && generationProgress && (
            <Card className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`${getPhaseColor(generationProgress.phase)}`}>
                      {getPhaseIcon(generationProgress.phase)}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {generationProgress.phase === 'completed' ? 'Generation Complete!' : 'Generating Content...'}
                    </h3>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {generationProgress.percentage}%
                  </span>
                </div>

                <Progress value={generationProgress.percentage} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{generationProgress.currentStep}</span>
                  {generationProgress.estimatedTimeRemaining && generationProgress.estimatedTimeRemaining > 0 && (
                    <span className="text-gray-500">
                      ~{Math.ceil(generationProgress.estimatedTimeRemaining / 60)} min remaining
                    </span>
                  )}
                </div>

                {generationError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {generationError}
                  </div>
                )}
              </div>
            </Card>
          )}

          {viewMode === 'dashboard' && (
            <>
              {/* Page Header with Refresh Button */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Topics Dashboard</h1>
                  <p className="text-gray-600">Manage and generate articles from your topics</p>
                </div>
                <button
                  onClick={forceRefreshTopics}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Force refresh topics data (helpful if you see caching issues)"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
              
              <TopicDashboard
                key={refreshKey}
                onCreateTopic={handleCreateTopic}
                onEditTopic={handleEditTopic}
                onGenerateContent={handleGenerateContent}
              />
            </>
          )}
          
          {(viewMode === 'create' || viewMode === 'edit') && (
            <div className="max-w-4xl mx-auto">
              {/* Breadcrumb */}
              <div className="mb-6">
                <button
                  onClick={handleFormCancel}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  ← Back to Dashboard
                </button>
              </div>
              
              <TopicFormEnhanced
                initialData={editingTopic ? dbTopicToFormData(editingTopic) : undefined}
                topicId={editingTopic?.id}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          )}
        </div>
      </div>

      {/* Generation Confirmation Dialog */}
      <AlertDialog open={showGenerationDialog} onOpenChange={setShowGenerationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Article from Topic</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTopicForGeneration && (
                <>
                  This will use AI to generate a complete article based on "{selectedTopicForGeneration.topic_title}". The process will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Create SEO-optimized content using the configured template</li>
                    <li>Target approximately 800 words</li>
                    <li>Use the configured tone and include keywords</li>
                    <li>Generate meta descriptions and optimize for search engines</li>
                  </ul>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Estimated Cost:</span>
                      <span className="text-blue-600">$0.015</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Processing Time:</span>
                      <span className="text-blue-600">2-3 minutes</span>
                    </div>
                  </div>
                </>
              )}
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
    </ProtectedRoute>
  )
} 