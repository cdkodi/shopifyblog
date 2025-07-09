// V2 Background Generation Queue API

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultV2Service } from '@/lib/ai';
import { TopicGenerationRequest } from '@/lib/ai/v2-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const v2Service = getDefaultV2Service();
    
    if (!v2Service.generationQueue) {
      return NextResponse.json(
        { error: 'Background processing not enabled' },
        { status: 503 }
      );
    }

    switch (action) {
      case 'queue': {
        // Queue a new generation job
        if (!body.topic || !body.topic.title) {
          return NextResponse.json(
            { error: 'Topic with title is required' },
            { status: 400 }
          );
        }

        const generationRequest: TopicGenerationRequest = {
          topic: {
            id: body.topic.id,
            title: body.topic.title,
            keywords: body.topic.keywords || '',
            tone: body.topic.tone || 'professional',
            length: body.topic.length || 'medium',
            template: body.topic.template || 'article'
          },
          optimizeForSEO: body.optimizeForSEO ?? true,
          targetWordCount: body.targetWordCount || 1000,
          options: {
            temperature: body.temperature || 0.7,
            maxTokens: body.maxTokens || 2000
          }
        };

        const result = await v2Service.queueGeneration(generationRequest);
        
        console.log('📋 Generation queued:', {
          jobId: result.jobId,
          topic: body.topic.title,
          estimatedCompletion: result.estimatedCompletion
        });

        return NextResponse.json({
          success: true,
          data: {
            jobId: result.jobId,
            estimatedCompletion: result.estimatedCompletion,
            status: 'queued'
          }
        });
      }

      case 'batch': {
        // Queue multiple generation jobs
        if (!body.topics || !Array.isArray(body.topics) || body.topics.length === 0) {
          return NextResponse.json(
            { error: 'Array of topics is required' },
            { status: 400 }
          );
        }

        const requests: TopicGenerationRequest[] = body.topics.map((topic: any) => ({
          topic: {
            id: topic.id,
            title: topic.title,
            keywords: topic.keywords || '',
            tone: topic.tone || 'professional',
            length: topic.length || 'medium',
            template: topic.template || 'article'
          },
          generateMetaDescription: true,
          optimizeForSEO: true,
          targetWordCount: body.targetWordCount || 1000,
          contentStructure: body.contentStructure || 'standard'
        }));

        const result = await v2Service.aiServiceManager.generateMultipleTopics(requests);

        console.log('📋 Batch generation queued:', {
          batchId: result.batchId,
          jobCount: result.jobIds.length,
          topics: body.topics.map((t: any) => t.title)
        });

        return NextResponse.json({
          success: true,
          data: {
            batchId: result.batchId,
            jobIds: result.jobIds,
            jobCount: result.jobIds.length,
            status: 'queued'
          }
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Queue operation failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Queue operation failed',
          type: 'queue_error'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const batchId = url.searchParams.get('batchId');
    const stats = url.searchParams.get('stats');

    const v2Service = getDefaultV2Service();
    
    if (!v2Service.generationQueue) {
      return NextResponse.json(
        { error: 'Background processing not enabled' },
        { status: 503 }
      );
    }

    if (stats === 'true') {
      // Return queue statistics
      const queueStats = await v2Service.generationQueue.getQueueStats();
      
      return NextResponse.json({
        success: true,
        data: {
          queue: queueStats,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (jobId) {
      // Get specific job progress
      try {
        const progress = await v2Service.aiServiceManager.getGenerationProgress(jobId);
        
        return NextResponse.json({
          success: true,
          data: {
            jobId,
            progress
          }
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Job not found: ${jobId}` },
          { status: 404 }
        );
      }
    }

    if (batchId) {
      // Get batch progress
      try {
        const batchProgress = await v2Service.aiServiceManager.getBatchProgress(batchId);
        
        return NextResponse.json({
          success: true,
          data: {
            batchId,
            jobs: batchProgress,
            completed: batchProgress.filter(p => p.percentage === 100).length,
            total: batchProgress.length
          }
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Batch not found: ${batchId}` },
          { status: 404 }
        );
      }
    }

    // Return general queue status
    const queueStats = await v2Service.generationQueue.getQueueStats();
    
    return NextResponse.json({
      success: true,
      data: {
        service: 'V2 Generation Queue',
        version: '2.1',
        status: 'active',
        queue: queueStats,
        capabilities: {
          backgroundProcessing: true,
          batchOperations: true,
          progressTracking: true,
          retryMechanism: true
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Queue status check failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Queue status check failed',
          type: 'queue_status_error'
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      );
    }

    const v2Service = getDefaultV2Service();
    
    if (!v2Service.generationQueue) {
      return NextResponse.json(
        { error: 'Background processing not enabled' },
        { status: 503 }
      );
    }

    await v2Service.aiServiceManager.cancelGeneration(jobId);
    
    console.log('🛑 Generation cancelled:', jobId);

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'cancelled'
      }
    });

  } catch (error) {
    console.error('❌ Job cancellation failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Job cancellation failed',
          type: 'cancellation_error'
        }
      },
      { status: 500 }
    );
  }
} 