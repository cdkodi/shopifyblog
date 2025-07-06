'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopicDashboard } from '../../components/topic-dashboard'
import { TopicFormEnhanced } from '../../components/topic-form-enhanced'
import type { Database } from '../../lib/types/database'
import { dbTopicToFormData } from '../../lib/types/database'

type Topic = Database['public']['Tables']['topics']['Row']
type TopicWithStatus = Database['public']['Views']['topics_with_article_status']['Row']

type ViewMode = 'dashboard' | 'create' | 'edit'

export default function TopicsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
    
    // Navigate to content generation page with topic data
    const params = new URLSearchParams()
    
    // Add topic ID for linking
    if (topic.id) {
      params.set('topicId', topic.id)
    }
    
    // Add topic title
    if (topic.topic_title) {
      params.set('topic', topic.topic_title)
    }
    
    // Add keywords
    if (topic.keywords) {
      const keywordsStr = Array.isArray(topic.keywords) 
        ? topic.keywords.join(', ')
        : typeof topic.keywords === 'string' 
          ? topic.keywords 
          : ''
      if (keywordsStr) {
        params.set('keywords', keywordsStr)
      }
    }
    
    // Add style preferences
    if (topic.style_preferences) {
      const prefs = topic.style_preferences as any
      console.log('🎨 Processing style preferences:', prefs);
      console.log('🎨 Template value:', prefs.template, typeof prefs.template);
      
      if (prefs.tone) params.set('tone', prefs.tone)
      if (prefs.length) params.set('length', prefs.length)
      if (prefs.template_type || prefs.template) {
        const template = prefs.template_type || prefs.template;
        params.set('template', template)
        console.log('✅ Added template to URL:', template);
      } else {
        console.log('❌ Template is empty/null. Available fields:', Object.keys(prefs));
      }
    } else {
      console.log('❌ No style_preferences found on topic');
    }
    
    const finalUrl = `/content-generation?${params.toString()}`;
    console.log('🔗 Final URL:', finalUrl);
    
    // Navigate to content generation with pre-filled data
    router.push(finalUrl)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {viewMode === 'dashboard' && (
          <TopicDashboard
            key={refreshKey}
            onCreateTopic={handleCreateTopic}
            onEditTopic={handleEditTopic}
            onGenerateContent={handleGenerateContent}
          />
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
  )
} 