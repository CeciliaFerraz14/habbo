-- =============================================================================
--  Pixel Springs · locales NPC liberados
-- =============================================================================
--
-- Las tiendas de NPC ya no existen: sus locales vuelven a estar en alquiler. El
-- servidor ya los libera al cargar el mundo (releaseNpcLots); esta migración
-- limpia lo que quede en la base de datos y quita la columna next_restock_at.
--
-- Aplicarla DESPUÉS de comprobar en el log que el servidor nuevo carga y guarda
-- sin errores. El servidor anterior todavía escribe next_restock_at: con esta
-- migración, sus guardados de locales fallarían.
--
-- Para probarla antes de aplicarla (SQL Editor de Supabase):
--   begin;
--   set local statement_timeout = '30s';
--   (pegar el contenido de este fichero)
--   select id, owner_id, business from public.lots order by id;
--   select id, scene_id from public.furniture where scene_id like 'lot%';
--   rollback;

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
