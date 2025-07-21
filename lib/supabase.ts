import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          status: string
          priority: "low" | "medium" | "high"
          recurring: "no" | "daily" | "weekly" | "monthly"
          created_at: string
          updated_at: string
          type: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          status?: string
          priority?: "low" | "medium" | "high"
          recurring?: "no" | "daily" | "weekly" | "monthly"
          created_at?: string
          updated_at?: string
          type?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          status?: string
          priority?: "low" | "medium" | "high"
          recurring?: "no" | "daily" | "weekly" | "monthly"
          created_at?: string
          updated_at?: string
          type?: string
        }
      }
      statuses: {
        Row: {
          id: number
          name: string
          color: string
          hex: string
          category: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          color: string
          hex: string
          category: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          color?: string
          hex?: string
          category?: string
          created_at?: string
        }
      }
      colors: {
        Row: {
          id: string
          name: string
          hex: string
          tailwind_class: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          hex: string
          tailwind_class: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          hex?: string
          tailwind_class?: string
          created_at?: string
        }
      }
    }
  }
}
