-- =============================================================================
--  Pixel Springs · prendas y tienda de ropa
-- =============================================================================
--
-- Qué cambia:
-- - inventory_items guarda también prendas: def_id pasa a admitir null y hay
--   dos columnas nuevas, garment (tipo de prenda) y color. Cada fila es un
--   mueble (def_id) o una prenda (garment y color), nunca las dos cosas ni
--   ninguna.
-- - furniture.garment: la prenda que se expone a la venta en un burro de ropa.
-- - lots_business_check admite la tienda de ropa ('clothing').
--
-- Para probarla antes de aplicarla (SQL Editor de Supabase):
--   begin;
--   (pegar el contenido de este fichero)
--   rollback;
--
-- Aplicarla ANTES de desplegar el servidor con las prendas. Sin ella, guardar
-- un inventario con prendas falla (no existen las columnas garment y color).
-- Es segura con el servidor antiguo: solo añade columnas nulas y amplía checks
-- (las filas que ya existen tienen def_id, así que cumplen el check nuevo).
--
-- Una vez guardadas prendas o burros de ropa, volver al servidor anterior NO
-- es seguro: su CATALOG no tiene clothes_rack y las filas de prendas tienen
-- def_id null.

alter table public.inventory_items alter column def_id drop not null;
alter table public.inventory_items add column if not exists garment text;
alter table public.inventory_items add column if not exists color text;
alter table public.inventory_items drop constraint if exists inventory_items_kind_check;
alter table public.inventory_items add constraint inventory_items_kind_check check (
  (def_id is null) <> (garment is null) and (garment is null) = (color is null)
);

alter table public.furniture add column if not exists garment text;

-- La lista de negocios crece (vive en shared/src/economy.config.ts).
alter table public.lots drop constraint if exists lots_business_check;
alter table public.lots add constraint lots_business_check check (
  business in (
    'scrapyard', 'well', 'greenhouse', 'cotton_field', 'workshop', 'store', 'clothing',
    'diner', 'bar', 'arcade', 'barber', 'greengrocer'
  )
);
