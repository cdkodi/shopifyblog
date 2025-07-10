export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          config_key: string
          config_value: Json | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      article_product_suggestions: {
        Row: {
          article_id: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          link_text: string | null
          position_in_content: number | null
          product_id: string | null
          relevance_score: number | null
          suggestion_type: string | null
          utm_campaign: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          link_text?: string | null
          position_in_content?: number | null
          product_id?: string | null
          relevance_score?: number | null
          suggestion_type?: string | null
          utm_campaign?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          link_text?: string | null
          position_in_content?: number | null
          product_id?: string | null
          relevance_score?: number | null
          suggestion_type?: string | null
          utm_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_product_suggestions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_product_suggestions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_shopify_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_product_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          ai_model_used: string | null
          content: string
          created_at: string | null
          generation_completed_at: string | null
          generation_prompt_version: string | null
          generation_started_at: string | null
          id: string
          meta_description: string | null
          published_at: string | null
          reading_time: number | null
          scheduled_publish_date: string | null
          seo_score: number | null
          shopify_article_id: number | null
          shopify_blog_id: number | null
          slug: string | null
          source_topic_id: string | null
          status: Database["public"]["Enums"]["article_status_v2"]
          target_keywords: Json | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          ai_model_used?: string | null
          content: string
          created_at?: string | null
          generation_completed_at?: string | null
          generation_prompt_version?: string | null
          generation_started_at?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_publish_date?: string | null
          seo_score?: number | null
          shopify_article_id?: number | null
          shopify_blog_id?: number | null
          slug?: string | null
          source_topic_id?: string | null
          status?: Database["public"]["Enums"]["article_status_v2"]
          target_keywords?: Json | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          ai_model_used?: string | null
          content?: string
          created_at?: string | null
          generation_completed_at?: string | null
          generation_prompt_version?: string | null
          generation_started_at?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_publish_date?: string | null
          seo_score?: number | null
          shopify_article_id?: number | null
          shopify_blog_id?: number | null
          slug?: string | null
          source_topic_id?: string | null
          status?: Database["public"]["Enums"]["article_status_v2"]
          target_keywords?: Json | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_topic_id_fkey"
            columns: ["source_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_source_topic_id_fkey"
            columns: ["source_topic_id"]
            isOneToOne: false
            referencedRelation: "topics_with_article_status"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          content_type: string | null
          created_at: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          name: string
          template_structure: Json | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          name: string
          template_structure?: Json | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          name?: string
          template_structure?: Json | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          id: string
          topic_id: string | null
          article_id: string | null
          request_data: Json
          status: string
          phase: string
          percentage: number
          current_step: string
          estimated_time_remaining: number | null
          provider_used: string | null
          cost: number | null
          word_count: number | null
          seo_score: number | null
          result_data: Json | null
          error_message: string | null
          created_at: string | null
          started_at: string | null
          completed_at: string | null
          last_updated: string | null
          attempts: number
          max_attempts: number
          last_error: string | null
        }
        Insert: {
          id: string
          topic_id?: string | null
          article_id?: string | null
          request_data: Json
          status?: string
          phase?: string
          percentage?: number
          current_step?: string
          estimated_time_remaining?: number | null
          provider_used?: string | null
          cost?: number | null
          word_count?: number | null
          seo_score?: number | null
          result_data?: Json | null
          error_message?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          last_updated?: string | null
          attempts?: number
          max_attempts?: number
          last_error?: string | null
        }
        Update: {
          id?: string
          topic_id?: string | null
          article_id?: string | null
          request_data?: Json
          status?: string
          phase?: string
          percentage?: number
          current_step?: string
          estimated_time_remaining?: number | null
          provider_used?: string | null
          cost?: number | null
          word_count?: number | null
          seo_score?: number | null
          result_data?: Json | null
          error_message?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          last_updated?: string | null
          attempts?: number
          max_attempts?: number
          last_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics_with_article_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles_with_shopify_status"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keywords: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          keyword: string
          priority: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
          priority?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          priority?: number | null
        }
        Relationships: []
      }
      shopify_products: {
        Row: {
          collections: Json | null
          created_at: string | null
          description: string | null
          handle: string
          id: string
          images: Json | null
          inventory_quantity: number | null
          last_synced: string | null
          price_max: number | null
          price_min: number | null
          product_type: string | null
          shopify_id: number
          shopify_url: string | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          collections?: Json | null
          created_at?: string | null
          description?: string | null
          handle: string
          id?: string
          images?: Json | null
          inventory_quantity?: number | null
          last_synced?: string | null
          price_max?: number | null
          price_min?: number | null
          product_type?: string | null
          shopify_id: number
          shopify_url?: string | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          collections?: Json | null
          created_at?: string | null
          description?: string | null
          handle?: string
          id?: string
          images?: Json | null
          inventory_quantity?: number | null
          last_synced?: string | null
          price_max?: number | null
          price_min?: number | null
          product_type?: string | null
          shopify_id?: number
          shopify_url?: string | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          competition_score: number | null
          content_template: string | null
          created_at: string | null
          id: string
          industry: string | null
          keywords: Json | null
          market_segment: string | null
          priority_score: number | null
          search_volume: number | null
          status: string | null
          style_preferences: Json | null
          topic_title: string
          used_at: string | null
        }
        Insert: {
          competition_score?: number | null
          content_template?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          keywords?: Json | null
          market_segment?: string | null
          priority_score?: number | null
          search_volume?: number | null
          status?: string | null
          style_preferences?: Json | null
          topic_title: string
          used_at?: string | null
        }
        Update: {
          competition_score?: number | null
          content_template?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          keywords?: Json | null
          market_segment?: string | null
          priority_score?: number | null
          search_volume?: number | null
          status?: string | null
          style_preferences?: Json | null
          topic_title?: string
          used_at?: string | null
        }
        Relationships: []
      }
      workflow_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_data: Json | null
          execution_id: string | null
          id: string
          status: string | null
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_data?: Json | null
          execution_id?: string | null
          id?: string
          status?: string | null
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_data?: Json | null
          execution_id?: string | null
          id?: string
          status?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      articles_with_shopify_status: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          is_synced_to_shopify: boolean | null
          meta_description: string | null
          published_at: string | null
          reading_time: number | null
          scheduled_publish_date: string | null
          seo_score: number | null
          shopify_article_id: number | null
          shopify_blog_id: number | null
          shopify_status: string | null
          slug: string | null
          status: Database["public"]["Enums"]["article_status_v2"] | null
          target_keywords: Json | null
          title: string | null
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_synced_to_shopify?: never
          meta_description?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_publish_date?: string | null
          seo_score?: number | null
          shopify_article_id?: number | null
          shopify_blog_id?: number | null
          shopify_status?: never
          slug?: string | null
          status?: Database["public"]["Enums"]["article_status_v2"] | null
          target_keywords?: Json | null
          title?: string | null
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_synced_to_shopify?: never
          meta_description?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_publish_date?: string | null
          seo_score?: number | null
          shopify_article_id?: number | null
          shopify_blog_id?: number | null
          shopify_status?: never
          slug?: string | null
          status?: Database["public"]["Enums"]["article_status_v2"] | null
          target_keywords?: Json | null
          title?: string | null
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      active_generation_jobs: {
        Row: {
          id: string | null
          topic_id: string | null
          article_id: string | null
          request_data: Json | null
          status: string | null
          phase: string | null
          percentage: number | null
          current_step: string | null
          estimated_time_remaining: number | null
          provider_used: string | null
          cost: number | null
          word_count: number | null
          seo_score: number | null
          result_data: Json | null
          error_message: string | null
          created_at: string | null
          started_at: string | null
          completed_at: string | null
          last_updated: string | null
          attempts: number | null
          max_attempts: number | null
          last_error: string | null
          topic_title: string | null
          topic_keywords: Json | null
          article_title: string | null
          article_status: Database["public"]["Enums"]["article_status_v2"] | null
          age_seconds: number | null
          processing_duration_seconds: number | null
        }
        Insert: {
          id?: string | null
          topic_id?: string | null
          article_id?: string | null
          request_data?: Json | null
          status?: string | null
          phase?: string | null
          percentage?: number | null
          current_step?: string | null
          estimated_time_remaining?: number | null
          provider_used?: string | null
          cost?: number | null
          word_count?: number | null
          seo_score?: number | null
          result_data?: Json | null
          error_message?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          last_updated?: string | null
          attempts?: number | null
          max_attempts?: number | null
          last_error?: string | null
          topic_title?: string | null
          topic_keywords?: Json | null
          article_title?: string | null
          article_status?: Database["public"]["Enums"]["article_status_v2"] | null
          age_seconds?: number | null
          processing_duration_seconds?: number | null
        }
        Update: {
          id?: string | null
          topic_id?: string | null
          article_id?: string | null
          request_data?: Json | null
          status?: string | null
          phase?: string | null
          percentage?: number | null
          current_step?: string | null
          estimated_time_remaining?: number | null
          provider_used?: string | null
          cost?: number | null
          word_count?: number | null
          seo_score?: number | null
          result_data?: Json | null
          error_message?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          last_updated?: string | null
          attempts?: number | null
          max_attempts?: number | null
          last_error?: string | null
          topic_title?: string | null
          topic_keywords?: Json | null
          article_title?: string | null
          article_status?: Database["public"]["Enums"]["article_status_v2"] | null
          age_seconds?: number | null
          processing_duration_seconds?: number | null
        }
        Relationships: []
      }
      generation_analytics: {
        Row: {
          ai_model_used: string | null
          avg_generation_time_seconds: number | null
          failed_generations: number | null
          first_generation: string | null
          generation_prompt_version: string | null
          last_generation: string | null
          successful_generations: number | null
          total_generations: number | null
        }
        Relationships: []
      }
      generation_job_stats: {
        Row: {
          total_jobs: number | null
          pending_jobs: number | null
          processing_jobs: number | null
          completed_jobs: number | null
          failed_jobs: number | null
          cancelled_jobs: number | null
          avg_processing_time_seconds: number | null
          jobs_last_hour: number | null
          jobs_last_day: number | null
        }
        Insert: {
          total_jobs?: number | null
          pending_jobs?: number | null
          processing_jobs?: number | null
          completed_jobs?: number | null
          failed_jobs?: number | null
          cancelled_jobs?: number | null
          avg_processing_time_seconds?: number | null
          jobs_last_hour?: number | null
          jobs_last_day?: number | null
        }
        Update: {
          total_jobs?: number | null
          pending_jobs?: number | null
          processing_jobs?: number | null
          completed_jobs?: number | null
          failed_jobs?: number | null
          cancelled_jobs?: number | null
          avg_processing_time_seconds?: number | null
          jobs_last_hour?: number | null
          jobs_last_day?: number | null
        }
        Relationships: []
      }
      topics_with_article_status: {
        Row: {
          article_count: number | null
          competition_score: number | null
          content_template: string | null
          created_at: string | null
          has_published_articles: boolean | null
          id: string | null
          industry: string | null
          keywords: Json | null
          last_published_at: string | null
          market_segment: string | null
          priority_score: number | null
          published_article_count: number | null
          search_volume: number | null
          status: string | null
          style_preferences: Json | null
          topic_status: string | null
          topic_title: string | null
          used_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_generation_jobs: {
        Args: {}
        Returns: number
      }
      get_generation_duration: {
        Args: { article_id: string }
        Returns: unknown
      }
      get_job_progress: {
        Args: { job_id: string }
        Returns: Json
      }
    }
    Enums: {
      article_status_v2:
        | "draft"
        | "generating"
        | "generation_failed"
        | "ready_for_editorial"
        | "published"
        | "published_hidden"
        | "published_visible"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      article_status_v2: [
        "draft",
        "generating",
        "generation_failed",
        "ready_for_editorial",
        "published",
        "published_hidden",
        "published_visible",
      ],
    },
  },
} as const

