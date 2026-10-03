# Rachas, XP y Liga Semanal

## Qué verá el estudiante
- Insignia de racha con fuego junto a su avatar. Después de las 18:00, si aún no ha estudiado ese día, aparece un aviso ámbar/rojo: "¡Estudia hoy para no perder tu racha de X días!".
- Barra de meta diaria (60 XP) con porcentaje; al llegar al 100 % salen confetti y el mensaje "¡Meta de hoy cumplida!" (una sola vez por día).
- Widget "Liga Semanal": los 10 mejores del curso activo, con podio oro, plata y bronce, más una tarjeta con la posición propia. Se reinicia cada domingo a medianoche (hora de Ecuador).

## Puntos de esfuerzo (XP)
- Tarjeta repasada: +5 (se suman al terminar la ronda)
- Pomodoro de 25 min completado: +30
- Teoría de una sesión estudiada: +20
- Quiz completado: +40 (+20 si saca más del 80 %)
- Simulador de examen: +100

## Reglas de racha
- Actividad hoy y la última fue ayer: la racha sube 1.
- La última actividad fue hoy: la racha se mantiene y solo se suman puntos.
- Pasaron 2 días o más sin actividad: la racha vuelve a 1.
- También se guarda el récord personal.

## Administrador
- Puede ver las rachas y los puntos de todos los estudiantes.

## Detalles técnicos
- Migración:
  - Tabla `estudiante_rachas` (user_id único, racha_actual, racha_maxima, ultimo_dia_estudio, puntos_semana_actual, semana_inicio, puntos_totales, puntos_hoy, dia_puntos).
  - Tabla `xp_eventos` (user_id, curso_id, tipo, puntos, created_at) como registro de auditoría.
  - GRANTs y RLS en las dos tablas: el estudiante lee lo suyo y el admin lee todo. Nadie escribe directamente desde el navegador.
- Función RPC `registrar_xp(_tipo text, _curso uuid)` con SECURITY DEFINER:
  - Fija los puntos en el servidor según el tipo, así el cliente no puede inflarlos. Para las tarjetas recibe una cantidad, con un tope de 200 por llamada.
  - Calcula la racha, el reinicio semanal (lunes, zona America/Guayaquil) y el total diario.
  - Devuelve la fila actualizada.
- RPC `liga_semanal(_curso uuid)` con SECURITY DEFINER: devuelve el top 10 más la posición del usuario, mostrando solo nombre y avatar.
- `src/lib/xp.ts`, con el ayudante `registrarPuntosEsfuerzo(tipo, extra?)`.
- Se conecta en EstudioMazo (fin de ronda en cada modo), Productividad (Pomodoro llega a cero), QuizComponent (al enviar), SessionDetail (teoría revisada, una vez por sesión y por día) y SectionExam (al terminar).
- Componentes nuevos `RachaBadge`, `MetaDiaria` y `LigaSemanal` en StudentDashboard. Usan los tokens de color existentes (menta, azul, naranja y rosa).
