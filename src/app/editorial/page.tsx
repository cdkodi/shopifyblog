'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { ArticleReviewDashboard } from '@/components/articles/article-review-dashboard';

export default function EditorialPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <ArticleReviewDashboard />
      </div>
    </ProtectedRoute>
  );
} 