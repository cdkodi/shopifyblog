'use client'

import { useState } from 'react'
import { TopicFormEnhanced } from '../../components/topic-form-enhanced'
import { Button } from '../../components/ui/button'
import { ArrowLeft, Monitor, Smartphone } from 'lucide-react'
import Link from 'next/link'

export default function DemoFormPage() {
  const [formKey, setFormKey] = useState(0)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  const handleFormSuccess = (data: any) => {
    setSubmitSuccess(true)
    console.log('Demo form submitted:', data)
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSubmitSuccess(false)
      setFormKey(prev => prev + 1) // Force form reset
    }, 3000)
  }

  const resetForm = () => {
    setFormKey(prev => prev + 1)
    setSubmitSuccess(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-xl font-semibold text-gray-900">
                Enhanced Topic Form Demo
              </h1>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="h-8"
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="h-8"
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Description */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Hybrid Approach Features</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-1">✨ Enhanced Placeholders</h3>
              <p>More descriptive and helpful placeholder text with real examples</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">📱 Mobile-Friendly Help</h3>
              <p>Click the blue help icons for context-aware assistance modals</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">🎯 Smart Guidance</h3>
              <p>Contextual tips and best practices without cluttering the interface</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">⚡ Progressive Enhancement</h3>
              <p>Works great with or without help modals - fallback to placeholders</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">Form Submitted Successfully!</h3>
                <p className="text-sm text-green-700">Check the console for submitted data</p>
              </div>
              <Button onClick={resetForm} variant="outline" size="sm">
                Create Another
              </Button>
            </div>
          </div>
        )}

        {/* Form Container with Responsive View */}
        <div className="flex justify-center">
          <div 
            className={`
              transition-all duration-300 bg-white rounded-lg shadow-lg overflow-hidden
              ${viewMode === 'mobile' 
                ? 'w-full max-w-sm border-8 border-gray-800 rounded-3xl' 
                : 'w-full max-w-4xl'
              }
            `}
          >
            {viewMode === 'mobile' && (
              <div className="bg-gray-800 h-6 flex items-center justify-center">
                <div className="w-16 h-1 bg-gray-600 rounded-full"></div>
              </div>
            )}
            
            <div className={`${viewMode === 'mobile' ? 'p-4' : 'p-0'}`}>
              <TopicFormEnhanced
                key={formKey}
                onSuccess={handleFormSuccess}
              />
            </div>
          </div>
        </div>

        {/* Technical Notes */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Implementation Notes</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Mobile Optimizations</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Help icons sized for touch targets (44px minimum)</li>
                <li>• Modal dialogs with proper mobile scrolling</li>
                <li>• Responsive form layout with stacked fields on small screens</li>
                <li>• Touch-friendly button spacing and sizing</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">UX Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Progressive enhancement - works without JavaScript</li>
                <li>• Smart placeholders provide immediate guidance</li>
                <li>• Help modals for detailed explanations when needed</li>
                <li>• Form validation with clear error messages</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Try These Features:</h4>
            <div className="text-sm text-gray-600 grid md:grid-cols-3 gap-4">
              <div>
                <strong>Desktop:</strong> Hover over help icons to see they're clickable, then click for detailed help
              </div>
              <div>
                <strong>Mobile:</strong> Tap help icons to open mobile-optimized help modals
              </div>
              <div>
                <strong>Form:</strong> Notice enhanced placeholders provide immediate guidance without help modals
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 