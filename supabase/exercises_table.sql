-- Batería global de ejercicios por coach.
-- Cada ejercicio pertenece al coach (coach_username) y es visible en todos sus equipos.
-- Los ejercicios se crean automáticamente al guardar una sesión que los incluye,
-- o manualmente desde el panel de batería dentro del editor de sesión.

CREATE TABLE IF NOT EXISTS exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_username text NOT NULL,
  name          text NOT NULL,
  block_type    text NOT NULL DEFAULT 'OTRO',  -- FUERZA, HIIT, EMOM, AMRAP, MOVEMENT PREP, OTRO …
  video_url     text,
  image_base64  text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Acceso rápido por coach + nombre (para deduplicar al auto-guardar)
CREATE INDEX IF NOT EXISTS exercises_coach_name ON exercises (coach_username, lower(name));
-- Acceso por coach + tipo de bloque
CREATE INDEX IF NOT EXISTS exercises_coach_block ON exercises (coach_username, block_type);

-- RLS: cada coach sólo ve y modifica sus propios ejercicios.
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_own_exercises" ON exercises
  FOR ALL
  USING  (coach_username = current_setting('app.current_user', true))
  WITH CHECK (coach_username = current_setting('app.current_user', true));

-- API access (igual que el resto de tablas del proyecto)
GRANT SELECT, INSERT, UPDATE, DELETE ON exercises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON exercises TO authenticated;
