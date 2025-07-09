// V2 Content Quality Analysis API

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultV2Service } from '@/lib/ai';
import { TopicGenerationRequest } from '@/lib/ai/v2-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Content string is required' },
        { status: 400 }
      );
    }

    if (!body.topic || !body.topic.title) {
      return NextResponse.json(
        { error: 'Topic with title is required for analysis context' },
        { status: 400 }
      );
    }

    console.log('🔍 V2 Content analysis request:', {
      contentLength: body.content.length,
      topic: body.topic.title,
      analysisType: body.analysisType || 'full'
    });

    // Build topic request for analysis context
    const topicRequest: TopicGenerationRequest = {
      topic: {
        id: body.topic.id,
        title: body.topic.title,
        keywords: body.topic.keywords || '',
        tone: body.topic.tone || 'professional',
        length: body.topic.length || 'medium',
        template: body.topic.template || 'article'
      },
      targetWordCount: body.targetWordCount,
      optimizeForSEO: body.optimizeForSEO ?? true
    };

    const v2Service = getDefaultV2Service();
    const startTime = Date.now();

    // Perform comprehensive analysis
    const qualityAnalysis = await v2Service.analyzeContent(body.content, topicRequest);
    const contentMetadata = v2Service.qualityAnalyzer.extractMetadata(body.content);
    
    const endTime = Date.now();
    const analysisTime = endTime - startTime;

    console.log('✅ Content analysis completed:', {
      overallScore: qualityAnalysis.overallScore,
      seoScore: qualityAnalysis.seoScore,
      wordCount: contentMetadata.wordCount,
      analysisTime: `${analysisTime}ms`
    });

    // Build comprehensive response
    const response = {
      success: true,
      data: {
        // Overall quality metrics
        qualityMetrics: {
          overallScore: qualityAnalysis.overallScore,
          seoScore: qualityAnalysis.seoScore,
          readabilityScore: qualityAnalysis.readabilityScore,
          keywordOptimization: qualityAnalysis.keywordOptimization,
          contentStructure: qualityAnalysis.contentStructure
        },

        // Detailed content metadata
        contentMetadata: {
          wordCount: contentMetadata.wordCount,
          readingTime: contentMetadata.readingTime,
          sentences: contentMetadata.sentences,
          paragraphs: contentMetadata.paragraphs,
          headings: contentMetadata.headings,
          averageSentenceLength: Math.round(contentMetadata.wordCount / contentMetadata.sentences),
          averageParagraphLength: Math.round(contentMetadata.wordCount / contentMetadata.paragraphs)
        },

        // SEO analysis
        seoAnalysis: await v2Service.qualityAnalyzer.validateSEORequirements(
          body.content,
          extractKeywords(topicRequest.topic)
        ),

        // Actionable recommendations
        recommendations: qualityAnalysis.recommendations,

        // Content structure analysis
        structureAnalysis: {
          hasIntroduction: hasIntroduction(body.content),
          hasConclusion: hasConclusion(body.content),
          headingHierarchy: analyzeHeadingHierarchy(body.content),
          contentFlow: analyzeContentFlow(body.content)
        },

        // Performance indicators
        performanceIndicators: {
          searchOptimization: qualityAnalysis.seoScore >= 80 ? 'good' : qualityAnalysis.seoScore >= 60 ? 'moderate' : 'needs_improvement',
          readabilityLevel: qualityAnalysis.readabilityScore >= 80 ? 'excellent' : qualityAnalysis.readabilityScore >= 60 ? 'good' : 'needs_improvement',
          contentLength: categorizeContentLength(contentMetadata.wordCount),
          keywordDensity: categorizeKeywordDensity(qualityAnalysis.keywordOptimization)
        },

        // Analysis metadata
        analysisMetadata: {
          version: 'v2.1',
          analysisTime: `${analysisTime}ms`,
          timestamp: new Date().toISOString(),
          contextTopic: topicRequest.topic.title,
          analysisType: body.analysisType || 'comprehensive'
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Content analysis failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Analysis failed',
          type: 'analysis_error',
          code: 'V2_ANALYSIS_FAILED'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const demo = url.searchParams.get('demo');

    if (demo === 'true') {
      // Return demo analysis for testing
      return NextResponse.json({
        service: 'V2 Content Quality Analyzer',
        version: '2.1',
        demo: true,
        sampleAnalysis: {
          qualityMetrics: {
            overallScore: 85,
            seoScore: 82,
            readabilityScore: 88,
            keywordOptimization: 79,
            contentStructure: 91
          },
          recommendations: [
            'Increase keyword density for better SEO',
            'Add more subheadings for improved structure',
            'Consider shortening some longer sentences'
          ],
          analysisCapabilities: [
            'SEO optimization analysis',
            'Readability scoring',
            'Content structure evaluation',
            'Keyword density optimization',
            'Actionable recommendations',
            'Performance categorization'
          ]
        }
      });
    }

    // Return service capabilities
    return NextResponse.json({
      service: 'V2 Content Quality Analyzer',
      version: '2.1',
      status: 'healthy',
      capabilities: {
        comprehensiveAnalysis: true,
        seoOptimization: true,
        readabilityScoring: true,
        structureAnalysis: true,
        keywordOptimization: true,
        actionableRecommendations: true,
        performanceIndicators: true,
        contentMetadata: true
      },
      analysisTypes: {
        comprehensive: 'Full analysis including SEO, readability, structure, and recommendations',
        seo: 'SEO-focused analysis with keyword optimization',
        readability: 'Readability and content flow analysis',
        structure: 'Content organization and hierarchy analysis'
      },
      supportedMetrics: [
        'overall_score',
        'seo_score', 
        'readability_score',
        'keyword_optimization',
        'content_structure',
        'word_count',
        'reading_time',
        'sentence_analysis',
        'paragraph_analysis',
        'heading_analysis'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analysis service check failed:', error);
    
    return NextResponse.json(
      {
        service: 'V2 Content Quality Analyzer',
        version: '2.1',
        status: 'error',
        error: error instanceof Error ? error.message : 'Service unavailable'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function extractKeywords(topic: any): string[] {
  const keywords = [topic.title];
  
  if (topic.keywords) {
    const parsedKeywords = topic.keywords
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);
    keywords.push(...parsedKeywords);
  }
  
  return [...new Set(keywords)];
}

function hasIntroduction(content: string): boolean {
  const firstParagraph = content.split('\n\n')[0] || '';
  return firstParagraph.length > 100 && !firstParagraph.startsWith('#');
}

function hasConclusion(content: string): boolean {
  const lastParagraph = content.split('\n\n').pop() || '';
  const conclusionIndicators = [
    'conclusion', 'summary', 'finally', 'in summary',
    'to conclude', 'in conclusion', 'overall'
  ];
  
  return conclusionIndicators.some(indicator => 
    lastParagraph.toLowerCase().includes(indicator)
  );
}

function analyzeHeadingHierarchy(content: string): {
  proper: boolean;
  levels: number[];
  gaps: number[];
} {
  const headingRegex = /^(#{1,6})\s+/gm;
  const matches = Array.from(content.matchAll(headingRegex));
  const levels = matches.map(match => match[1].length);
  
  const gaps: number[] = [];
  for (let i = 1; i < levels.length; i++) {
    const gap = levels[i] - levels[i - 1];
    if (gap > 1) gaps.push(gap);
  }
  
  return {
    proper: gaps.length === 0,
    levels,
    gaps
  };
}

function analyzeContentFlow(content: string): {
  hasTransitions: boolean;
  transitionCount: number;
  coherenceScore: number;
} {
  const transitions = [
    'however', 'therefore', 'furthermore', 'moreover',
    'additionally', 'consequently', 'meanwhile', 'nevertheless',
    'first', 'second', 'third', 'finally', 'next', 'then'
  ];
  
  const contentLower = content.toLowerCase();
  const transitionCount = transitions.reduce((count, transition) => {
    return count + (contentLower.match(new RegExp(`\\b${transition}\\b`, 'g')) || []).length;
  }, 0);
  
  const paragraphs = content.split('\n\n').length;
  const coherenceScore = Math.min(100, (transitionCount / paragraphs) * 100);
  
  return {
    hasTransitions: transitionCount > 0,
    transitionCount,
    coherenceScore
  };
}

function categorizeContentLength(wordCount: number): 'short' | 'optimal' | 'long' | 'very_long' {
  if (wordCount < 500) return 'short';
  if (wordCount <= 2500) return 'optimal';
  if (wordCount <= 4000) return 'long';
  return 'very_long';
}

function categorizeKeywordDensity(score: number): 'low' | 'optimal' | 'high' | 'over_optimized' {
  if (score < 60) return 'low';
  if (score <= 85) return 'optimal'; 
  if (score <= 95) return 'high';
  return 'over_optimized';
} 