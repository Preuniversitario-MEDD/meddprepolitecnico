## Auditoría rápida del proyecto (sin cambios)

Voy a revisar el programa en modo lectura y entregarte un único reporte. No se modificará código, así el consumo de créditos es mínimo (1–2 mensajes).

### Áreas a revisar

1. **Seguridad backend**
   - Ejecutar el escáner de seguridad (RLS, políticas, grants, buckets públicos, funciones edge sin auth).
   - Revisar el estado de @security-memory.

2. **Base de datos / rendimiento**
   - Consultas lentas (`pg_stat_statements`) e índices faltantes evidentes.
   - Salud general de la BD.

3. **Edge Functions**
   - Revisar `tutor-chat`, `tutor-video-questions`, `generate-exercise`, `generate-quiz-questions`, `admin-users`, `assign-difficulty`, `review-quiz-questions`, `perfil-360`:
     - Autenticación / autorización
     - Manejo de errores 429 / 402 del AI Gateway
     - Validación de inputs

4. **Frontend — estabilidad y UX**
   - `useAuth`, `AppLayout` (parpadeo al cambiar de pestaña — verificar que el fix sigue en pie).
   - `StudentTutor` (preguntas en video, bloqueo de avance).
   - Warnings de consola actuales (DialogContent sin Description, React Router v7 flags).
   - Responsive móvil de las pantallas principales.

5. **Calidad de código**
   - Componentes muy grandes que convenga dividir.
   - Hooks con dependencias inestables que puedan causar renders extra.
   - Imports no usados / dead code obvio.

6. **SEO básico**
   - Title, meta description, H1, alt en imágenes, robots.txt.

### Entregable

Un único informe en chat con:
- ✅ Lo que está bien
- ⚠️ Hallazgos por severidad (crítico / alto / medio / bajo)
- 💡 Recomendaciones priorizadas (qué arreglar primero, qué puede esperar)
- 📊 Estimación cualitativa del esfuerzo de cada arreglo

### Lo que NO se hará en esta etapa

- No se modifican archivos.
- No se ejecutan migraciones ni despliegues.
- No se instala nada.

Después del informe, tú decides qué correcciones quieres aplicar (y solo eso consumirá créditos adicionales).
