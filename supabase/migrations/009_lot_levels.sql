-- =============================================================================
--  Pixel Springs · niveles de los locales
-- =============================================================================

-- Nivel del local (1 a 3) y, si se está mejorando, el tick en que acaban las
-- obras (0 = sin obras). Ver upgradeLot en shared/src/economy.ts.
alter table public.lots add column if not exists level int not null default 1;
alter table public.lots add column if not exists upgrade_ready_at bigint not null default 0;
