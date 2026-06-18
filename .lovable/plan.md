## Plan de implementación (en orden de prioridad confirmado)

### 1. Analytics admin del tutor (prioridad 1)
Nueva pestaña **"Tutor IA"** en `AdminDashboard` con:
- **KPIs**: total mensajes, usuarios activos, mensajes/min promedio, costo aproximado.
- **Gráfico temporal** (Recharts): mensajes por hora/día según rango.
- **Top usuarios**: tabla con nombre, cédula, mensajes, último uso.
- **Rango de fechas**: presets (Hoy / 7d / 30d / 90d) + calendario custom.
- Datos desde `tutor_usage` (ya existe) — solo lecturas con RLS admin.

Archivos: `src/components/admin/TutorAnalyticsTab.tsx` (nuevo), edit `AdminDashboard.tsx`.

### 2. Estabilidad + modo baja conexión (prioridad 2)
En `StudentTutor.tsx` y video interactivo:
- **Cola offline**: si `navigator.onLine === false` o fetch falla → guardar mensaje pendiente en `localStorage`, reintentar con backoff exponencial al recuperar red.
- **Persistencia de stream**: si la pestaña pierde foco durante streaming, el `AbortController` no se cancela; se mantiene escuchando vía `visibilitychange`.
- **Indicador visual** "Reconectando…" / "Sin conexión".
- **Timeouts adaptativos** y `fetch` con retry (3 intentos, backoff 1s/2s/4s).
- **Persistir borrador** del input en `localStorage` por si recarga.

### 3. Video interactivo: auto-continuar / rebobinar (prioridad 3)
En el modo video de `StudentTutor.tsx`:
- Cada pregunta tiene `timestamp` (cuándo se hizo la pregunta) y un `segmentStart` (cuándo empezó el tema, ~15-30s antes).
- Si responde **correcto** → `player.playVideo()` automático.
- Si responde **incorrecto** → `player.seekTo(segmentStart)` + reproducir + mostrar feedback.
- Edge function `tutor-video-questions` ya genera preguntas; agregar `segmentStart` al schema.

### 4. Anti-repetición + moderación extendida (prioridad 4)
En `tutor-chat/index.ts`:
- **Resumen de sesión**: cada N mensajes generar un resumen corto guardado en `tutor_usage.metadata` y enviarlo como contexto en lugar del historial completo.
- **Detección de similitud**: comparar últimas 3 respuestas del asistente; si Jaccard > 0.7 con la nueva, regenerar pidiendo variar enfoque.
- **Whitelist de temas**: matemáticas, química, física, pedagogía, técnicas de estudio, motivación académica. Bloquear fuera de scope con mensaje pedagógico.
- **Filtro de lenguaje**: regex para groserías + tono inadecuado.

### 5. Módulos configurables por curso
Migración:
- `cursos.modulos JSONB DEFAULT '{"concentracion":true,"psicometria":true,"mensajes":true,"biblioteca":true,"tutor":true,"orientacion_vocacional":true}'`

UI:
- En `CourseManager.tsx` / crear curso: switches por módulo.
- En `AppLayout.tsx` sidebar estudiante: leer módulos del curso del estudiante y ocultar items no habilitados.
- Hook `useCourseModules()` que cachea la config.

### 6. Mr. Victor para admins
Nueva ruta `/admin/asistente` con `AdminTutor.tsx`:
- Mismo chat base pero con `mode: "admin"` enviado a `tutor-chat`.
- Modo admin: sin rate limit, system prompt distinto con 3 modos seleccionables:
  - **Generar contenido** (ejercicios/quizzes/explicaciones con formato exportable).
  - **Analizar estudiantes** (recibe contexto de progreso del estudiante seleccionado vía dropdown).
  - **Redactar comunicación** (plantillas de mensajes para enviar por el módulo mensajería).
- Botón "Copiar al portapapeles" y "Enviar como mensaje" según modo.

### Detalles técnicos
- Migración única para `cursos.modulos` + cualquier columna nueva en `tutor_usage` (ej. `summary`, `mode`).
- Reutilizar `_shared/auth.ts` para validar JWT.
- Sin secrets nuevos (todo via `LOVABLE_API_KEY`).
- Verificar build + smoke test del flujo admin tras cada bloque.

### Entrega por turnos
Para no saturar un solo turno: este turno implemento **bloques 1, 2 y 5** (analytics + resiliencia + módulos curso). Siguiente turno: **3, 4 y 6** (video auto-flow + anti-repetición + tutor admin).
