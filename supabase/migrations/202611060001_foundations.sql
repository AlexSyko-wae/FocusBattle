-- Fase 1. Ejecutar una sola vez en SQL Editor de un proyecto Supabase nuevo.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Aventurero' check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);
create table public.categories (
  id smallint generated always as identity primary key,
  name text not null unique
);
create table public.enemies (
  id smallint primary key check (id between 1 and 3),
  name text not null unique,
  max_hp smallint not null check (max_hp > 0),
  attack smallint not null check (attack > 0)
);
create table public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id smallint not null references public.categories(id),
  primary key (user_id, category_id)
);
create table public.player_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  unlocked_enemy smallint not null default 1 references public.enemies(id),
  updated_at timestamptz not null default now()
);
insert into public.categories(name) values
 ('Fútbol'),('Videojuegos'),('Películas'),('Series'),('Historia'),('Geografía'),
 ('Ciencia'),('Matemáticas'),('Inglés'),('Programación'),('Cultura general');
insert into public.enemies values
 (1,'Slime de las Distracciones',45,8),
 (2,'Fantasma de la Pereza',60,12),
 (3,'Guardián de la Procrastinación',80,16);
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.enemies enable row level security;
alter table public.user_interests enable row level security;
alter table public.player_progress enable row level security;
revoke all on public.profiles, public.categories, public.enemies, public.user_interests, public.player_progress from anon, authenticated;
grant select on public.profiles, public.categories, public.enemies, public.user_interests, public.player_progress to authenticated;
create policy own_profile on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_progress on public.player_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy own_interests on public.user_interests for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.categories, public.enemies to anon;
create policy read_categories on public.categories for select to anon, authenticated using (true);
create policy read_enemies on public.enemies for select to anon, authenticated using (true);
-- Sin permisos de escritura del cliente sobre XP, victorias o desbloqueos.
create function public.initialize_player() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.player_progress(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function public.initialize_player() from public, anon, authenticated;
create trigger initialize_focusbattle_player after insert on auth.users
for each row execute function public.initialize_player();
-- Permite perfiles para cuentas creadas antes de ejecutar esta migración.
insert into public.profiles(id) select id from auth.users on conflict do nothing;
insert into public.player_progress(user_id) select id from public.profiles on conflict do nothing;
commit;
