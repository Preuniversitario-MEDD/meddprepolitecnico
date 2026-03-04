

## Plan: Mejoras Integrales de ESPOLMEDD

Este plan abarca todas las funcionalidades solicitadas, divididas en bloques implementables secuencialmente.

---

### Bloque 1: Cambio de contraseña para estudiantes (con validación fuerte)

**Archivos:** `Login.tsx`, `StudentProfile.tsx`, `useAuth.tsx`

- Agregar validación de contraseña con regex: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial.
- Mostrar indicadores visuales en tiempo real (checklist) al escribir la nueva contraseña.
- Aplicar la misma validación en `Login.tsx` (cambio de primera vez) y en `StudentProfile.tsx` (nuevo botón "Cambiar contraseña").
- Actualizar `useAuth.changePassword` para validar antes de enviar.

---

### Bloque 2: Generación de ejercicios con IA (Lovable AI)

**Archivos:** Crear `supabase/functions/generate-exercise/index.ts`, actualizar `SessionDetail.tsx`

- Crear edge function `generate-exercise` que use Lovable AI Gateway (`google/gemini-3-flash-preview`) con un prompt de sistema para generar ejercicios de química personalizados por tema de la sesión.
- El botón "Generar ejercicio con IA" en `SessionDetail.tsx` llamará a esta función, pasando el título de la sesión como contexto.
- Mostrar el ejercicio generado en una card con opción de ver solución.
- Actualizar `supabase/config.toml` para incluir la nueva función.

---

### Bloque 3: Admin — Edición de ejercicios, quiz y secciones

**Archivos:** `AdminContent.tsx`, crear `src/pages/admin/AdminQuiz.tsx`, `App.tsx`

- **Ejercicios editables:** Ya existe CRUD en `AdminContent.tsx`. Agregar campo "solución" al formulario (usar el campo `url` como solución o agregar columna `solucion`).
- **Admin Quiz:** Nueva página `AdminQuiz.tsx` con tabla CRUD para `quiz_preguntas`. Permitir agregar/editar pregunta, opciones, respuesta correcta, imagen (subir PNG/JPG al bucket `avatars` o crear bucket `quiz-images`).
- **Editar nombre de sección:** Agregar botón de edición inline en `AdminContent.tsx` para cambiar `sesiones.titulo` y `sesiones.descripcion`.
- **Mover contenido:** Agregar drag-and-drop o flechas arriba/abajo para reordenar `contenido.orden` dentro de una sesión.
- Agregar ruta `/admin/quiz` en `App.tsx` y enlace en el sidebar.

**Migración DB:** Crear bucket `quiz-images` para imágenes de preguntas. Agregar columna `solucion` a `contenido` si se requiere separar de `url`.

---

### Bloque 4: Lógica de completitud de sesión y progreso granular

**Archivos:** `SessionDetail.tsx`, `QuizComponent.tsx`, `StudentDashboard.tsx`

**Migración DB:** Agregar columnas a `progreso_estudiante`:
- `ejercicios_completados` (integer, default 0)
- `ejercicios_correctos` (integer, default 0)  
- `intentos_quiz` (integer, default 0)
- `errores_quiz` (integer, default 0)
- `tiempo_invertido` (integer, seconds, default 0)
- `preguntas_correctas_total` (integer, default 0)

**Reglas de completitud:**
- Una sesión se completa al 100% cuando: se revisaron todos los ejercicios (mínimo 20 correctos) Y se respondieron correctamente 150 de 200 preguntas del quiz (en rondas de 10).
- Barra de progreso dentro de cada sesión dividida en: Teoría revisada, Ejercicios completados, Quiz aprobado.
- Barra global = promedio del progreso de las 14 sesiones.
- Mensaje de felicitación al llegar al 80% de la sesión con instrucciones para culminar.

**Quiz actualizado:** 200 preguntas, rondas de 10, sin repetir, tracking de correctas totales. Sesión completa = 150 correctas.

---

### Bloque 5: Examen por cada 3 secciones

