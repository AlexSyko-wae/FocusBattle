-- Fase 5. Banco protegido, preguntas y adaptación por categoría.
begin;
create table public.questions (
  id text primary key,
  category_id smallint not null references public.categories(id),
  difficulty smallint not null check (difficulty between 1 and 3),
  prompt text not null check(length(btrim(prompt))>0),
  options text[] not null check(cardinality(options)=4 and array_ndims(options)=1 and array_position(options,null) is null),
  correct_index smallint not null check(correct_index between 0 and 3),
  explanation text not null check(length(btrim(explanation))>0),
  active boolean not null default true,
  unique(category_id,prompt)
);
create index question_candidates on public.questions(category_id,difficulty) where active;
create table public.category_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id smallint not null references public.categories(id),
  difficulty smallint not null default 1 check(difficulty between 1 and 3),
  correct_count integer not null default 0 check(correct_count>=0),
  wrong_count integer not null default 0 check(wrong_count>=0),
  correct_streak integer not null default 0 check(correct_streak>=0),
  wrong_streak integer not null default 0 check(wrong_streak>=0),
  primary key(user_id,category_id)
);
create table public.question_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id),
  seen_count integer not null default 1 check(seen_count>0),
  primary key(user_id,question_id)
);
create table public.battle_questions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  question_id text not null references public.questions(id),
  category_id smallint not null references public.categories(id),
  difficulty smallint not null check(difficulty between 1 and 3),
  prompt text not null,
  options text[] not null,
  correct_index smallint not null,
  explanation text not null,
  selected_index smallint check(selected_index between 0 and 3),
  correct boolean,
  answer_operation text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  unique(battle_id,question_id),
  unique(battle_id,answer_operation)
);
alter table public.battles add column pending_question_id uuid references public.battle_questions(id);
alter table public.battles add column last_question_id uuid references public.battle_questions(id);
alter table public.battles add column correct_answers integer not null default 0 check(correct_answers>=0);
alter table public.battles add column wrong_answers integer not null default 0 check(wrong_answers>=0);
alter table public.questions enable row level security;
alter table public.battle_questions enable row level security;
alter table public.category_progress enable row level security;
alter table public.question_history enable row level security;
revoke all on public.questions,public.battle_questions,public.category_progress,public.question_history from anon,authenticated;
grant select on public.category_progress,public.question_history to authenticated;
create policy own_category_progress on public.category_progress for select to authenticated using((select auth.uid())=user_id);
create policy own_question_history on public.question_history for select to authenticated using((select auth.uid())=user_id);

-- Funciones internas: nunca se conceden al cliente.
create function public.pick_battle_question(b public.battles) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_category smallint; v_target integer; v_random double precision; q public.questions; v_id uuid;
begin
  select c.id into v_category from public.categories c
  where c.id=any(b.category_ids) and exists(select 1 from public.questions x where x.category_id=c.id and x.active
    and not exists(select 1 from public.battle_questions used where used.battle_id=b.id and used.question_id=x.id))
  order by (select count(*) from public.battle_questions asked where asked.battle_id=b.id and asked.category_id=c.id),random() limit 1;
  if not found then return null; end if;
  v_random:=random();
  if b.question_mode='adaptive' then
    select difficulty into v_target from public.category_progress where user_id=b.user_id and category_id=v_category;
    v_target:=coalesce(v_target,1);
  elsif b.question_mode='easy' then v_target:=case when v_random<0.8 then 1 else 2 end;
  elsif b.question_mode='normal' then v_target:=case when v_random<0.4 then 1 when v_random<0.9 then 2 else 3 end;
  else v_target:=case when v_random<0.2 then 2 else 3 end;
  end if;
  select x.* into q from public.questions x left join public.question_history h on h.question_id=x.id and h.user_id=b.user_id
    where x.active and x.category_id=v_category and not exists(select 1 from public.battle_questions used where used.battle_id=b.id and used.question_id=x.id)
    order by (x.difficulty=v_target) desc,abs(x.difficulty-v_target),coalesce(h.seen_count,0),random() limit 1;
  insert into public.battle_questions(battle_id,question_id,category_id,difficulty,prompt,options,correct_index,explanation)
    values(b.id,q.id,q.category_id,q.difficulty,q.prompt,q.options,q.correct_index,q.explanation) returning id into v_id;
  insert into public.question_history(user_id,question_id) values(b.user_id,q.id)
    on conflict(user_id,question_id) do update set seen_count=public.question_history.seen_count+1;
  return v_id;
end;
$$;

create function public.apply_counterattack(b public.battles) returns public.battles
language plpgsql security definer set search_path='' as $$
declare damage integer;
begin
  damage:=b.enemy_attack+case when b.enemy_penalty then 10 else 0 end;
  if b.defending then damage:=ceil(damage/2.0)::integer; end if;
  b.player_hp:=greatest(0,b.player_hp-damage);
  b.defending:=false; b.enemy_penalty:=false;
  b.last_event:=b.last_event || ' Contraataque: ' || damage || ' de daño.';
  if b.player_hp=0 then
    b.status:='lost';
    update public.player_progress set losses=losses+1,updated_at=now() where user_id=b.user_id;
    b.last_event:=b.last_event || ' Has sido derrotado.';
  end if;
  return b;
end;
$$;

