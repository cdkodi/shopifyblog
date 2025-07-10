// Generation Jobs Database Service
// Provides database persistence for V2 generation job tracking

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { GenerationProgress, TopicGenerationRequest, V2GenerationResult } from '@/lib/ai/v2-types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type GenerationJobRow = Database['public']['Tables']['generation_jobs']['Row'];
export type GenerationJobInsert = Database['public']['Tables']['generation_jobs']['Insert'];
export type GenerationJobUpdate = Database['public']['Tables']['generation_jobs']['Update'];

export class GenerationJobsService {
  /**
   * Create a new generation job in the database
   */
  async createJob(jobId: string, request: TopicGenerationRequest): Promise<void> {
    const jobData: GenerationJobInsert = {
      id: jobId,
      topic_id: request.topic.id,
      request_data: request as any,
      status: 'pending',
      phase: 'queued',
      percentage: 0,
      current_step: 'Job queued for processing',
      attempts: 0,
      max_attempts: 3
    };

    const { error } = await supabase
      .from('generation_jobs')
      .insert(jobData);

    if (error) {
      console.error('❌ Failed to create generation job:', error);
      throw new Error(`Failed to create generation job: ${error.message}`);
    }

    console.log('✅ Generation job created:', jobId);
  }

  /**
   * Get generation job progress by ID
   */
  async getJobProgress(jobId: string): Promise<GenerationProgress> {
    const { data, error } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return {
      jobId: data.id,
      articleId: data.article_id || '',
      phase: data.phase as GenerationProgress['phase'],
      percentage: data.percentage,
      currentStep: data.current_step,
      estimatedTimeRemaining: data.estimated_time_remaining || undefined,
      startTime: data.started_at || undefined,
      metadata: {
        wordCount: data.word_count || undefined,
        seoScore: data.seo_score || undefined,
        provider: data.provider_used || undefined,
        cost: data.cost || undefined
      }
    };
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, updates: Partial<GenerationProgress>): Promise<void> {
    const updateData: GenerationJobUpdate = {};

    if (updates.phase) updateData.phase = updates.phase;
    if (updates.percentage !== undefined) updateData.percentage = updates.percentage;
    if (updates.currentStep) updateData.current_step = updates.currentStep;
    if (updates.estimatedTimeRemaining !== undefined) {
      updateData.estimated_time_remaining = updates.estimatedTimeRemaining;
    }
    if (updates.articleId) updateData.article_id = updates.articleId;

    // Update metadata fields
    if (updates.metadata) {
      if (updates.metadata.wordCount) updateData.word_count = updates.metadata.wordCount;
      if (updates.metadata.seoScore) updateData.seo_score = updates.metadata.seoScore;
      if (updates.metadata.provider) updateData.provider_used = updates.metadata.provider;
      if (updates.metadata.cost) updateData.cost = updates.metadata.cost;
    }

    // Set timing fields based on phase
    if (updates.phase === 'analyzing' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
    } else if (updates.phase === 'completed' || updates.phase === 'error') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('generation_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('❌ Failed to update job progress:', error);
      throw new Error(`Failed to update job progress: ${error.message}`);
    }
  }

  /**
   * Mark job as completed with results
   */
  async completeJob(jobId: string, result: V2GenerationResult): Promise<void> {
    const updateData: GenerationJobUpdate = {
      status: 'completed',
      phase: 'completed',
      percentage: 100,
      current_step: 'Generation completed successfully',
      completed_at: new Date().toISOString(),
      result_data: result as any,
      provider_used: result.finalProvider,
      word_count: result.generationMetadata?.wordCount,
      seo_score: result.generationMetadata?.seoScore
    };

    const { error } = await supabase
      .from('generation_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('❌ Failed to complete job:', error);
      throw new Error(`Failed to complete job: ${error.message}`);
    }

    console.log('✅ Generation job completed:', jobId);
  }

  /**
   * Mark job as failed with error
   */
  async failJob(jobId: string, errorMessage: string): Promise<void> {
    const updateData: GenerationJobUpdate = {
      status: 'failed',
      phase: 'error',
      current_step: `Generation failed: ${errorMessage}`,
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('generation_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('❌ Failed to mark job as failed:', error);
      throw new Error(`Failed to mark job as failed: ${error.message}`);
    }

    console.log('💥 Generation job failed:', jobId);
  }

  /**
   * Cancel a generation job
   */
  async cancelJob(jobId: string): Promise<void> {
    const updateData: GenerationJobUpdate = {
      status: 'cancelled',
      current_step: 'Generation cancelled by user',
      completed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('generation_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('❌ Failed to cancel job:', error);
      throw new Error(`Failed to cancel job: ${error.message}`);
    }

    console.log('🛑 Generation job cancelled:', jobId);
  }

  /**
   * Get active generation jobs
   */
  async getActiveJobs(): Promise<Database['public']['Views']['active_generation_jobs']['Row'][]> {
    const { data, error } = await supabase
      .from('active_generation_jobs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to get active jobs:', error);
      throw new Error(`Failed to get active jobs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get generation job statistics
   */
  async getJobStats(): Promise<Database['public']['Views']['generation_job_stats']['Row']> {
    const { data, error } = await supabase
      .from('generation_job_stats')
      .select('*')
      .single();

    if (error) {
      console.error('❌ Failed to get job stats:', error);
      throw new Error(`Failed to get job stats: ${error.message}`);
    }

    return data;
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(): Promise<number> {
    const { data, error } = await supabase
      .rpc('cleanup_old_generation_jobs');

    if (error) {
      console.error('❌ Failed to cleanup old jobs:', error);
      throw new Error(`Failed to cleanup old jobs: ${error.message}`);
    }

    console.log(`🧹 Cleaned up ${data} old generation jobs`);
    return data;
  }

  /**
   * Check if a job exists
   */
  async jobExists(jobId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('generation_jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    return !error && !!data;
  }

  /**
   * Get batch progress for multiple jobs
   */
  async getBatchProgress(batchId: string): Promise<GenerationProgress[]> {
    // For now, return empty array since batch tracking needs additional implementation
    // This would require a separate batch_jobs table or tagging mechanism
    console.warn('Batch progress tracking not implemented yet for:', batchId);
    return [];
  }

  /**
   * Increment job attempts and check if max attempts reached
   */
  async incrementAttempts(jobId: string): Promise<boolean> {
    const { data: job } = await supabase
      .from('generation_jobs')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();

    if (!job) return false;

    const newAttempts = job.attempts + 1;
    await supabase
      .from('generation_jobs')
      .update({ attempts: newAttempts })
      .eq('id', jobId);

    return newAttempts >= job.max_attempts;
  }
}

// Export singleton instance
export const generationJobsService = new GenerationJobsService(); 