**Archivos:** Crear `src/pages/student/SectionExam.tsx`, `StudentDashboard.tsx`, `App.tsx`

**Migración DB:** Crear tabla `examenes`:
- `id` UUID PK
- `user_id` UUID NOT NULL
- `tipo` text (ej: 'exam_1_3', 'exam_4_6', etc.)
- `puntaje` numeric default 0
- `aprobado` boolean default false
- `fecha` timestamptz default now()
- `respuestas` jsonb default '[]'

**Lógica:**
- Al completar secciones 1-3, se desbloquea examen de 30 preguntas (aleatorias del banco de esas 3 secciones, sin repetir).
- Temporizador de 50 minutos. Secuencial (no se puede retroceder).
- Calificación sobre 100. Aprobar = 80/100.
- Bloques de exámenes: 1-3, 4-6, 7-9, 10-12, 13-14.

---

### Bloque 6: Estadísticas dentro de cada sesión

**Archivos:** `SessionDetail.tsx`

- Mostrar en la parte superior de la sesión: intentos de quiz, errores, tiempo invertido en la sesión, tiempo general del curso.
- Cards con iconos y colores neón.

---

### Bloque 7: Biblioteca Virtual

**Archivos:** Crear `src/pages/student/Library.tsx`, crear `src/pages/admin/AdminLibrary.tsx`, `App.tsx`

**Migración DB:** Crear tabla `biblioteca`:
- `id` UUID PK
- `titulo` text NOT NULL
- `descripcion` text
- `url` text NOT NULL
- `categoria` text
- `created_at` timestamptz default now()

Con RLS: admin puede todo, todos pueden leer.

- Admin puede agregar links con descripción y categoría.
- Estudiantes ven la lista filtrable por categoría.
- Agregar ruta `/student/library` y `/admin/library`.

---

### Bloque 8: Responsive — Visualización de respuestas

**Archivos:** `SessionDetail.tsx`, `QuizComponent.tsx`

- Verificar que las cards de ejercicios con solución se muestren correctamente en 375px, tablet y desktop.
- Usar `break-words`, `max-w-full`, overflow responsive en las soluciones.
- Quiz options: `text-sm` en móvil, padding adecuado.

---

### Resumen de migraciones DB necesarias

```sql
-- 1. Columnas de progreso detallado
ALTER TABLE progreso_estudiante 
  ADD COLUMN ejercicios_completados integer DEFAULT 0,
  ADD COLUMN ejercicios_correctos integer DEFAULT 0,
  ADD COLUMN intentos_quiz integer DEFAULT 0,
  ADD COLUMN errores_quiz integer DEFAULT 0,
  ADD COLUMN tiempo_invertido integer DEFAULT 0,
  ADD COLUMN preguntas_correctas_total integer DEFAULT 0;

-- 2. Tabla examenes
CREATE TABLE examenes (...);

-- 3. Tabla biblioteca  
CREATE TABLE biblioteca (...);

-- 4. Bucket quiz-images
INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-images', 'quiz-images', true);

-- 5. Columna solucion en contenido
ALTER TABLE contenido ADD COLUMN solucion text DEFAULT '';
```

### Archivos nuevos a crear
- `supabase/functions/generate-exercise/index.ts`
- `src/pages/admin/AdminQuiz.tsx`
- `src/pages/admin/AdminLibrary.tsx`
- `src/pages/student/Library.tsx`
- `src/pages/student/SectionExam.tsx`

### Archivos a modificar
- `Login.tsx` — validación de contraseña fuerte
- `StudentProfile.tsx` — botón cambiar contraseña
- `SessionDetail.tsx` — stats, responsive, IA, progreso por sección
- `QuizComponent.tsx` — tracking de correctas totales, intentos, errores, tiempo
- `StudentDashboard.tsx` — barra global adaptativa, desbloqueo de exámenes, mensaje 80%
- `AdminContent.tsx` — editar secciones, reordenar contenido, campo solución
- `App.tsx` — nuevas rutas
- `AppLayout.tsx` — enlaces a biblioteca y exámenes en navegación
- `supabase/config.toml` — nueva función generate-exercise

