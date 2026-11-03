-- =============================================================================
--  Pixel Springs · campo de algodón, bar y recreativos
-- =============================================================================
--
-- Para probarla antes de aplicarla (SQL Editor de Supabase):
--   begin;
--   (pegar el contenido de este fichero)
--   rollback;
--
-- Aplicarla ANTES de desplegar el servidor con los negocios nuevos. Sin ella,
-- lots_business_check rechaza el guardado de los locales y Persistence.save
-- falla a medias (se guardan el dinero, los inventarios y los muebles, pero no
-- el mundo ni next_id). Es segura con el servidor antiguo: solo amplía la lista.

-- La lista de negocios crece (vive en shared/src/economy.config.ts).
alter table public.lots drop constraint if exists lots_business_check;
alter table public.lots add constraint lots_business_check check (
  business in (
    'scrapyard', 'well', 'greenhouse', 'cotton_field', 'workshop', 'store',
    'diner', 'bar', 'arcade', 'barber', 'greengrocer'
  )
);
