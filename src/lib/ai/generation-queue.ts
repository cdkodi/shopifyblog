// V2 Generation Queue - Background Job Processing

import { GenerationJob, TopicGenerationRequest } from './v2-types';

export class V2GenerationQueue {
  private jobs: Map<string, GenerationJob> = new Map();
  private processingQueue: GenerationJob[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private maxConcurrentJobs = 3;
  private currentlyProcessing = 0;

  constructor() {
    this.startQueueProcessor();
  }

  /**
   * Add a new generation job to the queue
   */
  async addJob(job: Omit<GenerationJob, 'id' | 'createdAt' | 'status' | 'attempts'>): Promise<string> {
    const jobId = this.generateJobId();
    
    const fullJob: GenerationJob = {
      id: jobId,
      request: job.request,
      createdAt: new Date(),
      status: 'pending',
      topicId: job.request.topic?.id || '',
      articleId: '',
      progress: {
        phase: 'queued',
        percentage: 0,
        currentStep: 'Queued for processing',
        jobId: jobId,
        articleId: ''
      }
    };

    this.jobs.set(jobId, fullJob);
    this.processingQueue.push(fullJob);
    this.processingQueue.sort((a, b) => b.priority - a.priority); // Higher priority first

    console.log(`📋 Job queued: ${jobId} (Priority: ${fullJob.priority})`);
    console.log(`📊 Queue status: ${this.processingQueue.length} pending, ${this.currentlyProcessing} processing`);

    return jobId;
  }

  /**
   * Get job by ID
   */
  async getJob(id: string): Promise<GenerationJob | null> {
    return this.jobs.get(id) || null;
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: GenerationJob['status']): Promise<GenerationJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Update job status and metadata
   */
  async updateJobStatus(id: string, status: GenerationJob['status'], metadata?: any): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    job.status = status;
    
    if (status === 'processing') {
      job.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }

    if (metadata) {
      job.metadata = { ...job.metadata, ...metadata };
    }

    this.jobs.set(id, job);
    console.log(`🔄 Job ${id} status updated: ${status}`);
  }

