-- =============================================================================
--  Pixel Springs · locales NPC liberados
-- =============================================================================

-- Las tiendas de Elmer y Rosa ya no existen: sus locales vuelven a estar en
-- alquiler. El servidor ya los libera al cargar el mundo; esta migración limpia
-- también la base de datos.
--
-- Cómo probarla en el SQL Editor de Supabase: ejecutar
--   begin;
--   (el contenido de este fichero)
--   select id, owner_id, business from public.lots order by id;
--   select id, scene_id from public.furniture where scene_id like 'lot%';
--   rollback;
-- y, si todo está bien, ejecutarla de verdad sin el begin/rollback.

-- Los muebles de los locales NPC (productos a la venta incluidos) desaparecen;
-- el edificio de cada local se conserva.
delete from public.furniture
where scene_id in (select id from public.lots where owner_id like 'npc-%')
  and id not like '%-building';

-- Los locales NPC vuelven a estar en alquiler.
update public.lots set
  owner_id = null,
  owner_name = null,
  business = null,
  facade = null,
  storage = '{}'::jsonb,
  jobs = '[]'::jsonb,
  service_price = 0,
  next_production_at = 0,
  next_rent_at = 0
where owner_id like 'npc-%';

-- Ya no hay reposición de productos NPC.
alter table public.lots drop column if exists next_restock_at;
