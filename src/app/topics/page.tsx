'use client'

import { useState } from 'react'
import { TopicDashboard } from '../../components/topic-dashboard'
import { TopicForm } from '../../components/topic-form'
import type { Database } from '../../lib/types/database'

type Topic = Database['public']['Tables']['topics']['Row']

type ViewMode = 'dashboard' | 'create' | 'edit'

export default function TopicsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreateTopic = () => {
    setEditingTopic(null)
    setViewMode('create')
  }

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {viewMode === 'dashboard' && (
          <TopicDashboard
            key={refreshKey}
            onCreateTopic={handleCreateTopic}
            onEditTopic={handleEditTopic}
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
            
            <TopicForm
              initialData={editingTopic || undefined}
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