// Helper types for V2 article statuses
export type ArticleStatus = Database["public"]["Enums"]["article_status_v2"]

// Enhanced interfaces for V2 features
export interface StylePreferences {
  [key: string]: string | undefined
  tone?: string
  length?: string
  target_audience?: string
  template_type?: string
  custom_notes?: string
}

// V2 Article interface with generation metadata
export interface ArticleWithGeneration extends Tables<'articles'> {
  generation_duration?: string // calculated field
  is_ai_generated?: boolean // helper field
}

// Generation analytics interface
export interface GenerationMetrics extends Tables<'generation_analytics'> {
  success_rate?: number // calculated field
}

// Legacy conversion functions (updated for V2 compatibility)
export function dbTopicToFormData(dbTopic: Database['public']['Tables']['topics']['Row']): {
  title: string
  keywords?: string
  tone?: string
  length?: string
  template?: string
} {
  const stylePrefs = dbTopic.style_preferences as StylePreferences | null
  const keywords = Array.isArray(dbTopic.keywords) 
    ? (dbTopic.keywords as string[]).join(', ')
    : typeof dbTopic.keywords === 'string' 
    ? dbTopic.keywords 
    : ''

  return {
    title: dbTopic.topic_title,
    keywords: keywords || '',
    tone: stylePrefs?.tone || '',
    length: stylePrefs?.length || '',
    template: dbTopic.content_template || ''
  }
}

