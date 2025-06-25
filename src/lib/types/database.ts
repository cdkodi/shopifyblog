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
  tone?: string
  length?: string
  template?: string
} {
  // Convert keywords JSON array back to comma-separated string
  const keywordsString = Array.isArray(dbTopic.keywords) 
    ? dbTopic.keywords.join(', ')
    : typeof dbTopic.keywords === 'string' 
      ? dbTopic.keywords 
      : undefined

  const stylePrefs = dbTopic.style_preferences as StylePreferences || {}

  return {
    title: dbTopic.topic_title,
    keywords: keywordsString,
    tone: stylePrefs.tone || undefined,
    length: stylePrefs.length || undefined,
    template: stylePrefs.template_type || stylePrefs.template || undefined,
  }
}

export function formDataToDbInsert(formData: {
  title: string
  keywords?: string
  tone?: string
  length?: string
  template?: string
}): Database['public']['Tables']['topics']['Insert'] {
  // Convert comma-separated keywords string to JSON array
  const keywordsArray = formData.keywords 
    ? formData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    : null

  // Build style preferences object
  const stylePreferences = {
    ...(formData.tone && { tone: formData.tone }),
    ...(formData.length && { length: formData.length }),
    ...(formData.template && { template_type: formData.template }),
  }

  return {
    topic_title: formData.title,
    keywords: keywordsArray,
    style_preferences: Object.keys(stylePreferences).length > 0 ? stylePreferences : null,
    priority_score: 5, // Default priority
    status: 'pending',
  }
}

export function formDataToDbUpdate(formData: {
  title: string
  keywords?: string
  tone?: string
  length?: string
  template?: string
}): Database['public']['Tables']['topics']['Update'] {
  // Convert comma-separated keywords string to JSON array
  const keywordsArray = formData.keywords 
    ? formData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    : null

  // Build style preferences object
  const stylePreferences = {
    ...(formData.tone && { tone: formData.tone }),
    ...(formData.length && { length: formData.length }),
    ...(formData.template && { template_type: formData.template }),
  }

  return {
    topic_title: formData.title,
    keywords: keywordsArray,
    style_preferences: Object.keys(stylePreferences).length > 0 ? stylePreferences : null,
  }
} 