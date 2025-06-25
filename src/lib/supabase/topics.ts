import { supabase } from '../supabase'
import type { Database } from '../types/database'
import type { TopicFormData, TopicFilterData } from '../validations/topic'
import { formDataToDbInsert, formDataToDbUpdate } from '../types/database'

type Topic = Database['public']['Tables']['topics']['Row']
type TopicInsert = Database['public']['Tables']['topics']['Insert']
type TopicUpdate = Database['public']['Tables']['topics']['Update']

export class TopicService {
  // Create a new topic
  static async createTopic(data: TopicFormData): Promise<{ data: Topic | null; error: string | null }> {
    try {
      const topicData = formDataToDbInsert(data)

      const { data: topic, error } = await supabase
        .from('topics')
        .insert(topicData)
        .select()
        .single()

      if (error) {
        console.error('Error creating topic:', error)
        return { data: null, error: error.message }
      }

      return { data: topic, error: null }
    } catch (err) {
      console.error('Unexpected error creating topic:', err)
      return { data: null, error: 'Failed to create topic' }
    }
  }

  // Get all topics with optional filtering
  static async getTopics(filters?: TopicFilterData): Promise<{ data: Topic[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.industry) {
        query = query.eq('industry', filters.industry)
      }
      if (filters?.market_segment) {
        query = query.eq('market_segment', filters.market_segment)
      }
      if (filters?.priority_min) {
        query = query.gte('priority_score', filters.priority_min)
      }
      if (filters?.priority_max) {
        query = query.lte('priority_score', filters.priority_max)
      }
      if (filters?.search) {
        query = query.or(`topic_title.ilike.%${filters.search}%,keywords.ilike.%${filters.search}%`)
      }

      const { data: topics, error } = await query

      if (error) {
        console.error('Error fetching topics:', error)
        return { data: null, error: error.message }
      }

      return { data: topics, error: null }
    } catch (err) {
      console.error('Unexpected error fetching topics:', err)
      return { data: null, error: 'Failed to fetch topics' }
    }
  }

  // Get a single topic by ID
  static async getTopic(id: string): Promise<{ data: Topic | null; error: string | null }> {
    try {
      const { data: topic, error } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching topic:', error)
        return { data: null, error: error.message }
      }

      return { data: topic, error: null }
    } catch (err) {
      console.error('Unexpected error fetching topic:', err)
      return { data: null, error: 'Failed to fetch topic' }
    }
  }

  // Update a topic
  static async updateTopic(id: string, data: Partial<TopicFormData>): Promise<{ data: Topic | null; error: string | null }> {
    try {
      const updateData = formDataToDbUpdate(data as TopicFormData)

      const { data: topic, error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating topic:', error)
        return { data: null, error: error.message }
      }

      return { data: topic, error: null }
    } catch (err) {
      console.error('Unexpected error updating topic:', err)
      return { data: null, error: 'Failed to update topic' }
    }
  }

  // Delete a topic
  static async deleteTopic(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting topic:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting topic:', err)
      return { error: 'Failed to delete topic' }
    }
  }

  // Get configuration values for form dropdowns
  static async getConfigValues(): Promise<{ 
    data: { 
      industries: string[]; 
      market_segments: string[]; 
      style_tones: string[]; 
      article_lengths: string[]; 
      target_audiences: string[]; 
      content_templates: string[] 
    } | null; 
    error: string | null 
  }> {
    try {
      const { data: configs, error } = await supabase
        .from('app_config')
        .select('config_key, config_value')
        .in('config_key', [
          'industries',
          'market_segments', 
          'style_tones',
          'article_lengths',
          'target_audiences',
          'content_templates'
        ])

      if (error) {
        console.error('Error fetching config values:', error)
        return { data: null, error: error.message }
      }

      const configData = configs.reduce((acc, config) => {
        acc[config.config_key as keyof typeof acc] = config.config_value as string[]
        return acc
      }, {} as any)

      return { data: configData, error: null }
    } catch (err) {
      console.error('Unexpected error fetching config values:', err)
      return { data: null, error: 'Failed to fetch configuration' }
    }
  }
} 