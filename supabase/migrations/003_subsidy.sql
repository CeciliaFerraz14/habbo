-- =============================================================================
--  Pixel Springs · subvención del pueblo
-- =============================================================================

-- Tick a partir del cual el jugador puede volver a recoger la subvención
-- (0 = puede recogerla ya). La cantidad y el periodo viven en
-- shared/src/economy.config.ts (ECONOMY.subsidy).
alter table public.profiles add column if not exists next_subsidy_at bigint not null default 0;
