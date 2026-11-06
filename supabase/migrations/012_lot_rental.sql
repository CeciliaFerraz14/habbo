-- =============================================================================
--  Pixel Springs · alquiler de los locales del Ensanche
-- =============================================================================
--
-- Qué cambia (solo amplía, no toca ninguna fila):
-- - lots.terms: las condiciones de alquiler del local (fianza y alquiler). Null
--   si el local no está en alquiler; si tiene valor, lo está.
-- - lots.next_upkeep_at: tick en que se cobrará el próximo mantenimiento al
--   dueño de un local en alquiler (0 = ninguno).
-- - lots.suspended: el dueño no pudo pagar el mantenimiento y el local no admite
--   inquilinos nuevos.
--
-- Aplicarla ANTES de desplegar el servidor nuevo. Sin ella, todos los guardados
-- de locales de ese servidor fallan (escribe las tres columnas), así que se
-- niega a arrancar (Persistence.load). Se aplica junto a la 010, antes que el
-- servidor, aunque su número sea posterior al de la 011: no depende de ella, y
-- la 011 se aplica la última, después de comprobar el guardado.
--
-- Es segura con el servidor anterior: lee con select * (ignora las columnas
-- nuevas) y sus guardados de locales no las nombran, así que las filas toman
-- los valores por defecto (sin alquiler). Una vez guardado un local en alquiler,
-- volver a ese servidor ya NO es seguro: ignora terms y el local dejaría de
-- estar en alquiler.
--
-- Para aplicarla (SQL Editor de Supabase). Sin lock_timeout, alter table puede
-- bloquear los guardados mientras espera su bloqueo:
--   begin;
--   set local lock_timeout = '5s';
--   set local statement_timeout = '30s';
--   (pegar el contenido de este fichero)
--   commit;
--
-- Para probarla antes es lo mismo, terminando con rollback en vez de commit.

alter table public.lots add column if not exists terms jsonb;
alter table public.lots add column if not exists next_upkeep_at bigint not null default 0;
alter table public.lots add column if not exists suspended boolean not null default false;
