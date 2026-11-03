-- =============================================================================
--  Pixel Springs · campo de algodón, bar y recreativos
-- =============================================================================
--
-- Para probarla antes de aplicarla (SQL Editor de Supabase):
--   begin;
--   (pegar el contenido de este fichero)
--   rollback;
--
-- El servidor funciona sin aplicarla, salvo para guardar un local con alguno de
-- los negocios nuevos: sin ella la comprobación lots_business_check lo rechaza.

-- La lista de negocios crece (vive en shared/src/economy.config.ts).
alter table public.lots drop constraint if exists lots_business_check;
alter table public.lots add constraint lots_business_check check (
  business in (
    'scrapyard', 'well', 'greenhouse', 'cotton_field', 'workshop', 'store',
    'diner', 'bar', 'arcade', 'barber', 'greengrocer'
  )
);
