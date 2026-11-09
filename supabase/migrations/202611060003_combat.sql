-- Fase 4: combate básico. Ejecutar después de las migraciones 001 y 002.
begin;
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  enemy_id smallint not null references public.enemies(id),
  player_hp smallint not null default 100 check (player_hp between 0 and 100),
  enemy_hp smallint not null check (enemy_hp >= 0),
  enemy_max_hp smallint not null check (enemy_max_hp > 0),
  enemy_attack smallint not null check (enemy_attack > 0),
  turn integer not null default 1 check (turn > 0),
  heals_left smallint not null default 2 check (heals_left between 0 and 2),
  attack_bonus boolean not null default false,
  enemy_penalty boolean not null default false,
  defending boolean not null default false,
  status text not null default 'active' check (status in ('active','won','lost')),
  xp_awarded smallint not null default 0 check (xp_awarded in (0,50)),
  question_mode text not null check (question_mode in ('easy','normal','hard','adaptive')),
  category_ids smallint[] not null check (cardinality(category_ids) > 0),
  start_operation text not null check (length(start_operation) between 8 and 160),
  last_event text not null default 'La batalla comienza.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (enemy_hp <= enemy_max_hp),
  check ((status = 'active' and player_hp > 0 and enemy_hp > 0)
      or (status = 'won' and player_hp > 0 and enemy_hp = 0)
      or (status = 'lost' and player_hp = 0 and enemy_hp > 0)),
  unique(user_id,start_operation)
);
create unique index one_active_battle_per_user on public.battles(user_id) where status = 'active';
create index battles_user_created on public.battles(user_id,created_at desc);
create table public.battle_operations (
  battle_id uuid not null references public.battles(id) on delete cascade,
  operation_id text not null check (length(operation_id) between 8 and 160),
  action text not null check (action in ('attack','defend','heal')),
  expected_turn integer not null check (expected_turn > 0),
  created_at timestamptz not null default now(),
  primary key (battle_id,operation_id)
);
create table public.enemy_rewards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  enemy_id smallint not null references public.enemies(id),
  battle_id uuid not null references public.battles(id),
  created_at timestamptz not null default now(),
  primary key(user_id,enemy_id)
);
alter table public.battles enable row level security;
alter table public.battle_operations enable row level security;
alter table public.enemy_rewards enable row level security;
revoke all on public.battles,public.battle_operations,public.enemy_rewards from anon,authenticated;
grant select on public.battles,public.enemy_rewards to authenticated;
create policy own_battles on public.battles for select to authenticated using ((select auth.uid()) = user_id);
create policy own_rewards on public.enemy_rewards for select to authenticated using ((select auth.uid()) = user_id);

create function public.start_battle(p_enemy_id integer,p_operation_id text) returns public.battles
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_progress public.player_progress;
  v_battle public.battles;
  v_enemy public.enemies;
  v_mode text;
  v_categories smallint[];
begin
  if v_user is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
  if p_operation_id is null or length(p_operation_id) not between 8 and 160 then raise exception 'Operación inválida' using errcode='22023'; end if;
  select * into v_progress from public.player_progress where user_id=v_user for update;
  if not found then raise exception 'No existe el progreso' using errcode='42501'; end if;
  select * into v_battle from public.battles where user_id=v_user and start_operation=p_operation_id;
  if found then
    if v_battle.enemy_id is distinct from p_enemy_id then raise exception 'Operación reutilizada para otro enemigo' using errcode='22023'; end if;
    return v_battle;
  end if;
  if exists(select 1 from public.battles where user_id=v_user and status='active') then raise exception 'Ya tienes una batalla activa. Continúa la partida.' using errcode='22023'; end if;
  select * into v_enemy from public.enemies where id=p_enemy_id;
  if not found or p_enemy_id > v_progress.unlocked_enemy then raise exception 'Enemigo no disponible' using errcode='22023'; end if;
  select question_mode into v_mode from public.profiles where id=v_user for update;
  select array_agg(category_id order by category_id) into v_categories from public.user_interests where user_id=v_user;
  if v_categories is null then raise exception 'Guarda al menos un interés antes de combatir.' using errcode='22023'; end if;
  insert into public.battles(user_id,enemy_id,enemy_hp,enemy_max_hp,enemy_attack,question_mode,category_ids,start_operation)
    values(v_user,v_enemy.id,v_enemy.max_hp,v_enemy.max_hp,v_enemy.attack,v_mode,v_categories,p_operation_id) returning * into v_battle;
  return v_battle;
