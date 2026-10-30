-- =============================================================================
--  Pixel Springs · gasolinera de Hank
-- =============================================================================

-- Datos de cada jugador en la gasolinera: boletos de rasca y gana del día y
-- cuándo puede empezar otro turno (ver GasPlayerState en shared/src/gasStation.ts).
alter table public.profiles add column if not exists gas_station jsonb not null default '{}'::jsonb;

-- Datos del pueblo en la gasolinera: encargos de Hank abiertos y récord de la
-- máquina recreativa ({ "orders": [...], "pinballRecord": {...} | null }).
alter table public.world add column if not exists gas jsonb not null default '{}'::jsonb;
