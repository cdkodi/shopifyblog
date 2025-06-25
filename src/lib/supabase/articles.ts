import { supabase } from '../supabase'
import type { Database } from '../types/database'

type Article = Database['public']['Tables']['articles']['Row']
type ArticleInsert = Database['public']['Tables']['articles']['Insert']
type ArticleUpdate = Database['public']['Tables']['articles']['Update']

export interface ArticleFormData {
  title: string
  content: string
  metaDescription?: string
  slug?: string
  status?: 'draft' | 'review' | 'approved' | 'published' | 'rejected'
  targetKeywords?: string[]
  shopifyBlogId?: number
  shopifyArticleId?: number
  scheduledPublishDate?: string
  seoScore?: number
  wordCount?: number
  readingTime?: number
}

export interface ArticleFilterData {
  search?: string
  status?: string
  orderBy?: 'created_at' | 'updated_at' | 'title' | 'published_at'
  orderDirection?: 'asc' | 'desc'
}

export class ArticleService {
  // Create a new article
  static async createArticle(data: ArticleFormData): Promise<{ data: Article | null; error: string | null }> {
    try {
      const articleData: ArticleInsert = {
        title: data.title,
        content: data.content,
        meta_description: data.metaDescription || null,
        slug: data.slug || this.generateSlug(data.title),
        status: data.status || 'draft',
        target_keywords: data.targetKeywords ? JSON.stringify(data.targetKeywords) : null,
        shopify_blog_id: data.shopifyBlogId || null,
        shopify_article_id: data.shopifyArticleId || null,
        scheduled_publish_date: data.scheduledPublishDate || null,
        seo_score: data.seoScore || null,
        word_count: data.wordCount || this.calculateWordCount(data.content),
        reading_time: data.readingTime || this.calculateReadingTime(data.content),
        updated_at: new Date().toISOString()
      }

      const { data: article, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single()

      if (error) {
        console.error('Error creating article:', error)
        return { data: null, error: error.message }
      }

      return { data: article, error: null }
    } catch (err) {
      console.error('Unexpected error creating article:', err)
      return { data: null, error: 'Failed to create article' }
    }
  }

  // Get all articles with optional filtering
  static async getArticles(filters?: ArticleFilterData): Promise<{ data: Article[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('articles')
        .select('*')

      // Apply search filter
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      // Apply status filter
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      // Apply ordering
      const orderBy = filters?.orderBy || 'updated_at'
      const orderDirection = filters?.orderDirection || 'desc'
      query = query.order(orderBy, { ascending: orderDirection === 'asc' })

      const { data: articles, error } = await query

      if (error) {
        console.error('Error fetching articles:', error)
        return { data: null, error: error.message }
      }

      return { data: articles, error: null }
    } catch (err) {
      console.error('Unexpected error fetching articles:', err)
      return { data: null, error: 'Failed to fetch articles' }
    }
  }

  // Get a single article by ID
  static async getArticle(id: string): Promise<{ data: Article | null; error: string | null }> {
    try {
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching article:', error)
        return { data: null, error: error.message }
      }

      return { data: article, error: null }
    } catch (err) {
      console.error('Unexpected error fetching article:', err)
      return { data: null, error: 'Failed to fetch article' }
    }
  }

  // Update an article
  static async updateArticle(id: string, data: Partial<ArticleFormData>): Promise<{ data: Article | null; error: string | null }> {
    try {
      const updateData: Partial<ArticleUpdate> = {
        updated_at: new Date().toISOString()
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.content !== undefined) {
        updateData.content = data.content
        updateData.word_count = this.calculateWordCount(data.content)
        updateData.reading_time = this.calculateReadingTime(data.content)
      }
      if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription
      if (data.slug !== undefined) updateData.slug = data.slug
      if (data.status !== undefined) updateData.status = data.status
      if (data.targetKeywords !== undefined) updateData.target_keywords = JSON.stringify(data.targetKeywords)
      if (data.shopifyBlogId !== undefined) updateData.shopify_blog_id = data.shopifyBlogId
      if (data.shopifyArticleId !== undefined) updateData.shopify_article_id = data.shopifyArticleId
      if (data.scheduledPublishDate !== undefined) updateData.scheduled_publish_date = data.scheduledPublishDate
      if (data.seoScore !== undefined) updateData.seo_score = data.seoScore

      // Set published_at if status is being changed to published
      if (data.status === 'published') {
        updateData.published_at = new Date().toISOString()
      }

      const { data: article, error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating article:', error)
        return { data: null, error: error.message }
      }

      return { data: article, error: null }
    } catch (err) {
      console.error('Unexpected error updating article:', err)
      return { data: null, error: 'Failed to update article' }
    }
  }

  // Delete an article
  static async deleteArticle(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting article:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting article:', err)
      return { error: 'Failed to delete article' }
    }
  }

  // Duplicate an article
  static async duplicateArticle(id: string): Promise<{ data: Article | null; error: string | null }> {
    try {
      // First get the original article
      const { data: originalArticle, error: fetchError } = await this.getArticle(id)
      if (fetchError || !originalArticle) {
        return { data: null, error: fetchError || 'Article not found' }
      }

      // Create a copy with modified title and slug
      const duplicateData: ArticleFormData = {
        title: `${originalArticle.title} (Copy)`,
        content: originalArticle.content,
        metaDescription: originalArticle.meta_description || undefined,
        status: 'draft', // Always create duplicates as drafts
        targetKeywords: originalArticle.target_keywords ? JSON.parse(originalArticle.target_keywords as string) : undefined,
        seoScore: originalArticle.seo_score || undefined
      }

      return this.createArticle(duplicateData)
    } catch (err) {
      console.error('Unexpected error duplicating article:', err)
      return { data: null, error: 'Failed to duplicate article' }
    }
  }

  // Get articles by status
  static async getArticlesByStatus(status: string): Promise<{ data: Article[] | null; error: string | null }> {
    return this.getArticles({ status })
  }

  // Search articles
  static async searchArticles(searchTerm: string): Promise<{ data: Article[] | null; error: string | null }> {
    return this.getArticles({ search: searchTerm })
  }

  // Update article status
  static async updateArticleStatus(id: string, status: 'draft' | 'review' | 'approved' | 'published' | 'rejected'): Promise<{ data: Article | null; error: string | null }> {
    return this.updateArticle(id, { status })
  }

  // Utility methods
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private static calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  private static calculateReadingTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = this.calculateWordCount(content)
    return Math.ceil(wordCount / wordsPerMinute)
  }

  // Get article statistics
  static async getArticleStats(): Promise<{ 
    data: { 
      totalArticles: number; 
      draftArticles: number; 
      publishedArticles: number; 
      totalWords: number 
    } | null; 
    error: string | null 
  }> {
    try {
      const { data: articles, error } = await this.getArticles()
      if (error || !articles) {
        return { data: null, error: error || 'Failed to fetch articles' }
      }

      const stats = {
        totalArticles: articles.length,
        draftArticles: articles.filter(a => a.status === 'draft').length,
        publishedArticles: articles.filter(a => a.status === 'published').length,
        totalWords: articles.reduce((sum, a) => sum + (a.word_count || 0), 0)
      }

      return { data: stats, error: null }
    } catch (err) {
      console.error('Unexpected error getting article stats:', err)
      return { data: null, error: 'Failed to get article statistics' }
    }
  }
} 