  /**
   * Cancel a job
   */
  async cancelJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    if (job.status === 'processing') {
      // Can't cancel currently processing jobs immediately
      job.status = 'cancelled';
      console.log(`🛑 Job ${id} marked for cancellation`);
    } else {
      job.status = 'cancelled';
      // Remove from processing queue
      this.processingQueue = this.processingQueue.filter(j => j.id !== id);
      console.log(`🛑 Job ${id} cancelled and removed from queue`);
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job ${id} is not in failed status`);
    }

    if (job.attempts >= job.maxAttempts) {
      throw new Error(`Job ${id} has exceeded maximum retry attempts`);
    }

    job.status = 'pending';
    job.attempts += 1;
    job.startedAt = undefined;
    job.completedAt = undefined;

    // Add back to processing queue with slightly lower priority
    job.priority = Math.max(1, job.priority - 1);
    this.processingQueue.push(job);
    this.processingQueue.sort((a, b) => b.priority - a.priority);

    console.log(`🔄 Job ${id} queued for retry (attempt ${job.attempts}/${job.maxAttempts})`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalJobs: number;
    averageProcessingTime: number;
  }> {
    const allJobs = Array.from(this.jobs.values());
    const pending = allJobs.filter(j => j.status === 'pending').length;
    const processing = allJobs.filter(j => j.status === 'processing').length;
    const completed = allJobs.filter(j => j.status === 'completed').length;
    const failed = allJobs.filter(j => j.status === 'failed').length;
    
    const completedJobs = allJobs.filter(j => 
      j.status === 'completed' && j.startedAt && j.completedAt
    );
    
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          const processingTime = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + processingTime;
        }, 0) / completedJobs.length / 1000 // Convert to seconds
      : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      totalJobs: allJobs.length,
      averageProcessingTime
    };
  }

  /**
   * Start the background queue processor
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processNextJobs();
    }, 2000); // Check every 2 seconds

    console.log('🚀 Generation queue processor started');
  }

  /**
   * Process next available jobs
   */
  private async processNextJobs(): Promise<void> {
    if (this.currentlyProcessing >= this.maxConcurrentJobs) {
      return; // At capacity
    }

    const availableSlots = this.maxConcurrentJobs - this.currentlyProcessing;
    const jobsToProcess = this.processingQueue
      .filter(job => job.status === 'pending')
      .slice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.processJob(job).catch(error => {
        console.error(`❌ Job processing failed: ${job.id}`, error);
      });
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: GenerationJob): Promise<void> {
    try {
      this.currentlyProcessing++;
      
      // Remove from processing queue
      this.processingQueue = this.processingQueue.filter(j => j.id !== job.id);
      
      await this.updateJobStatus(job.id, 'processing');
      
      console.log(`⚡ Processing job: ${job.id} (Topic: ${job.request.topic.title})`);

      // Simulate job processing - in real implementation, this would:
      // 1. Call V2AIServiceManager.generateFromTopic()
      // 2. Save result to database
      // 3. Update article status
      // 4. Send notifications
      
      const processingTime = this.estimateProcessingTime(job.request);
      await this.simulateProcessing(job.id, processingTime);

      await this.updateJobStatus(job.id, 'completed', {
        completedAt: new Date(),
        processingTimeMs: processingTime
      });

      console.log(`✅ Job completed: ${job.id}`);

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error);
      
      job.lastError = error instanceof Error ? error.message : String(error);
      
      if (job.attempts < job.maxAttempts) {
        // Schedule for retry
        setTimeout(() => {
          this.retryJob(job.id).catch(retryError => {
            console.error(`Failed to retry job ${job.id}:`, retryError);
          });
        }, this.calculateRetryDelay(job.attempts));
      } else {
        await this.updateJobStatus(job.id, 'failed', {
          finalError: job.lastError,
          failedAt: new Date()
        });
      }
    } finally {
      this.currentlyProcessing--;
    }
  }

  /**
   * Simulate processing with progress updates
   */
  private async simulateProcessing(jobId: string, totalTime: number): Promise<void> {
    const phases = [
      { name: 'Analyzing topic', duration: 0.1 },
      { name: 'Building structure', duration: 0.2 },
      { name: 'Generating content', duration: 0.5 },
      { name: 'SEO optimization', duration: 0.15 },
      { name: 'Finalizing', duration: 0.05 }
    ];

    let elapsed = 0;
    
    for (const phase of phases) {
      const phaseTime = totalTime * phase.duration;
      
      await this.updateJobStatus(jobId, 'processing', {
        currentPhase: phase.name,
        progress: (elapsed / totalTime) * 100,
        estimatedTimeRemaining: totalTime - elapsed
      });
      
      await this.sleep(phaseTime);
      elapsed += phaseTime;
    }
  }

  /**
   * Estimate processing time based on request complexity
   */
  private estimateProcessingTime(request: TopicGenerationRequest): number {
    const baseTime = 10000; // 10 seconds base
    const wordMultiplier = (request.targetWordCount || 1000) / 1000;
    const seoMultiplier = request.optimizeForSEO ? 1.5 : 1.0;
    const templateMultiplier = request.topic.template ? 1.2 : 1.0;
    
    return baseTime * wordMultiplier * seoMultiplier * templateMultiplier;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 5000; // 5 seconds
    const maxDelay = 300000; // 5 minutes
    const backoffFactor = 2;
    
    const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `gen_${timestamp}_${random}`;
  }

  /**
   * Clean up completed/failed jobs older than retention period
   */
  async cleanupOldJobs(retentionDays = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoffDate
      ) {
        this.jobs.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old jobs`);
    }
    
    return cleanedCount;
  }

  /**
   * Get detailed job information including processing history
   */
  async getJobDetails(id: string): Promise<GenerationJob & { 
    processingHistory?: Array<{ 
      timestamp: Date; 
      status: string; 
      message?: string 
    }>;
    estimatedCompletion?: Date;
  }> {
    const job = await this.getJob(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    const details = { ...job };
    
    // Calculate estimated completion for pending/processing jobs
    if (job.status === 'pending' || job.status === 'processing') {
      const estimatedTime = this.estimateProcessingTime(job.request);
      const queuePosition = this.processingQueue.findIndex(j => j.id === id);
      const estimatedStart = queuePosition >= 0 
        ? Date.now() + (queuePosition * estimatedTime)
        : Date.now();
      
      details.estimatedCompletion = new Date(estimatedStart + estimatedTime);
    }

    return details;
  }

  /**
   * Gracefully shutdown the queue processor
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    console.log('🛑 Generation queue processor stopped');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 