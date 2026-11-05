-- =============================================================================
--  Pixel Springs · la calle crece con el pueblo
-- =============================================================================

-- Parcela de cada jugador en la Calle Mayor: 0 = la caravana del principio;
-- desde la 1, al final de la calle, con su caravana y un local nuevo (ver
-- addHome en shared/src/world.ts). null = aún no tiene (se le da al cargar).
alter table public.profiles add column if not exists home_slot integer;
