export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          content: string
          created_at: string | null
          id: string
          meta_description: string | null
          published_at: string | null
          reading_time: number | null
          scheduled_publish_date: string | null
          seo_score: number | null
          shopify_article_id: number | null
          shopify_blog_id: number | null
          slug: string | null
          status: string | null
          target_keywords: Json | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_publish_date?: string | null
          seo_score?: number | null
          shopify_article_id?: number | null
          shopify_blog_id?: number | null
          slug?: string | null
          status?: string | null
          target_keywords?: Json | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_publish_date?: string | null
          seo_score?: number | null
          shopify_article_id?: number | null
          shopify_blog_id?: number | null
          slug?: string | null
          status?: string | null
          target_keywords?: Json | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          target_keywords?: Json | null
          title?: string | null
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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