export function formDataToDbInsert(formData: {
  title: string
  keywords?: string
  tone?: string
  length?: string
  template?: string
  content_template?: string
}): Database['public']['Tables']['topics']['Insert'] {
  const keywordsArray = formData.keywords 
    ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
    : []

  const stylePreferences: StylePreferences = {}
  if (formData.tone) stylePreferences.tone = formData.tone
  if (formData.length) stylePreferences.length = formData.length

  return {
    topic_title: formData.title,
    keywords: keywordsArray.length > 0 ? keywordsArray : null,
    content_template: formData.content_template || formData.template || null,
    style_preferences: Object.keys(stylePreferences).length > 0 ? stylePreferences : null
  }
}

export function formDataToDbUpdate(formData: {
  title: string
  keywords?: string
  tone?: string
  length?: string
  template?: string
  content_template?: string
}): Database['public']['Tables']['topics']['Update'] {
  const keywordsArray = formData.keywords 
    ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
    : []

  const stylePreferences: StylePreferences = {}
  if (formData.tone) stylePreferences.tone = formData.tone
  if (formData.length) stylePreferences.length = formData.length

  return {
    topic_title: formData.title,
    keywords: keywordsArray.length > 0 ? keywordsArray : null,
    content_template: formData.content_template || formData.template || null,
    style_preferences: Object.keys(stylePreferences).length > 0 ? stylePreferences : null
  }
} 