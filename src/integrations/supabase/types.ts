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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      collection_points: {
        Row: {
          accepted_materials: string[]
          active: boolean
          address: string
          created_at: string
          hours: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          accepted_materials?: string[]
          active?: boolean
          address: string
          created_at?: string
          hours?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          accepted_materials?: string[]
          active?: boolean
          address?: string
          created_at?: string
          hours?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      material_rates: {
        Row: {
          active: boolean
          fenix_per_unit: number
          id: string
          material: string
          quantity_per_fenix: number
          unit: string
        }
        Insert: {
          active?: boolean
          fenix_per_unit?: number
          id?: string
          material: string
          quantity_per_fenix: number
          unit?: string
        }
        Update: {
          active?: boolean
          fenix_per_unit?: number
          id?: string
          material?: string
          quantity_per_fenix?: number
          unit?: string
        }
        Relationships: []
      }
      monitoring_alerts: {
        Row: {
          created_at: string
          id: string
          label: string
          level: string
          message: string
          metric_key: string
          notified: boolean
          threshold: number
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          level: string
          message: string
          metric_key: string
          notified?: boolean
          threshold: number
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          level?: string
          message?: string
          metric_key?: string
          notified?: boolean
          threshold?: number
          value?: number
        }
        Relationships: []
      }
      monitoring_thresholds: {
        Row: {
          created_at: string
          crit_value: number
          direction: string
          enabled: boolean
          id: string
          label: string
          metric_key: string
          unit: string
          updated_at: string
          warn_value: number
        }
        Insert: {
          created_at?: string
          crit_value: number
          direction?: string
          enabled?: boolean
          id?: string
          label: string
          metric_key: string
          unit?: string
          updated_at?: string
          warn_value: number
        }
        Update: {
          created_at?: string
          crit_value?: number
          direction?: string
          enabled?: boolean
          id?: string
          label?: string
          metric_key?: string
          unit?: string
          updated_at?: string
          warn_value?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          total_fc: number
          unit_price_fc: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          total_fc?: number
          unit_price_fc?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          total_fc?: number
          unit_price_fc?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          name: string
          price_fc: number
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          price_fc?: number
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          price_fc?: number
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          level: string
          month_recycled_kg: number
          pending_balance: number
          phone: string | null
          total_recycled_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          level?: string
          month_recycled_kg?: number
          pending_balance?: number
          phone?: string | null
          total_recycled_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          level?: string
          month_recycled_kg?: number
          pending_balance?: number
          phone?: string | null
          total_recycled_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          link_url: string | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          category: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          collection_point_id: string | null
          created_at: string
          description: string
          id: string
          material: string | null
          type: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          amount: number
          category?: string
          collection_point_id?: string | null
          created_at?: string
          description?: string
          id?: string
          material?: string | null
          type: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          amount?: number
          category?: string
          collection_point_id?: string | null
          created_at?: string
          description?: string
          id?: string
          material?: string | null
          type?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_collection_point_id_fkey"
            columns: ["collection_point_id"]
            isOneToOne: false
            referencedRelation: "collection_points"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      _compute_db_metrics: { Args: never; Returns: Json }
      cancel_store_order: { Args: { _order_id: string }; Returns: Json }
      cleanup_old_orders: { Args: never; Returns: number }
      get_db_metrics: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_fifth_business_day: { Args: { _d: string }; Returns: boolean }
      owns_store: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      redeem_store_product: {
        Args: { _product_id: string; _quantity?: number }
        Returns: Json
      }
      release_pending_earnings: { Args: never; Returns: number }
      release_pending_if_due: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "lojista"
      order_status:
        | "pendente"
        | "separacao"
        | "enviado"
        | "entregue"
        | "cancelado"
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
      app_role: ["admin", "moderator", "user", "lojista"],
      order_status: [
        "pendente",
        "separacao",
        "enviado",
        "entregue",
        "cancelado",
      ],
    },
  },
} as const
