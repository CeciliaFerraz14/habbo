-- =============================================================================
--  Pixel Springs · locales construidos en los solares del Ensanche
-- =============================================================================

-- Quién construyó el local (su propietario para siempre: no paga alquiler y,
-- cerrado, sigue siendo suyo) y el tick en que acaba la obra. null / 0 en los
-- locales de alquiler de siempre. Ver buildLot en shared/src/world.ts.
alter table public.lots add column if not exists built_by text;
alter table public.lots add column if not exists ready_at bigint not null default 0;
