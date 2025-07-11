'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

// Temporary component to redirect away from content generation
function ContentGenerationRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Show notice for 3 seconds then redirect
    const timer = setTimeout(() => {
      router.push('/topics');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="max-w-md mx-auto p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Content Generation Temporarily Unavailable
        </h2>
        
        <p className="text-gray-600 mb-6">
          We're currently focusing on improving the Topics workflow. Please use the "Generate" button from Topics dashboard for content creation.
        </p>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Redirecting to Topics in 3 seconds...
          </p>
          
          <Button 
            onClick={() => router.push('/topics')}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Topics Now
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ContentGenerationPage() {
  return (
    <ProtectedRoute>
      <ContentGenerationRedirect />
    </ProtectedRoute>
  );
} 