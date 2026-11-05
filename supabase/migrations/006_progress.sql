-- =============================================================================
--  Pixel Springs · niveles y rangos
-- =============================================================================

-- Progreso de cada jugador: experiencia y último día en que ganó la XP por
-- entrar a jugar ({ "xp": 120, "dailyDay": 3, "name": "Ceci" }). El rango se
-- calcula a partir de la XP (ver shared/src/levels.ts).
alter table public.profiles add column if not exists progress jsonb not null default '{}'::jsonb;