end;
$$;

create function public.battle_action(p_battle_id uuid,p_action text,p_operation_id text,p_expected_turn integer)
returns public.battles language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  b public.battles;
  v_op public.battle_operations;
  v_damage integer;
  v_reward integer := 0;
  v_new_reward integer;
begin
  if v_user is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
  if p_operation_id is null or length(p_operation_id) not between 8 and 160 or p_action is null or p_action not in ('attack','defend','heal') then
    raise exception 'Acción inválida' using errcode='22023';
  end if;
  -- Mismo orden de bloqueo que start_battle: progreso, después batalla.
  perform 1 from public.player_progress where user_id=v_user for update;
  select * into b from public.battles where id=p_battle_id and user_id=v_user for update;
  if not found then raise exception 'Batalla no disponible' using errcode='42501'; end if;
  select * into v_op from public.battle_operations where battle_id=b.id and operation_id=p_operation_id;
  if found then
    if v_op.action is distinct from p_action or v_op.expected_turn is distinct from p_expected_turn then raise exception 'Operación reutilizada' using errcode='22023'; end if;
    return b;
  end if;
  if b.status <> 'active' then raise exception 'La batalla terminó' using errcode='22023'; end if;
  if p_expected_turn is distinct from b.turn then raise exception 'El turno cambió. Actualiza la partida.' using errcode='40001'; end if;
  if p_action='attack' then
    v_damage := 15 + case when b.attack_bonus then 15 else 0 end;
    b.enemy_hp := greatest(0,b.enemy_hp-v_damage);
    b.attack_bonus := false;
    b.last_event := 'Atacaste: ' || v_damage || ' de daño.';
  elsif p_action='defend' then
    b.defending := true;
    b.last_event := 'Te defendiste.';
  else
    if b.heals_left=0 or b.player_hp=100 then raise exception 'No puedes curarte ahora' using errcode='22023'; end if;
    v_damage := least(20,100-b.player_hp);
    b.player_hp := b.player_hp+v_damage;
    b.heals_left := b.heals_left-1;
    b.last_event := 'Recuperaste ' || v_damage || ' HP.';
  end if;
  if b.enemy_hp=0 then
    b.status := 'won';
    insert into public.enemy_rewards(user_id,enemy_id,battle_id) values(v_user,b.enemy_id,b.id) on conflict(user_id,enemy_id) do nothing;
    get diagnostics v_new_reward = row_count;
    if v_new_reward=1 then v_reward:=50; end if;
    b.xp_awarded:=v_reward;
    update public.player_progress set wins=wins+1,total_xp=total_xp+v_reward,
      unlocked_enemy=greatest(unlocked_enemy,least(3,b.enemy_id+1)),updated_at=now() where user_id=v_user;
    b.last_event := b.last_event || ' ¡Victoria! +' || v_reward || ' XP.';
  else
    v_damage := b.enemy_attack + case when b.enemy_penalty then 10 else 0 end;
    if b.defending then v_damage := ceil(v_damage / 2.0)::integer; end if;
    b.player_hp:=greatest(0,b.player_hp-v_damage);
    b.defending:=false;
    b.enemy_penalty:=false;
    b.last_event:=b.last_event || ' Contraataque: ' || v_damage || ' de daño.';
    if b.player_hp=0 then
      b.status:='lost';
      update public.player_progress set losses=losses+1,updated_at=now() where user_id=v_user;
      b.last_event:=b.last_event || ' Has sido derrotado.';
    end if;
  end if;
  b.turn:=b.turn+1;
  b.updated_at:=clock_timestamp();
  update public.battles set player_hp=b.player_hp,enemy_hp=b.enemy_hp,turn=b.turn,heals_left=b.heals_left,
    attack_bonus=b.attack_bonus,enemy_penalty=b.enemy_penalty,defending=b.defending,status=b.status,
    xp_awarded=b.xp_awarded,last_event=b.last_event,updated_at=b.updated_at where id=b.id returning * into b;
  insert into public.battle_operations(battle_id,operation_id,action,expected_turn) values(b.id,p_operation_id,p_action,p_expected_turn);
  return b;
end;
$$;
revoke all on function public.start_battle(integer,text) from public,anon,authenticated;
revoke all on function public.battle_action(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.start_battle(integer,text) to authenticated;
grant execute on function public.battle_action(uuid,text,text,integer) to authenticated;
commit;
