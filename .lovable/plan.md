## Objetivo

Que cada curso (ej. Química original, nuevo INEVAL, futuros) sea **independiente y paralelo**: con sus propias sesiones, quizzes y exámenes editables, y que el estudiante con varios cursos elija cuál usar al ingresar — aplicándose los módulos y contenidos de ese curso.

---

## 1. Modelo de datos (paralelismo real)

Hoy `sesiones`, `quiz_preguntas`, `exam_configuracion`, `progreso_estudiante` y `sesion_estudiante` son globales — cualquier cambio en una sesión afecta a todos los cursos. Para hacer cursos paralelos:

- Añadir `curso_id` (nullable) a: `sesiones`, `exam_configuracion`, `progreso_estudiante`, `sesion_estudiante`, `examen_historial`, `exam_bloqueos`.
  - Las filas existentes quedan como "curso original (Química)" — se asigna `curso_id` del curso Química a todo lo existente en una migración de datos.
- `quiz_preguntas` queda ligado a `sesion_id` (ya queda aislado porque las sesiones se duplican por curso).
- Índices y RLS actualizados para filtrar por curso activo del usuario.

## 2. "Reusar curso" al crear

Diálogo **Nuevo Curso** con dos pestañas:

- **En blanco**: como hoy (título + descripción).
- **Reutilizar curso existente**: selector de curso origen → al crear, duplica:
  - Todas las sesiones (con su contenido `contenido`, `pestanas_sesion`, quizzes `quiz_preguntas`).
  - La configuración de exámenes (`exam_configuracion`) del curso origen.
  - Los módulos activados.
  - Mapea los nuevos `sesion_id` y los vincula al nuevo `curso_id`.

Reemplaza la copia "vacía" actual de `copyCurso` por una copia profunda real.

## 3. Crear sesión y vincular (arreglo)

El botón **Crear Sesión** ya inserta en `sesiones` + `curso_sesiones`. Se ajusta para:

- Guardar también `curso_id` en la nueva fila de `sesiones` (paralelismo).
- Refrescar la lista expandida y `allSesiones` al cerrar.
- Mantener el botón **Vincular** existente para reutilizar sesiones del mismo curso.

## 4. Quiz y Exámenes editables por curso

- `/admin/quiz`: añade un selector de curso al inicio; las preguntas se filtran/crean para sesiones del curso seleccionado.
- `/admin/exams`: añade selector de curso; `exam_configuracion` se crea/edita filtrando por `curso_id`.
- Las sesiones mostradas en cada pantalla provienen del curso activo.

## 5. Selector de curso al ingresar (estudiante)

- Nuevo hook `useActiveCourse()` con contexto + `localStorage` (`medd_active_curso_id`).
- Al iniciar sesión, si el estudiante tiene >1 curso → ruta `/student/elegir-curso` (tarjetas con título/descripción).
- Si tiene 1 curso → se selecciona automático.
- Si tiene 0 → fallback al comportamiento actual.
- Botón "Cambiar curso" en el perfil para volver al selector.
- `useCourseModules` y todas las queries de sesiones/exámenes/progreso pasan a usar el curso activo.

## 6. Pautas para cursos futuros

Cada curso nuevo (a partir de hoy) sigue una de dos rutas:
- **Reutilizar** un curso plantilla (ej. Química) → copia profunda lista para editar.
- **En blanco** → admin crea sesiones, quizzes y configura exámenes desde cero, todo bajo `curso_id`.
Los cursos no comparten datos entre sí, salvo el catálogo de estudiantes.

---

## Detalles técnicos

**Migración SQL** (1 sola, con grants/policies):

```text
ALTER TABLE sesiones, exam_configuracion, progreso_estudiante,
            sesion_estudiante, examen_historial, exam_bloqueos
  ADD COLUMN curso_id uuid REFERENCES cursos(id) ON DELETE CASCADE;

-- Backfill: asigna el curso "Química" (o el primero) a las filas existentes
UPDATE ... SET curso_id = (SELECT id FROM cursos ORDER BY created_at LIMIT 1)
WHERE curso_id IS NULL;

-- Índices por (curso_id, ...)
-- RLS sin cambios estructurales (sigue por user_id), filtros en cliente
```

**Cliente afectado**:
- `CourseManager.tsx`: dialogo Nuevo Curso con tabs, `copyCurso` profundo.
- `useActiveCourse.tsx` (nuevo) + `useCourseModules` lee el curso activo.
- `App.tsx`: ruta `/student/elegir-curso` + guard.
- `StudentSessions`, `SessionDetail`, `SectionExam`, `AdminContent`, `AdminQuiz`, `AdminExams`: filtran por `curso_id` activo / seleccionado.

**Alcance**: cambio amplio. Una vez aprobado, se ejecuta en orden: migración → contexto curso activo → selector estudiante → ajustes admin (quiz/exams/content) → copia profunda + dialogo reuso.

¿Apruebas este plan o ajustamos alcance (por ejemplo, dejar quiz/exams globales por ahora)?