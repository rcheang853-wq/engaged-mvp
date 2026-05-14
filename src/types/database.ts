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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean | null
          calendar_id: string
          category_main: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discoverable_by_others: boolean | null
          end_at: string | null
          id: string
          linked_event_id: string | null
          location: string | null
          notes: string | null
          public_event_id: string | null
          reminder_minutes: number | null
          share_enabled: boolean | null
          share_slug: string | null
          start_at: string
          tags: string[] | null
          timezone: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          all_day?: boolean | null
          calendar_id: string
          category_main?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discoverable_by_others?: boolean | null
          end_at?: string | null
          id?: string
          linked_event_id?: string | null
          location?: string | null
          notes?: string | null
          public_event_id?: string | null
          reminder_minutes?: number | null
          share_enabled?: boolean | null
          share_slug?: string | null
          start_at: string
          tags?: string[] | null
          timezone?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          all_day?: boolean | null
          calendar_id?: string
          category_main?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discoverable_by_others?: boolean | null
          end_at?: string | null
          id?: string
          linked_event_id?: string | null
          location?: string | null
          notes?: string | null
          public_event_id?: string | null
          reminder_minutes?: number | null
          share_enabled?: boolean | null
          share_slug?: string | null
          start_at?: string
          tags?: string[] | null
          timezone?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "active_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "invalid_events_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "user_calendar_view"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "calendar_events_public_event_id_fkey"
            columns: ["public_event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_invites: {
        Row: {
          accepted_at: string | null
          calendar_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string | null
          invited_email: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["calendar_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          calendar_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_email: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["calendar_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          calendar_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["calendar_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_invites_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_members: {
        Row: {
          calendar_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["calendar_role"]
          user_id: string
        }
        Insert: {
          calendar_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["calendar_role"]
          user_id: string
        }
        Update: {
          calendar_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["calendar_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          default_join_role: Database["public"]["Enums"]["calendar_role"]
          description: string | null
          id: string
          invite_code: string | null
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_join_role?: Database["public"]["Enums"]["calendar_role"]
          description?: string | null
          id?: string
          invite_code?: string | null
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_join_role?: Database["public"]["Enums"]["calendar_role"]
          description?: string | null
          id?: string
          invite_code?: string | null
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_analytics: {
        Row: {
          created_at: string
          date: string
          event_id: string
          id: string
          saves_count: number | null
          swipes_like: number | null
          swipes_pass: number | null
          swipes_superlike: number | null
          traffic_sources: Json | null
          views_count: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          event_id: string
          id?: string
          saves_count?: number | null
          swipes_like?: number | null
          swipes_pass?: number | null
          swipes_superlike?: number | null
          traffic_sources?: Json | null
          views_count?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          event_id?: string
          id?: string
          saves_count?: number | null
          swipes_like?: number | null
          swipes_pass?: number | null
          swipes_superlike?: number | null
          traffic_sources?: Json | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "active_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "invalid_events_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "user_calendar_view"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          body: string
          calendar_event_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          calendar_event_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          calendar_event_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sources: {
        Row: {
          base_url: string
          created_at: string
          default_timezone: string
          error_count: number | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_scraped_at: string | null
          name: string
          next_scrape_at: string | null
          scrape_config: Json | null
          scrape_frequency_hours: number | null
          source_type: string
          timezone_strategy: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          default_timezone?: string
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_scraped_at?: string | null
          name: string
          next_scrape_at?: string | null
          scrape_config?: Json | null
          scrape_frequency_hours?: number | null
          source_type: string
          timezone_strategy?: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          default_timezone?: string
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_scraped_at?: string | null
          name?: string
          next_scrape_at?: string | null
          scrape_config?: Json | null
          scrape_frequency_hours?: number | null
          source_type?: string
          timezone_strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          ai_score_factors: Json | null
          all_day: boolean | null
          capacity: number | null
          category_id: string | null
          created_at: string
          custom_location: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          gallery_urls: string[] | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          is_trending: boolean | null
          last_scraped_at: string | null
          organizer_id: string | null
          popularity_score: number | null
          poster_url: string | null
          price_range: number[] | null
          published_at: string | null
          quality_score: number | null
          registration_required: boolean | null
          scrape_hash: string | null
          short_description: string | null
          source_type: string | null
          source_url: string | null
          start_time: string
          status: string | null
          tags: string[] | null
          ticket_url: string | null
          timezone: string | null
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          ai_score_factors?: Json | null
          all_day?: boolean | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          custom_location?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          gallery_urls?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_trending?: boolean | null
          last_scraped_at?: string | null
          organizer_id?: string | null
          popularity_score?: number | null
          poster_url?: string | null
          price_range?: number[] | null
          published_at?: string | null
          quality_score?: number | null
          registration_required?: boolean | null
          scrape_hash?: string | null
          short_description?: string | null
          source_type?: string | null
          source_url?: string | null
          start_time: string
          status?: string | null
          tags?: string[] | null
          ticket_url?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          ai_score_factors?: Json | null
          all_day?: boolean | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          custom_location?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          gallery_urls?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_trending?: boolean | null
          last_scraped_at?: string | null
          organizer_id?: string | null
          popularity_score?: number | null
          poster_url?: string | null
          price_range?: number[] | null
          published_at?: string | null
          quality_score?: number | null
          registration_required?: boolean | null
          scrape_hash?: string | null
          short_description?: string | null
          source_type?: string | null
          source_url?: string | null
          start_time?: string
          status?: string | null
          tags?: string[] | null
          ticket_url?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          bio: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          logo_url: string | null
          organization_name: string
          social_links: Json | null
          updated_at: string
          user_id: string | null
          verification_level: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          organization_name: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
          verification_level?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          organization_name?: string
          social_links?: Json | null
          updated_at?: string
          user_id?: string | null
          verification_level?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          status: string
          stripe_payment_intent_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          status: string
          stripe_payment_intent_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_preferences: Json | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_pro: boolean | null
          is_public: boolean | null
          notification_preferences: Json | null
          preferred_categories: string[] | null
          preferred_price_range: number[] | null
          preferred_radius: number | null
          preferred_times: string[] | null
          pro_expires_at: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          ai_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_pro?: boolean | null
          is_public?: boolean | null
          notification_preferences?: Json | null
          preferred_categories?: string[] | null
          preferred_price_range?: number[] | null
          preferred_radius?: number | null
          preferred_times?: string[] | null
          pro_expires_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_pro?: boolean | null
          is_public?: boolean | null
          notification_preferences?: Json | null
          preferred_categories?: string[] | null
          preferred_price_range?: number[] | null
          preferred_radius?: number | null
          preferred_times?: string[] | null
          pro_expires_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      public_event_ingest_errors: {
        Row: {
          debug_payload: Json | null
          error_type: string | null
          happened_at: string
          id: string
          message: string | null
          run_id: string | null
          source_id: string | null
          url: string | null
        }
        Insert: {
          debug_payload?: Json | null
          error_type?: string | null
          happened_at?: string
          id?: string
          message?: string | null
          run_id?: string | null
          source_id?: string | null
          url?: string | null
        }
        Update: {
          debug_payload?: Json | null
          error_type?: string | null
          happened_at?: string
          id?: string
          message?: string | null
          run_id?: string | null
          source_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_event_ingest_errors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "public_event_source_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_event_ingest_errors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      public_event_saves: {
        Row: {
          created_at: string
          public_event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          public_event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          public_event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_event_saves_public_event_id_fkey"
            columns: ["public_event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      public_event_source_runs: {
        Row: {
          errors_count: number
          events_found: number
          events_upserted: number
          finished_at: string | null
          id: string
          notes: Json | null
          source_id: string | null
          started_at: string
          status: string | null
        }
        Insert: {
          errors_count?: number
          events_found?: number
          events_upserted?: number
          finished_at?: string | null
          id?: string
          notes?: Json | null
          source_id?: string | null
          started_at?: string
          status?: string | null
        }
        Update: {
          errors_count?: number
          events_found?: number
          events_upserted?: number
          finished_at?: string | null
          id?: string
          notes?: Json | null
          source_id?: string | null
          started_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_event_source_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      public_events: {
        Row: {
          address: string | null
          all_day: boolean
          categories: string[] | null
          city: string
          country: string
          created_at: string
          currency: string
          description: string | null
          end_at: string | null
          id: string
          images: string[] | null
          is_free: boolean | null
          organizer_name: string | null
          price_max: number | null
          price_min: number | null
          raw_data: Json | null
          region: string | null
          source_event_id: string
          source_id: string | null
          start_at: string
          status: string
          ticket_url: string | null
          timezone: string
          title: string
          updated_at: string
          url: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          all_day?: boolean
          categories?: string[] | null
          city?: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          end_at?: string | null
          id?: string
          images?: string[] | null
          is_free?: boolean | null
          organizer_name?: string | null
          price_max?: number | null
          price_min?: number | null
          raw_data?: Json | null
          region?: string | null
          source_event_id: string
          source_id?: string | null
          start_at: string
          status?: string
          ticket_url?: string | null
          timezone?: string
          title: string
          updated_at?: string
          url?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          all_day?: boolean
          categories?: string[] | null
          city?: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          end_at?: string | null
          id?: string
          images?: string[] | null
          is_free?: boolean | null
          organizer_name?: string | null
          price_max?: number | null
          price_min?: number | null
          raw_data?: Json | null
          region?: string | null
          source_event_id?: string
          source_id?: string | null
          start_at?: string
          status?: string
          ticket_url?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          url?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          events_created: number | null
          events_found: number | null
          events_skipped: number | null
          events_updated: number | null
          id: string
          job_metadata: Json | null
          retry_count: number | null
          source_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          events_created?: number | null
          events_found?: number | null
          events_skipped?: number | null
          events_updated?: number | null
          id?: string
          job_metadata?: Json | null
          retry_count?: number | null
          source_id?: string | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          events_created?: number | null
          events_found?: number | null
          events_skipped?: number | null
          events_updated?: number | null
          id?: string
          job_metadata?: Json | null
          retry_count?: number | null
          source_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancel_at_period_end: boolean | null
          created_at: string
          currency: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_type: string | null
          status: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          plan_type?: string | null
          status: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_type?: string | null
          status?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          created_at: string
          date: string
          events_saved: number | null
          events_viewed: number | null
          id: string
          sessions_count: number | null
          swipes_like_rate: number | null
          swipes_total: number | null
          total_session_time: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          events_saved?: number | null
          events_viewed?: number | null
          id?: string
          sessions_count?: number | null
          swipes_like_rate?: number | null
          swipes_total?: number | null
          total_session_time?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          events_saved?: number | null
          events_viewed?: number | null
          id?: string
          sessions_count?: number | null
          swipes_like_rate?: number | null
          swipes_total?: number | null
          total_session_time?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          calendar_reminder: boolean | null
          created_at: string
          event_id: string
          id: string
          invited_by: string | null
          is_public: boolean | null
          personal_notes: string | null
          reminder_minutes: number | null
          save_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_reminder?: boolean | null
          created_at?: string
          event_id: string
          id?: string
          invited_by?: string | null
          is_public?: boolean | null
          personal_notes?: string | null
          reminder_minutes?: number | null
          save_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_reminder?: boolean | null
          created_at?: string
          event_id?: string
          id?: string
          invited_by?: string | null
          is_public?: boolean | null
          personal_notes?: string | null
          reminder_minutes?: number | null
          save_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "active_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "invalid_events_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "user_calendar_view"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "user_events_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_swipes: {
        Row: {
          attended: boolean | null
          attended_at: string | null
          created_at: string
          event_id: string
          feedback_score: number | null
          id: string
          swipe_type: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          attended_at?: string | null
          created_at?: string
          event_id: string
          feedback_score?: number | null
          id?: string
          swipe_type: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          attended_at?: string | null
          created_at?: string
          event_id?: string
          feedback_score?: number | null
          id?: string
          swipe_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "active_events_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "invalid_events_preview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "user_calendar_view"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "user_swipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          advanced_filters_used: number | null
          created_at: string
          date: string
          early_alerts_sent: number | null
          id: string
          searches_count: number | null
          superlikes_count: number | null
          swipes_count: number | null
          user_id: string
        }
        Insert: {
          advanced_filters_used?: number | null
          created_at?: string
          date?: string
          early_alerts_sent?: number | null
          id?: string
          searches_count?: number | null
          superlikes_count?: number | null
          swipes_count?: number | null
          user_id: string
        }
        Update: {
          advanced_filters_used?: number | null
          created_at?: string
          date?: string
          early_alerts_sent?: number | null
          id?: string
          searches_count?: number | null
          superlikes_count?: number | null
          swipes_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          amenities: string[] | null
          capacity: number | null
          city: string
          contact_info: Json | null
          created_at: string
          id: string
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          slug: string
          updated_at: string
          venue_type: string | null
          website_url: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          capacity?: number | null
          city?: string
          contact_info?: Json | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          slug: string
          updated_at?: string
          venue_type?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          capacity?: number | null
          city?: string
          contact_info?: Json | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          slug?: string
          updated_at?: string
          venue_type?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_events_view: {
        Row: {
          category_color: string | null
          category_name: string | null
          category_slug: string | null
          description: string | null
          end_time: string | null
          id: string | null
          is_featured: boolean | null
          is_free: boolean | null
          is_trending: boolean | null
          organizer_name: string | null
          popularity_score: number | null
          poster_url: string | null
          price_range: number[] | null
          short_description: string | null
          start_time: string | null
          tags: string[] | null
          title: string | null
          venue_address: string | null
          venue_city: string | null
          venue_name: string | null
        }
        Relationships: []
      }
      invalid_events_preview: {
        Row: {
          custom_location: string | null
          description: string | null
          event_type: string | null
          id: string | null
          invalid_reason: string | null
          start_time: string | null
          title: string | null
          venue_id: string | null
        }
        Insert: {
          custom_location?: string | null
          description?: string | null
          event_type?: string | null
          id?: string | null
          invalid_reason?: never
          start_time?: string | null
          title?: string | null
          venue_id?: string | null
        }
        Update: {
          custom_location?: string | null
          description?: string | null
          event_type?: string | null
          id?: string | null
          invalid_reason?: never
          start_time?: string | null
          title?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calendar_view: {
        Row: {
          all_day: boolean | null
          calendar_reminder: boolean | null
          category_color: string | null
          category_name: string | null
          end_time: string | null
          event_id: string | null
          personal_notes: string | null
          reminder_minutes: number | null
          save_type: string | null
          start_time: string | null
          title: string | null
          user_id: string | null
          venue_address: string | null
          venue_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_calendar_invite: {
        Args: { invite_id: string }
        Returns: undefined
      }
      calculate_event_score: {
        Args: { event_uuid: string; user_uuid: string }
        Returns: number
      }
      check_daily_swipe_limit: { Args: { user_uuid: string }; Returns: boolean }
      check_event_conflicts: {
        Args: {
          event_end: string
          event_start: string
          exclude_event_id?: string
          user_uuid: string
        }
        Returns: {
          conflicting_end: string
          conflicting_event_id: string
          conflicting_start: string
          conflicting_title: string
        }[]
      }
      cleanup_old_analytics: { Args: never; Returns: undefined }
      decline_calendar_invite: {
        Args: { invite_id: string }
        Returns: undefined
      }
      expire_pro_memberships: { Args: never; Returns: undefined }
      generate_share_slug: { Args: never; Returns: string }
      get_invalid_event_stats: {
        Args: never
        Returns: {
          count: number
          reason: string
        }[]
      }
      get_trending_events: {
        Args: { limit_count?: number }
        Returns: {
          event_id: string
          poster_url: string
          start_time: string
          title: string
          trend_score: number
          venue_name: string
        }[]
      }
      get_user_recommendations: {
        Args: { limit_count?: number; offset_count?: number; user_uuid: string }
        Returns: {
          category_name: string
          event_id: string
          poster_url: string
          score: number
          start_time: string
          title: string
          venue_name: string
        }[]
      }
      increment_usage_count: {
        Args: { p_field_name: string; p_usage_date: string; p_user_id: string }
        Returns: number
      }
      increment_user_usage: {
        Args: { increment_by?: number; usage_type: string; user_uuid: string }
        Returns: undefined
      }
      is_calendar_member: { Args: { p_calendar_id: string }; Returns: boolean }
      is_calendar_owner: { Args: { p_calendar_id: string }; Returns: boolean }
      mark_invalid_events: {
        Args: { dry_run?: boolean }
        Returns: {
          action: string
          event_id: string
          event_title: string
          reason: string
        }[]
      }
      record_event_view: {
        Args: {
          event_uuid: string
          traffic_source?: string
          user_uuid?: string
        }
        Returns: undefined
      }
      record_swipe_with_analytics: {
        Args: { event_uuid: string; swipe_action: string; user_uuid: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_user_pro_status: { Args: { user_uuid: string }; Returns: undefined }
      update_event_popularity: {
        Args: { event_uuid: string }
        Returns: undefined
      }
      update_trending_events: { Args: never; Returns: undefined }
      user_has_pro_subscription: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      calendar_role: "owner" | "editor" | "viewer"
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
      calendar_role: ["owner", "editor", "viewer"],
    },
  },
} as const
