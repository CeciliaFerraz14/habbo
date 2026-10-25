-- =============================================================================
--  Pixel Springs · esquema inicial
-- =============================================================================
-- Solo el SERVIDOR del juego lee y escribe estas tablas (con la clave
-- service_role, que se salta RLS). Activamos Row Level Security SIN políticas:
-- así, el navegador (clave anon) no puede leer ni modificar nada directamente.
-- =============================================================================

-- Perfil de cada jugador: un registro por usuario de Supabase Auth.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 3 and 16),
  look        jsonb not null,                    -- colores del avatar
  money       integer not null default 0 check (money >= 0),
  materials   jsonb not null default '{}'::jsonb, -- { "sheet_metal": 3, ... }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Muebles guardados en el inventario de cada jugador (sin colocar).
create table if not exists public.inventory_items (
  id        text primary key,
  owner_id  uuid not null references public.profiles (id) on delete cascade,
  def_id    text not null
);
create index if not exists inventory_items_owner_idx on public.inventory_items (owner_id);

-- Muebles colocados en caravanas y locales (también los productos a la venta,
-- que son muebles con precio). Los edificios de la calle no se guardan: se
-- generan con el mundo.
create table if not exists public.furniture (
  id        text primary key,
  scene_id  text not null,
  def_id    text not null,
  x         integer not null,
  y         integer not null,
  rotation  smallint not null check (rotation between 0 and 3),
  variant   text,
  price     integer check (price > 0)
);
create index if not exists furniture_scene_idx on public.furniture (scene_id);

-- Locales de la calle. owner_id es texto (no uuid) porque también hay
-- dueños NPC ("npc-rosa"). Los tiempos van en ticks de simulación.
create table if not exists public.lots (
  id                  text primary key,
  label               text not null,
  owner_id            text,
  owner_name          text,
  business            text check (business in ('scrapyard', 'workshop', 'store')),
  facade              text,
  storage             jsonb not null default '{}'::jsonb,
  jobs                jsonb not null default '[]'::jsonb,
  next_production_at  bigint not null default 0,
  next_restock_at     bigint not null default 0,
  next_rent_at        bigint not null default 0
);

-- Estado global de la simulación: una sola fila.
create table if not exists public.world (
  id        smallint primary key default 1 check (id = 1),
  tick      bigint not null,
  seed      bigint not null,
  next_id   bigint not null,
  saved_at  timestamptz not null default now()
);

alter table public.profiles        enable row level security;
alter table public.inventory_items enable row level security;
alter table public.furniture       enable row level security;
alter table public.lots            enable row level security;
alter table public.world           enable row level security;
