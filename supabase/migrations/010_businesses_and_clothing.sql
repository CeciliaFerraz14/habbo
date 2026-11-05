-- =============================================================================
--  Pixel Springs · negocios nuevos y prendas
-- =============================================================================
--
-- Qué cambia (solo amplía, no toca ninguna fila):
-- - lots_business_check admite el campo de algodón, la tienda de ropa, el bar y
--   los recreativos.
-- - inventory_items guarda también prendas: def_id pasa a admitir null y hay
--   dos columnas nuevas, garment (tipo de prenda) y color. Cada fila es un
--   mueble (def_id) o una prenda (garment y color), nunca las dos cosas ni
--   ninguna.
-- - furniture.garment: la prenda que se expone a la venta en un burro de ropa.
--
-- Aplicarla ANTES de desplegar el servidor nuevo. Sin ella, todos los guardados
-- de inventario o de muebles de ese servidor fallan (escribe garment y color),
-- así que se niega a arrancar (Persistence.load).
--
-- Es segura con el servidor anterior: lee con select * (ignora las columnas
-- nuevas) y sus filas de inventario llevan def_id, así que cumplen el check.
-- Una vez guardados prendas o negocios nuevos, volver a ese servidor ya NO es
-- seguro: no arranca con un negocio que no conoce, y las filas de prendas tienen
-- def_id null.
--
-- Para aplicarla (SQL Editor de Supabase). Sin lock_timeout, alter table puede
-- bloquear los guardados mientras espera su bloqueo:
--   begin;
--   set local lock_timeout = '5s';
--   set local statement_timeout = '30s';
--   (pegar el contenido de este fichero)
--   commit;
--
-- Para probarla antes es lo mismo, terminando con rollback en vez de commit.

alter table public.lots drop constraint if exists lots_business_check;
alter table public.lots add constraint lots_business_check check (
  business in (
    'scrapyard', 'well', 'greenhouse', 'cotton_field', 'workshop', 'store', 'clothing',
    'diner', 'bar', 'arcade', 'barber', 'greengrocer'
  )
);

alter table public.inventory_items alter column def_id drop not null;
alter table public.inventory_items add column if not exists garment text;
alter table public.inventory_items add column if not exists color text;
alter table public.inventory_items drop constraint if exists inventory_items_kind_check;
alter table public.inventory_items add constraint inventory_items_kind_check check (
  (def_id is null) <> (garment is null) and (garment is null) = (color is null)
);

alter table public.furniture add column if not exists garment text;
