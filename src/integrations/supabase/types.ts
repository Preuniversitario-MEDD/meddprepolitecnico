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
      biblioteca: {
        Row: {
          categoria: string | null
          created_at: string | null
          descripcion: string | null
          id: string
          titulo: string
          url: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          titulo: string
          url: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      competencia_participantes: {
        Row: {
          avatar_url: string | null
          competencia_id: string
          created_at: string | null
          id: string
          mejor_racha: number | null
          nombre: string
          powerups: Json | null
          puntaje: number | null
          racha: number | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          competencia_id: string
          created_at?: string | null
          id?: string
          mejor_racha?: number | null
          nombre?: string
          powerups?: Json | null
          puntaje?: number | null
          racha?: number | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          competencia_id?: string
          created_at?: string | null
          id?: string
          mejor_racha?: number | null
          nombre?: string
          powerups?: Json | null
          puntaje?: number | null
          racha?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencia_participantes_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia_preguntas: {
        Row: {
          competencia_id: string
          id: string
          imagen_url: string | null
          opciones: Json
          orden: number | null
          pregunta: string
          respuesta_correcta: number | null
          tiempo: number | null
        }
        Insert: {
          competencia_id: string
          id?: string
          imagen_url?: string | null
          opciones?: Json
          orden?: number | null
          pregunta: string
          respuesta_correcta?: number | null
          tiempo?: number | null
        }
        Update: {
          competencia_id?: string
          id?: string
          imagen_url?: string | null
          opciones?: Json
          orden?: number | null
          pregunta?: string
          respuesta_correcta?: number | null
          tiempo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competencia_preguntas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia_respuestas: {
        Row: {
          competencia_id: string
          correcta: boolean | null
          created_at: string | null
          id: string
          powerup_usado: string | null
          pregunta_id: string
          puntaje: number | null
          respuesta: number
          tiempo_ms: number | null
          user_id: string
        }
        Insert: {
          competencia_id: string
          correcta?: boolean | null
          created_at?: string | null
          id?: string
          powerup_usado?: string | null
          pregunta_id: string
          puntaje?: number | null
          respuesta: number
          tiempo_ms?: number | null
          user_id: string
        }
        Update: {
          competencia_id?: string
          correcta?: boolean | null
          created_at?: string | null
          id?: string
          powerup_usado?: string | null
          pregunta_id?: string
          puntaje?: number | null
          respuesta?: number
          tiempo_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencia_respuestas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencia_respuestas_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "competencia_preguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      competencias: {
        Row: {
          created_at: string | null
          created_by: string
          estado: string
          id: string
          modo: string
          pin: string
          pregunta_actual: number | null
          tiempo_por_pregunta: number | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          estado?: string
          id?: string
          modo?: string
          pin: string
          pregunta_actual?: number | null
          tiempo_por_pregunta?: number | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          estado?: string
          id?: string
          modo?: string
          pin?: string
          pregunta_actual?: number | null
          tiempo_por_pregunta?: number | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contenido: {
        Row: {
          created_at: string
          grupo_nombre: string | null
          id: string
          imagen_url: string | null
          orden: number
          sesion_id: string
          solucion: string | null
          texto: string | null
          tipo: string
          titulo: string
          url: string | null
        }
        Insert: {
          created_at?: string
          grupo_nombre?: string | null
          id?: string
          imagen_url?: string | null
          orden?: number
          sesion_id: string
          solucion?: string | null
          texto?: string | null
          tipo: string
          titulo?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          grupo_nombre?: string | null
          id?: string
          imagen_url?: string | null
          orden?: number
          sesion_id?: string
          solucion?: string | null
          texto?: string | null
          tipo?: string
          titulo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contenido_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      conversacion_participantes: {
        Row: {
          conversacion_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversacion_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversacion_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversacion_participantes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      curso_estudiantes: {
        Row: {
          created_at: string | null
          curso_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          curso_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          curso_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_estudiantes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      curso_sesiones: {
        Row: {
          created_at: string | null
          curso_id: string
          id: string
          orden: number | null
          sesion_id: string
        }
        Insert: {
          created_at?: string | null
          curso_id: string
          id?: string
          orden?: number | null
          sesion_id: string
        }
        Update: {
          created_at?: string | null
          curso_id?: string
          id?: string
          orden?: number | null
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_sesiones_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_sesiones_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          titulo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      exam_configuracion: {
        Row: {
          activo: boolean
          cantidad_preguntas: number
          created_at: string
          id: string
          label: string
          puntaje_aprobacion: number
          sessions: number[]
          tiempo_minutos: number
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cantidad_preguntas?: number
          created_at?: string
          id?: string
          label?: string
          puntaje_aprobacion?: number
          sessions?: number[]
          tiempo_minutos?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cantidad_preguntas?: number
          created_at?: string
          id?: string
          label?: string
          puntaje_aprobacion?: number
          sessions?: number[]
          tiempo_minutos?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      examen_historial: {
        Row: {
          correcta: boolean
          created_at: string
          exam_tipo: string
          id: string
          intento: number
          pregunta_id: string
          user_id: string
        }
        Insert: {
          correcta?: boolean
          created_at?: string
          exam_tipo: string
          id?: string
          intento?: number
          pregunta_id: string
          user_id: string
        }
        Update: {
          correcta?: boolean
          created_at?: string
          exam_tipo?: string
          id?: string
          intento?: number
          pregunta_id?: string
          user_id?: string
        }
        Relationships: []
      }
      examenes: {
        Row: {
          aprobado: boolean | null
          fecha: string | null
          id: string
          puntaje: number | null
          respuestas: Json | null
          tipo: string
          user_id: string
        }
        Insert: {
          aprobado?: boolean | null
          fecha?: string | null
          id?: string
          puntaje?: number | null
          respuestas?: Json | null
          tipo: string
          user_id: string
        }
        Update: {
          aprobado?: boolean | null
          fecha?: string | null
          id?: string
          puntaje?: number | null
          respuestas?: Json | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          archivo_nombre: string | null
          archivo_tipo: string | null
          archivo_url: string | null
          contenido: string
          conversacion_id: string
          created_at: string | null
          id: string
          leido: boolean | null
          sender_id: string
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          contenido: string
          conversacion_id: string
          created_at?: string | null
          id?: string
          leido?: boolean | null
          sender_id: string
        }
        Update: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          contenido?: string
          conversacion_id?: string
          created_at?: string | null
          id?: string
          leido?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      pestanas_sesion: {
        Row: {
          clave: string
          created_at: string | null
          id: string
          nombre: string
          orden: number | null
          sesion_id: string
        }
        Insert: {
          clave: string
          created_at?: string | null
          id?: string
          nombre: string
          orden?: number | null
          sesion_id: string
        }
        Update: {
          clave?: string
          created_at?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pestanas_sesion_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          apellidos: string
          avatar_url: string | null
          cedula: string
          colegio: string | null
          created_at: string
          device_type: string | null
          fecha_nacimiento: string | null
          id: string
          ip_address: string | null
          last_seen_at: string | null
          nombre: string
          primera_vez: boolean
          updated_at: string
          user_id: string
          usuario: string
        }
        Insert: {
          activo?: boolean
          apellidos?: string
          avatar_url?: string | null
          cedula: string
          colegio?: string | null
          created_at?: string
          device_type?: string | null
          fecha_nacimiento?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          nombre?: string
          primera_vez?: boolean
          updated_at?: string
          user_id: string
          usuario?: string
        }
        Update: {
          activo?: boolean
          apellidos?: string
          avatar_url?: string | null
          cedula?: string
          colegio?: string | null
          created_at?: string
          device_type?: string | null
          fecha_nacimiento?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          nombre?: string
          primera_vez?: boolean
          updated_at?: string
          user_id?: string
          usuario?: string
        }
        Relationships: []
      }
      progreso_estudiante: {
        Row: {
          completada: boolean
          ejercicios_completados: number | null
          ejercicios_correctos: number | null
          errores_quiz: number | null
          fecha: string
          id: string
          intentos_quiz: number | null
          preguntas_correctas_total: number | null
          preguntas_respondidas: Json | null
          puntaje_quiz: number | null
          sesion_id: string
          tiempo_invertido: number | null
          user_id: string
        }
        Insert: {
          completada?: boolean
          ejercicios_completados?: number | null
          ejercicios_correctos?: number | null
          errores_quiz?: number | null
          fecha?: string
          id?: string
          intentos_quiz?: number | null
          preguntas_correctas_total?: number | null
          preguntas_respondidas?: Json | null
          puntaje_quiz?: number | null
          sesion_id: string
          tiempo_invertido?: number | null
          user_id: string
        }
        Update: {
          completada?: boolean
          ejercicios_completados?: number | null
          ejercicios_correctos?: number | null
          errores_quiz?: number | null
          fecha?: string
          id?: string
          intentos_quiz?: number | null
          preguntas_correctas_total?: number | null
          preguntas_respondidas?: Json | null
          puntaje_quiz?: number | null
          sesion_id?: string
          tiempo_invertido?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progreso_estudiante_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_preguntas: {
        Row: {
          created_at: string
          dificultad: number
          grupo: number
          id: string
          imagen_url: string | null
          opciones: Json
          pregunta: string
          respuesta_correcta: number
          sesion_id: string
        }
        Insert: {
          created_at?: string
          dificultad?: number
          grupo?: number
          id?: string
          imagen_url?: string | null
          opciones?: Json
          pregunta: string
          respuesta_correcta?: number
          sesion_id: string
        }
        Update: {
          created_at?: string
          dificultad?: number
          grupo?: number
          id?: string
          imagen_url?: string | null
          opciones?: Json
          pregunta?: string
          respuesta_correcta?: number
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_preguntas_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_estudiante: {
        Row: {
          created_at: string
          desbloqueada: boolean
          id: string
          sesion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desbloqueada?: boolean
          id?: string
          sesion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          desbloqueada?: boolean
          id?: string
          sesion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesion_estudiante_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          id: string
          numero: number
          titulo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          numero: number
          titulo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          numero?: number
          titulo?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "estudiante"
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
      app_role: ["admin", "estudiante"],
    },
  },
} as const
