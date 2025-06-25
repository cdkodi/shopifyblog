export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string
          title: string
          content: string
          meta_description: string | null
          slug: string | null
          status: string | null
          target_keywords: Json | null
          shopify_blog_id: number | null
          shopify_article_id: number | null
          scheduled_publish_date: string | null
          created_at: string | null
          updated_at: string | null
          published_at: string | null
          seo_score: number | null
          word_count: number | null
          reading_time: number | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          meta_description?: string | null
          slug?: string | null
          status?: string | null
          target_keywords?: Json | null
          shopify_blog_id?: number | null
          shopify_article_id?: number | null
          scheduled_publish_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          published_at?: string | null
          seo_score?: number | null
          word_count?: number | null
          reading_time?: number | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          meta_description?: string | null
          slug?: string | null
          status?: string | null
          target_keywords?: Json | null
          shopify_blog_id?: number | null
          shopify_article_id?: number | null
          scheduled_publish_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          published_at?: string | null
          seo_score?: number | null
          word_count?: number | null
          reading_time?: number | null
        }
      }
      topics: {
        Row: {
          id: string
          topic_title: string
          keywords: Json | null
          industry: string | null
          market_segment: string | null
          style_preferences: Json | null
          search_volume: number | null
          competition_score: number | null
          priority_score: number | null
          status: string | null
          created_at: string | null
          used_at: string | null
        }
        Insert: {
          id?: string
          topic_title: string
          keywords?: Json | null
          industry?: string | null
          market_segment?: string | null
          style_preferences?: Json | null
          search_volume?: number | null
          competition_score?: number | null
          priority_score?: number | null
          status?: string | null
          created_at?: string | null
          used_at?: string | null
        }
        Update: {
          id?: string
          topic_title?: string
          keywords?: Json | null
          industry?: string | null
          market_segment?: string | null
          style_preferences?: Json | null
          search_volume?: number | null
          competition_score?: number | null
          priority_score?: number | null
          status?: string | null
          created_at?: string | null
          used_at?: string | null
        }
      }
      content_templates: {
        Row: {
          id: string
          name: string
          template_structure: Json | null
          content_type: string | null
          industry: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          template_structure?: Json | null
          content_type?: string | null
          industry?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          template_structure?: Json | null
          content_type?: string | null
          industry?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      workflow_logs: {
        Row: {
          id: string
          workflow_name: string
          execution_id: string | null
          status: string | null
          error_message: string | null
          execution_data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workflow_name: string
          execution_id?: string | null
          status?: string | null
          error_message?: string | null
          execution_data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workflow_name?: string
          execution_id?: string | null
          status?: string | null
          error_message?: string | null
          execution_data?: Json | null
          created_at?: string | null
        }
      }
      app_config: {
        Row: {
          id: string
          config_key: string
          config_value: Json | null
          description: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          config_key: string
          config_value?: Json | null
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: Json | null
          description?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Style Preferences Interface
export interface StylePreferences {
  [key: string]: string | undefined
  tone?: string
  length?: string
  target_audience?: string
  template_type?: string
  custom_notes?: string
}

// Transformation helpers for form/database field mapping
export function dbTopicToFormData(dbTopic: Database['public']['Tables']['topics']['Row']): {
  title: string
  keywords?: string
  industry?: string
  market_segment?: string
  style_preferences?: StylePreferences
  priority: number
  search_volume?: number
  competition_score?: number
} {
  return {
    title: dbTopic.topic_title,
    keywords: typeof dbTopic.keywords === 'string' ? dbTopic.keywords : undefined,
    industry: dbTopic.industry || undefined,
    market_segment: dbTopic.market_segment || undefined,
    style_preferences: dbTopic.style_preferences as StylePreferences || undefined,
    priority: dbTopic.priority_score || 5,
    search_volume: dbTopic.search_volume || undefined,
    competition_score: dbTopic.competition_score || undefined,
  }
}

export function formDataToDbInsert(formData: {
  title: string
  keywords?: string
  industry?: string
  market_segment?: string
  style_preferences?: StylePreferences
  priority: number
  search_volume?: number
  competition_score?: number
}): Database['public']['Tables']['topics']['Insert'] {
  return {
    topic_title: formData.title,
    keywords: formData.keywords || null,
    industry: formData.industry || null,
    market_segment: formData.market_segment || null,
    style_preferences: formData.style_preferences || null,
    priority_score: formData.priority,
    search_volume: formData.search_volume || null,
    competition_score: formData.competition_score || null,
    status: 'draft',
  }
}

export function formDataToDbUpdate(formData: {
  title: string
  keywords?: string
  industry?: string
  market_segment?: string
  style_preferences?: StylePreferences
  priority: number
  search_volume?: number
  competition_score?: number
}): Database['public']['Tables']['topics']['Update'] {
  return {
    topic_title: formData.title,
    keywords: formData.keywords || null,
    industry: formData.industry || null,
    market_segment: formData.market_segment || null,
    style_preferences: formData.style_preferences || null,
    priority_score: formData.priority,
    search_volume: formData.search_volume || null,
    competition_score: formData.competition_score || null,
  }
} 