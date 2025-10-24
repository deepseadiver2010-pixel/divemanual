export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_search: {
        Row: {
          clicked_result_id: string | null
          created_at: string
          filters: Json | null
          id: string
          query: string
          results_count: number | null
          search_type: string | null
          user_id: string | null
        }
        Insert: {
          clicked_result_id?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          query: string
          results_count?: number | null
          search_type?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_result_id?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string
          results_count?: number | null
          search_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chapter: string | null
          content_hash: string | null
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          page_id: string | null
          page_number: number | null
          section: string | null
          section_label: string | null
          seq: number | null
          text: string
          token_count: number | null
          volume: string | null
          warning_flags: string[] | null
        }
        Insert: {
          chapter?: string | null
          content_hash?: string | null
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          page_id?: string | null
          page_number?: number | null
          section?: string | null
          section_label?: string | null
          seq?: number | null
          text: string
          token_count?: number | null
          volume?: string | null
          warning_flags?: string[] | null
        }
        Update: {
          chapter?: string | null
          content_hash?: string | null
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          page_id?: string | null
          page_number?: number | null
          section?: string | null
          section_label?: string | null
          seq?: number | null
          text?: string
          token_count?: number | null
          volume?: string | null
          warning_flags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "document_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          chapter: string | null
          content: string | null
          created_at: string
          document_id: string
          id: string
          page_number: number
          section: string | null
          volume: string | null
        }
        Insert: {
          chapter?: string | null
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          page_number: number
          section?: string | null
          volume?: string | null
        }
        Update: {
          chapter?: string | null
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number
          section?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          file_size: number | null
          file_url: string
          id: string
          is_published: boolean
          published_at: string | null
          revision: string | null
          title: string
          total_pages: number | null
          updated_at: string
          uploaded_by: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          revision?: string | null
          title: string
          total_pages?: number | null
          updated_at?: string
          uploaded_by: string
          version: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          revision?: string | null
          title?: string
          total_pages?: number | null
          updated_at?: string
          uploaded_by?: string
          version?: string
        }
        Relationships: []
      }
      event_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          created_at: string
          creation_mode: string | null
          description: string | null
          id: string
          is_organizational: boolean
          is_public: boolean
          source_chapter: string | null
          source_document_id: string | null
          source_volume: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_mode?: string | null
          description?: string | null
          id?: string
          is_organizational?: boolean
          is_public?: boolean
          source_chapter?: string | null
          source_document_id?: string | null
          source_volume?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creation_mode?: string | null
          description?: string | null
          id?: string
          is_organizational?: boolean
          is_public?: boolean
          source_chapter?: string | null
          source_document_id?: string | null
          source_volume?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          card_id: string
          id: string
          quality: number
          response_time_ms: number | null
          reviewed_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          id?: string
          quality: number
          response_time_ms?: number | null
          reviewed_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          id?: string
          quality?: number
          response_time_ms?: number | null
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          card_type: string
          created_at: string
          deck_id: string
          difficulty: number | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_reviewed: string | null
          question: string
          source_page_id: string | null
        }
        Insert: {
          answer: string
          card_type?: string
          created_at?: string
          deck_id: string
          difficulty?: number | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed?: string | null
          question: string
          source_page_id?: string | null
        }
        Update: {
          answer?: string
          card_type?: string
          created_at?: string
          deck_id?: string
          difficulty?: number | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed?: string | null
          question?: string
          source_page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "document_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          safety_filter?: string
          volume_filter?: string
        }
        Returns: {
          chapter: string
          content: string
          document_id: string
          id: string
          page_number: number
          section: string
          similarity: number
          volume: string
          warning_flags: string[]
        }[]
      }
      match_dive_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chapter: string
          document_id: string
          document_title: string
          page_number: number
          section_label: string
          similarity: number
          text: string
          volume: string
        }[]
      }
      search_chunks_fulltext: {
        Args: {
          match_count?: number
          safety_filter?: string
          search_query: string
          volume_filter?: string
        }
        Returns: {
          chapter: string
          content: string
          document_id: string
          id: string
          page_number: number
          section: string
          similarity: number
          volume: string
          warning_flags: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "user"
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
      app_role: ["admin", "instructor", "user"],
    },
  },
} as const
