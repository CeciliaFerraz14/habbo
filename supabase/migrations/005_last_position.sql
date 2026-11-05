-- =============================================================================
--  Pixel Springs · volver a donde estabas
-- =============================================================================

-- Dónde estaba el jugador la última vez: escena, baldosa y hacia dónde
-- miraba ({ "sceneId": "gas", "x": 2, "y": 0, "direction": "SW" }). Al volver
-- a entrar aparece ahí en vez de en su caravana. null = nunca ha jugado.
alter table public.profiles add column if not exists last_position jsonb;