create function public.get_battle_question(p_battle_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b public.battles; q public.battle_questions;
begin
  select * into b from public.battles where id=p_battle_id and user_id=auth.uid();
  if not found then raise exception 'Batalla no disponible' using errcode='42501'; end if;
  select * into q from public.battle_questions where id=coalesce(b.pending_question_id,b.last_question_id) and battle_id=b.id;
  if not found then return null; end if;
  return jsonb_build_object('id',q.id,'category',(select name from public.categories where id=q.category_id),
    'difficulty',q.difficulty,'prompt',q.prompt,'options',q.options,'answered',q.answered_at is not null,
    'selected_index',q.selected_index,'correct',q.correct,
    'correct_index',case when q.answered_at is not null then q.correct_index else null end,
    'explanation',case when q.answered_at is not null then q.explanation else null end);
end;
$$;

create function public.answer_battle_question(p_battle_id uuid,p_question_id uuid,p_option integer,p_operation_id text)
returns public.battles language plpgsql security definer set search_path='' as $$
declare b public.battles; q public.battle_questions; cp public.category_progress; v_correct boolean;
begin
  if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
  if p_option is null or p_option not between 0 and 3 or p_operation_id is null or length(p_operation_id) not between 8 and 160 then
    raise exception 'Respuesta inválida' using errcode='22023'; end if;
  perform 1 from public.player_progress where user_id=auth.uid() for update;
  select * into b from public.battles where id=p_battle_id and user_id=auth.uid() for update;
  if not found then raise exception 'Batalla no disponible' using errcode='42501'; end if;
  select * into q from public.battle_questions where id=p_question_id and battle_id=b.id for update;
  if not found then raise exception 'Pregunta no disponible' using errcode='22023'; end if;
  if q.answered_at is not null then
    if q.answer_operation=p_operation_id and q.selected_index=p_option then return b; end if;
    raise exception 'Esta pregunta ya fue respondida' using errcode='22023';
  end if;
  if b.status<>'active' or b.pending_question_id is distinct from q.id then raise exception 'No es la pregunta pendiente' using errcode='22023'; end if;
  if exists(select 1 from public.battle_questions where battle_id=b.id and answer_operation=p_operation_id) then raise exception 'Operación reutilizada' using errcode='22023'; end if;
  v_correct:=p_option=q.correct_index;
  update public.battle_questions set selected_index=p_option,correct=v_correct,answer_operation=p_operation_id,answered_at=now() where id=q.id;
  insert into public.category_progress(user_id,category_id) values(b.user_id,q.category_id) on conflict do nothing;
  select * into cp from public.category_progress where user_id=b.user_id and category_id=q.category_id for update;
  if v_correct then
    cp.correct_count:=cp.correct_count+1; cp.correct_streak:=cp.correct_streak+1; cp.wrong_streak:=0;
    if cp.correct_streak>=3 and cp.difficulty<3 then cp.difficulty:=cp.difficulty+1; cp.correct_streak:=0; end if;
    b.attack_bonus:=true; b.correct_answers:=b.correct_answers+1;
    b.last_event:='Respuesta correcta. Próximo ataque +15.';
  else
    cp.wrong_count:=cp.wrong_count+1; cp.wrong_streak:=cp.wrong_streak+1; cp.correct_streak:=0;
    if cp.wrong_streak>=2 and cp.difficulty>1 then cp.difficulty:=cp.difficulty-1; cp.wrong_streak:=0; end if;
    b.enemy_penalty:=true; b.wrong_answers:=b.wrong_answers+1;
    b.last_event:='Respuesta incorrecta. Contraataque +10.';
  end if;
  update public.category_progress set difficulty=cp.difficulty,correct_count=cp.correct_count,wrong_count=cp.wrong_count,
    correct_streak=cp.correct_streak,wrong_streak=cp.wrong_streak where user_id=b.user_id and category_id=q.category_id;
  b.pending_question_id:=null;
  b:=public.apply_counterattack(b);
  update public.battles set pending_question_id=null,player_hp=b.player_hp,status=b.status,attack_bonus=b.attack_bonus,
    enemy_penalty=b.enemy_penalty,defending=b.defending,correct_answers=b.correct_answers,wrong_answers=b.wrong_answers,
    last_event=b.last_event,updated_at=clock_timestamp() where id=b.id returning * into b;
  return b;
end;
$$;
revoke all on function public.pick_battle_question(public.battles) from public,anon,authenticated;
revoke all on function public.apply_counterattack(public.battles) from public,anon,authenticated;
revoke all on function public.get_battle_question(uuid) from public,anon,authenticated;
revoke all on function public.answer_battle_question(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.get_battle_question(uuid) to authenticated;
grant execute on function public.answer_battle_question(uuid,uuid,integer,text) to authenticated;
-- battle_action se reemplaza abajo para pausar antes del contraataque.

create or replace function public.battle_action(p_battle_id uuid,p_action text,p_operation_id text,p_expected_turn integer)
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
  if b.pending_question_id is not null then raise exception 'Responde la pregunta pendiente' using errcode='22023'; end if;
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
    if b.turn % 2 = 0 then
      b.pending_question_id:=public.pick_battle_question(b);
      if b.pending_question_id is not null then
        b.last_question_id:=b.pending_question_id;
        b.last_event:=b.last_event || ' Responde el desafío antes del contraataque.';
      end if;
    end if;
    if b.pending_question_id is null then b:=public.apply_counterattack(b); end if;
  end if;
  b.turn:=b.turn+1;
  b.updated_at:=clock_timestamp();
  update public.battles set player_hp=b.player_hp,enemy_hp=b.enemy_hp,turn=b.turn,heals_left=b.heals_left,
    attack_bonus=b.attack_bonus,enemy_penalty=b.enemy_penalty,defending=b.defending,status=b.status,
    pending_question_id=b.pending_question_id,last_question_id=b.last_question_id,xp_awarded=b.xp_awarded,last_event=b.last_event,updated_at=b.updated_at where id=b.id returning * into b;
  insert into public.battle_operations(battle_id,operation_id,action,expected_turn) values(b.id,p_operation_id,p_action,p_expected_turn);
  return b;
end;
$$;
commit;
