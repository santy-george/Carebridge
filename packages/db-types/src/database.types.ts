export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      care_assignments: {
        Row: {
          assigned_at: string
          assigned_role: string
          coordinator_id: string
          id: string
          is_active: boolean
          member_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_role?: string
          coordinator_id: string
          id?: string
          is_active?: boolean
          member_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_role?: string
          coordinator_id?: string
          id?: string
          is_active?: boolean
          member_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_assignments_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      care_team: {
        Row: {
          address: string | null
          coordinator_profile_id: string | null
          created_at: string
          created_by: string | null
          display_order: number
          email: string | null
          id: string
          initials: string | null
          member_id: string
          name: string
          notes: string | null
          phone: string | null
          role_label: string
        }
        Insert: {
          address?: string | null
          coordinator_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          id?: string
          initials?: string | null
          member_id: string
          name: string
          notes?: string | null
          phone?: string | null
          role_label: string
        }
        Update: {
          address?: string | null
          coordinator_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          id?: string
          initials?: string | null
          member_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_team_coordinator_profile_id_fkey"
            columns: ["coordinator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_team_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_team_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          ache_tags: string[]
          aches: string | null
          appetite: string | null
          breathing: string | null
          checkin_date: string
          created_at: string
          energy: string | null
          id: string
          member_id: string
          mood: string | null
          notes: string | null
          sleep: string | null
          wellness_score: number | null
        }
        Insert: {
          ache_tags?: string[]
          aches?: string | null
          appetite?: string | null
          breathing?: string | null
          checkin_date?: string
          created_at?: string
          energy?: string | null
          id?: string
          member_id: string
          mood?: string | null
          notes?: string | null
          sleep?: string | null
          wellness_score?: number | null
        }
        Update: {
          ache_tags?: string[]
          aches?: string | null
          appetite?: string | null
          breathing?: string | null
          checkin_date?: string
          created_at?: string
          energy?: string | null
          id?: string
          member_id?: string
          mood?: string | null
          notes?: string | null
          sleep?: string | null
          wellness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          event: Database["public"]["Enums"]["consent_event"]
          id: string
          member_id: string | null
          member_name_snapshot: string | null
          policy_version: string
          scope: Database["public"]["Enums"]["consent_scope"] | null
          subject_email: string | null
          user_id: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event: Database["public"]["Enums"]["consent_event"]
          id?: string
          member_id?: string | null
          member_name_snapshot?: string | null
          policy_version?: string
          scope?: Database["public"]["Enums"]["consent_scope"] | null
          subject_email?: string | null
          user_id?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event?: Database["public"]["Enums"]["consent_event"]
          id?: string
          member_id?: string | null
          member_name_snapshot?: string | null
          policy_version?: string
          scope?: Database["public"]["Enums"]["consent_scope"] | null
          subject_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          member_id: string
          mime_type: string | null
          notes: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          member_id: string
          mime_type?: string | null
          notes?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          member_id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      glucose_readings: {
        Row: {
          context: Database["public"]["Enums"]["glucose_context"]
          created_at: string
          id: string
          member_id: string
          reading_date: string
          reading_time: string
          value_mg_dl: number
        }
        Insert: {
          context: Database["public"]["Enums"]["glucose_context"]
          created_at?: string
          id?: string
          member_id: string
          reading_date: string
          reading_time: string
          value_mg_dl: number
        }
        Update: {
          context?: Database["public"]["Enums"]["glucose_context"]
          created_at?: string
          id?: string
          member_id?: string
          reading_date?: string
          reading_time?: string
          value_mg_dl?: number
        }
        Relationships: [
          {
            foreignKeyName: "glucose_readings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      med_stock: {
        Row: {
          created_at: string
          date_stocked: string
          doses_per_day: number
          expiry_date: string | null
          high_risk: boolean
          id: string
          member_id: string
          name: string
          prescribed_by: string | null
          qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_stocked?: string
          doses_per_day?: number
          expiry_date?: string | null
          high_risk?: boolean
          id?: string
          member_id: string
          name: string
          prescribed_by?: string | null
          qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_stocked?: string
          doses_per_day?: number
          expiry_date?: string | null
          high_risk?: boolean
          id?: string
          member_id?: string
          name?: string
          prescribed_by?: string | null
          qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_stock_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_profile: {
        Row: {
          allergies: string[]
          conditions: string[]
          conditions_other: string | null
          member_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string[]
          conditions?: string[]
          conditions_other?: string | null
          member_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string[]
          conditions?: string[]
          conditions_other?: string | null
          member_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_profile_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          member_id: string
          scheduled_date: string
          taken: boolean
          taken_at: string | null
          time_of_day: Database["public"]["Enums"]["time_of_day_band"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          member_id: string
          scheduled_date: string
          taken?: boolean
          taken_at?: string | null
          time_of_day?: Database["public"]["Enums"]["time_of_day_band"] | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          member_id?: string
          scheduled_date?: string
          taken?: boolean
          taken_at?: string | null
          time_of_day?: Database["public"]["Enums"]["time_of_day_band"] | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          dosage: string | null
          form: string | null
          frequency: string | null
          high_risk: boolean
          id: string
          member_id: string
          name: string
          notes: string | null
          prescribed_by: string | null
          purpose: string | null
          source: Database["public"]["Enums"]["medication_source"]
          specific_time: string | null
          time_of_day: Database["public"]["Enums"]["time_of_day_band"][]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dosage?: string | null
          form?: string | null
          frequency?: string | null
          high_risk?: boolean
          id?: string
          member_id: string
          name: string
          notes?: string | null
          prescribed_by?: string | null
          purpose?: string | null
          source?: Database["public"]["Enums"]["medication_source"]
          specific_time?: string | null
          time_of_day?: Database["public"]["Enums"]["time_of_day_band"][]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dosage?: string | null
          form?: string | null
          frequency?: string | null
          high_risk?: boolean
          id?: string
          member_id?: string
          name?: string
          notes?: string | null
          prescribed_by?: string | null
          purpose?: string | null
          source?: Database["public"]["Enums"]["medication_source"]
          specific_time?: string | null
          time_of_day?: Database["public"]["Enums"]["time_of_day_band"][]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_self: boolean
          member_id: string
          relationship_label: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_self?: boolean
          member_id: string
          relationship_label?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_self?: boolean
          member_id?: string
          relationship_label?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_invites_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_links: {
        Row: {
          created_at: string
          id: string
          is_self: boolean
          member_id: string
          relationship_label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_self?: boolean
          member_id: string
          relationship_label?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_self?: boolean
          member_id?: string
          relationship_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_links_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          care_model: Database["public"]["Enums"]["care_model"]
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          location: string | null
          phone: string | null
          plan_level: Database["public"]["Enums"]["plan_level"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          care_model?: Database["public"]["Enums"]["care_model"]
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          plan_level?: Database["public"]["Enums"]["plan_level"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          care_model?: Database["public"]["Enums"]["care_model"]
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          plan_level?: Database["public"]["Enums"]["plan_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_plan_goals: {
        Row: {
          completed_at: string | null
          completed_note: string | null
          created_at: string
          created_by: string | null
          display_order: number
          due_date: string | null
          icon: string
          id: string
          member_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          completed_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          due_date?: string | null
          icon?: string
          id?: string
          member_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          completed_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          due_date?: string | null
          icon?: string
          id?: string
          member_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_plan_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventive_plan_goals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consent_status: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          consent_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          consent_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database["public"]["Enums"]["sos_alert_type"]
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          member_id: string
          notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["sos_alert_status"]
          triggered_at: string
          wearable_reading_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: Database["public"]["Enums"]["sos_alert_type"]
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          member_id: string
          notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["sos_alert_status"]
          triggered_at?: string
          wearable_reading_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: Database["public"]["Enums"]["sos_alert_type"]
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          member_id?: string
          notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["sos_alert_status"]
          triggered_at?: string
          wearable_reading_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_wearable_reading_id_fkey"
            columns: ["wearable_reading_id"]
            isOneToOne: false
            referencedRelation: "wearable_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_leads: {
        Row: {
          created_at: string
          followed_up_at: string | null
          followed_up_by: string | null
          id: string
          member_id: string
          notes: string | null
          requested_care_model: Database["public"]["Enums"]["care_model"]
          requested_plan_level: Database["public"]["Enums"]["plan_level"] | null
          status: Database["public"]["Enums"]["upgrade_lead_status"]
        }
        Insert: {
          created_at?: string
          followed_up_at?: string | null
          followed_up_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          requested_care_model: Database["public"]["Enums"]["care_model"]
          requested_plan_level?:
            | Database["public"]["Enums"]["plan_level"]
            | null
          status?: Database["public"]["Enums"]["upgrade_lead_status"]
        }
        Update: {
          created_at?: string
          followed_up_at?: string | null
          followed_up_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          requested_care_model?: Database["public"]["Enums"]["care_model"]
          requested_plan_level?:
            | Database["public"]["Enums"]["plan_level"]
            | null
          status?: Database["public"]["Enums"]["upgrade_lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_leads_followed_up_by_fkey"
            columns: ["followed_up_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_leads_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals_readings: {
        Row: {
          created_at: string
          id: string
          member_id: string
          recorded_at: string
          source: string
          value: number
          value_secondary: number | null
          vital_type: Database["public"]["Enums"]["vital_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          recorded_at?: string
          source?: string
          value: number
          value_secondary?: number | null
          vital_type: Database["public"]["Enums"]["vital_type"]
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          recorded_at?: string
          source?: string
          value?: number
          value_secondary?: number | null
          vital_type?: Database["public"]["Enums"]["vital_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vitals_readings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_readings: {
        Row: {
          device_id: string | null
          device_vendor: string
          id: string
          ingested_at: string
          member_id: string
          raw_payload: Json | null
          reading_type: string
          recorded_at: string
          value: number | null
        }
        Insert: {
          device_id?: string | null
          device_vendor: string
          id?: string
          ingested_at?: string
          member_id: string
          raw_payload?: Json | null
          reading_type: string
          recorded_at: string
          value?: number | null
        }
        Update: {
          device_id?: string | null
          device_vendor?: string
          id?: string
          ingested_at?: string
          member_id?: string
          raw_payload?: Json | null
          reading_type?: string
          recorded_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_readings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_member: { Args: { p_member_id: string }; Returns: boolean }
      is_assigned_coordinator: {
        Args: { p_member_id: string }
        Returns: boolean
      }
      is_coordinator: { Args: never; Returns: boolean }
      member_owns: { Args: { p_member_id: string }; Returns: boolean }
      member_update_preserves_clinical_fields: {
        Args: {
          p_care_model: Database["public"]["Enums"]["care_model"]
          p_date_of_birth: string
          p_full_name: string
          p_id: string
          p_location: string
          p_plan_level: Database["public"]["Enums"]["plan_level"]
        }
        Returns: boolean
      }
      profile_update_preserves_consent_status: {
        Args: { p_consent_status: string; p_id: string }
        Returns: boolean
      }
      reactivate_consent: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: undefined
      }
      redeem_invite_code: { Args: { p_code: string }; Returns: string }
      request_consent_withdrawal: {
        Args: {
          p_member_id: string
          p_scope: Database["public"]["Enums"]["consent_scope"]
        }
        Returns: undefined
      }
    }
    Enums: {
      care_model: "self_care" | "virtual_care" | "direct_care"
      consent_event: "given" | "withdrawal_requested" | "withdrawal_verified"
      consent_scope: "self" | "all"
      document_category:
        | "lab_report"
        | "prescription"
        | "scan_imaging"
        | "other"
      glucose_context: "fasting" | "pre_meal" | "post_meal" | "bedtime"
      medication_source: "otc" | "prescription"
      plan_level: "basic" | "standard" | "premium"
      sos_alert_status: "open" | "acknowledged" | "resolved" | "false_alarm"
      sos_alert_type: "manual" | "wearable_fall"
      time_of_day_band: "morning" | "noon" | "evening" | "night"
      upgrade_lead_status: "new" | "contacted" | "converted" | "declined"
      user_role: "member" | "coordinator"
      vital_type:
        | "weight_kg"
        | "height_cm"
        | "heart_rate_bpm"
        | "blood_pressure"
        | "spo2_pct"
        | "respiratory_rate_bpm"
        | "sleep_hours"
        | "steps"
        | "hrv_ms"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      care_model: ["self_care", "virtual_care", "direct_care"],
      consent_event: ["given", "withdrawal_requested", "withdrawal_verified"],
      consent_scope: ["self", "all"],
      document_category: [
        "lab_report",
        "prescription",
        "scan_imaging",
        "other",
      ],
      glucose_context: ["fasting", "pre_meal", "post_meal", "bedtime"],
      medication_source: ["otc", "prescription"],
      plan_level: ["basic", "standard", "premium"],
      sos_alert_status: ["open", "acknowledged", "resolved", "false_alarm"],
      sos_alert_type: ["manual", "wearable_fall"],
      time_of_day_band: ["morning", "noon", "evening", "night"],
      upgrade_lead_status: ["new", "contacted", "converted", "declined"],
      user_role: ["member", "coordinator"],
      vital_type: [
        "weight_kg",
        "height_cm",
        "heart_rate_bpm",
        "blood_pressure",
        "spo2_pct",
        "respiratory_rate_bpm",
        "sleep_hours",
        "steps",
        "hrv_ms",
      ],
    },
  },
} as const

