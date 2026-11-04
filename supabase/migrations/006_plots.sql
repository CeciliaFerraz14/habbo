-- =============================================================================
--  Pixel Springs · solares de los jugadores
-- =============================================================================
--
-- Qué cambia:
-- - lots guarda también los solares que construyen los jugadores: landlord_id y
--   landlord_name (el casero), terms (fianza y alquiler que fija: {"deposit":
--   100, "rent": 40}), next_upkeep_at (tick del próximo mantenimiento) y
--   suspended (el casero no pudo pagar el mantenimiento). Un local del
--   ayuntamiento los deja a null, 0 y false.
-- - Los solares usan los ids lot7...lot12, que ya caben en lots.id. Sus muebles
--   entran en furniture como los de cualquier local.
--
-- Para probarla antes de aplicarla (SQL Editor de Supabase):
--   begin;
--   (pegar el contenido de este fichero)
--   rollback;
--
-- Aplicarla ANTES de desplegar el servidor con los solares. Sin ella, guardar
-- un local falla (no existen las columnas). Es segura con el servidor antiguo:
-- solo añade columnas nulas o con valor por defecto.
--
-- Una vez guardados solares, volver al servidor anterior NO es seguro: no
-- conoce las columnas del casero y cargaría lot7...lot12 como locales del
-- ayuntamiento, con una escena y unos muebles que no existen en su mundo.

alter table public.lots add column if not exists landlord_id text;
alter table public.lots add column if not exists landlord_name text;
alter table public.lots add column if not exists terms jsonb;
alter table public.lots add column if not exists next_upkeep_at bigint not null default 0;
alter table public.lots add column if not exists suspended boolean not null default false;
