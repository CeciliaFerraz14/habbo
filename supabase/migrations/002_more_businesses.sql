-- =============================================================================
--  Pixel Springs · más negocios (pozo, invernadero, diner, peluquería, frutería)
-- =============================================================================

-- La lista de negocios crece: la comprobación de la columna business pasa a
-- aceptar los nuevos tipos (la lista vive en shared/src/economy.config.ts).
alter table public.lots drop constraint if exists lots_business_check;
alter table public.lots add constraint lots_business_check check (
  business in (
    'scrapyard', 'well', 'greenhouse', 'workshop', 'store', 'diner', 'barber', 'greengrocer'
  )
);

-- Negocios de servicios: precio que cobra el local por servir a un cliente.
alter table public.lots add column if not exists service_price integer not null default 0
  check (service_price >= 0);
