-- Nuevas batallas v3. Las partidas v1/v2 conservan sus reglas.
begin;
alter table public.battles drop constraint battles_rules_version_check;
alter table public.battles add constraint battles_rules_version_check check(rules_version in (1,2,3));
alter table public.battle_operations drop constraint battle_operations_action_check;
alter table public.battle_operations add constraint battle_operations_action_check check(action in ('attack','defend','heal','special'));
alter table public.battles add column energy smallint not null default 0 check(energy between 0 and 3);
alter table public.battles add column special_uses integer not null default 0 check(special_uses>=0);
alter table public.battles add column intent_kind text not null default 'attack' check(intent_kind in ('attack','heavy','recover','evade','vulnerable'));
alter table public.battles add column last_enemy_healing smallint not null default 0 check(last_enemy_healing>=0);

create function public.get_campaign_medals() returns jsonb
language sql stable security invoker set search_path='' as $$
with metrics as (select
 (select count(*) from public.battles where user_id=auth.uid() and status='won') wins,
 (select coalesce(sum(correct_count),0) from public.category_progress where user_id=auth.uid()) correct,
 (select count(*) from public.battles where user_id=auth.uid() and status='won' and correct_answers+wrong_answers>=3 and 1.0*correct_answers/(correct_answers+wrong_answers)>=0.8) scholar,
 (select count(*) from public.battles where user_id=auth.uid() and status='won' and special_uses>0 and rules_version=3) tactical,
 (select count(*) from public.battles where user_id=auth.uid() and status='won' and player_hp>=80 and rules_version=3) survivor,
 (select count(*) from public.enemy_rewards where user_id=auth.uid()) campaign)
select jsonb_build_array(
 jsonb_build_object('id','first','name','Primer triunfo','description','Gana una batalla.','progress',least(wins,1),'target',1,'unlocked',wins>=1),
 jsonb_build_object('id','learner','name','Mente despierta','description','Acumula 10 respuestas correctas.','progress',least(correct,10),'target',10,'unlocked',correct>=10),
 jsonb_build_object('id','scholar','name','Sabiduría en combate','description','Gana con al menos 3 respuestas y 80 % de precisión.','progress',least(scholar,1),'target',1,'unlocked',scholar>=1),
 jsonb_build_object('id','tactical','name','Poder del conocimiento','description','Gana usando el ataque especial en una partida nueva.','progress',least(tactical,1),'target',1,'unlocked',tactical>=1),
 jsonb_build_object('id','survivor','name','Guardia impecable','description','Gana una partida nueva conservando al menos 80 HP.','progress',least(survivor,1),'target',1,'unlocked',survivor>=1),
 jsonb_build_object('id','campaign','name','Voluntad inquebrantable','description','Derrota a los tres rivales de la campaña.','progress',least(campaign,3),'target',3,'unlocked',campaign>=3)
) from metrics;
$$;
revoke all on function public.get_campaign_medals() from public,anon,authenticated;
grant execute on function public.get_campaign_medals() to authenticated;

create or replace function public.prepare_enemy_intent(b public.battles) returns public.battles
language plpgsql security definer set search_path='' as $$
begin
  b.intent_heavy:=false; b.intent_damage:=b.enemy_attack; b.intent_label:='Ataque';
  b.intent_kind:='attack';
  if b.rules_version=3 then
    if b.enemy_id=1 then
      if b.turn%4=0 then b.intent_damage:=4;b.intent_label:='Se regenera +12 HP';b.intent_kind:='recover';
      elsif b.turn%4=3 then b.intent_damage:=14;b.intent_heavy:=true;b.intent_label:='Salto aplastante';b.intent_kind:='heavy';
      else b.intent_damage:=8;b.intent_label:='Golpe viscoso';end if;
    elsif b.enemy_id=2 then
      if b.turn%3=0 then b.intent_damage:=8;b.intent_label:='Evasión: ataque normal a la mitad';b.intent_kind:='evade';
      elsif b.turn%2=0 then b.intent_damage:=20;b.intent_heavy:=true;b.intent_label:='Emboscada espectral';b.intent_kind:='heavy';
      else b.intent_damage:=10;b.intent_label:='Toque espectral';end if;
    else
      if b.turn%3=0 then b.intent_damage:=30;b.intent_heavy:=true;b.intent_label:='Golpe devastador: armadura -5';b.intent_kind:='heavy';
      elsif b.turn%3=2 then b.intent_damage:=6;b.intent_label:='Carga: vulnerable +5 de daño';b.intent_kind:='vulnerable';
      else b.intent_damage:=12;b.intent_label:='Tajo: armadura -5';end if;
    end if;
    return b;
  end if;
  if b.rules_version=1 then return b; end if;
  if b.enemy_id=1 then
    if b.turn%3=0 then b.intent_damage:=14;b.intent_heavy:=true;b.intent_label:='Salto aplastante';
    else b.intent_damage:=8;b.intent_label:='Golpe viscoso'; end if;
  elsif b.enemy_id=2 then
    if b.turn%2=0 then b.intent_damage:=20;b.intent_heavy:=true;b.intent_label:='Emboscada espectral';
    else b.intent_damage:=10;b.intent_label:='Toque espectral'; end if;
  else
    if b.turn%3=0 then b.intent_damage:=30;b.intent_heavy:=true;b.intent_label:='Golpe devastador';
    elsif b.turn%3=2 then b.intent_damage:=6;b.intent_label:='Carga su arma';
    else b.intent_damage:=12;b.intent_label:='Tajo del guardián';end if;
  end if;
  return b;
end;
$$;
create or replace function public.apply_counterattack(b public.battles) returns public.battles
language plpgsql security definer set search_path='' as $$
declare damage integer;
begin
  b.last_enemy_healing:=0;
  if b.rules_version=3 and b.intent_kind='recover' then
    b.last_enemy_healing:=least(12,b.enemy_max_hp-b.enemy_hp);
    b.enemy_hp:=b.enemy_hp+b.last_enemy_healing;
    b.last_event:=b.last_event||' Slime recupera '||b.last_enemy_healing||' HP.';
  end if;
  damage:=(case when b.rules_version>=2 then b.intent_damage else b.enemy_attack end)+case when b.enemy_penalty then 10 else 0 end;
  if b.defending then damage:=ceil(damage/2.0)::integer; end if;
  b.last_enemy_damage:=least(b.player_hp,damage);
  b.player_hp:=greatest(0,b.player_hp-damage);
  b.defending:=false;b.enemy_penalty:=false;
  b.last_event:=b.last_event||' Contraataque: '||damage||' de daño.';
  if b.player_hp=0 then
    b.status:='lost';
    update public.player_progress set losses=losses+1,updated_at=now() where user_id=b.user_id;
    b.last_event:=b.last_event||' Has sido derrotado.';
  end if;
  return b;
end;
$$;

create or replace function public.start_battle(p_enemy_id integer,p_operation_id text) returns public.battles
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
  insert into public.battles(user_id,enemy_id,enemy_hp,enemy_max_hp,enemy_attack,question_mode,category_ids,start_operation,rules_version)
    values(v_user,v_enemy.id,v_enemy.max_hp,v_enemy.max_hp,v_enemy.attack,v_mode,v_categories,p_operation_id,3) returning * into v_battle;
  v_battle:=public.prepare_enemy_intent(v_battle);
  update public.battles set intent_kind=v_battle.intent_kind,intent_damage=v_battle.intent_damage,intent_label=v_battle.intent_label,intent_heavy=v_battle.intent_heavy where id=v_battle.id returning * into v_battle;
  return v_battle;
end;
$$;

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
  if p_operation_id is null or length(p_operation_id) not between 8 and 160 or p_action is null or p_action not in ('attack','defend','heal','special') then
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
  b.last_enemy_healing:=0;b.last_player_damage:=0;b.last_enemy_damage:=0;b.last_healing:=0;
  if p_action='special' then
    if b.rules_version<>3 or b.energy<2 then raise exception 'Necesitas 2 de energía para el especial' using errcode='22023';end if;
    v_damage:=least(45,b.enemy_hp);b.enemy_hp:=b.enemy_hp-v_damage;b.last_player_damage:=v_damage;
    b.energy:=b.energy-2;b.special_uses:=b.special_uses+1;b.last_event:='Ráfaga de enfoque: '||v_damage||' de daño. Ignora evasión y armadura.';
  elsif p_action='attack' then
    v_damage := 15 + case when b.attack_bonus then 15 else 0 end;
    if b.rules_version=3 then
      if b.intent_kind='evade' then v_damage:=ceil(v_damage/2.0)::integer;end if;
      if b.enemy_id=3 then v_damage:=greatest(1,v_damage+(case when b.intent_kind='vulnerable' then 5 else -5 end));end if;
    end if;
    b.last_player_damage:=least(b.enemy_hp,v_damage);
    b.enemy_hp := greatest(0,b.enemy_hp-v_damage);
    b.attack_bonus := false;
    b.last_event := 'Atacaste: ' || v_damage || ' de daño.';
  elsif p_action='defend' then
    b.defending := true;
    if b.rules_version>=2 and b.intent_heavy then b.attack_bonus:=true; end if;
    b.last_event := 'Te defendiste.';
  else
    if b.heals_left=0 or b.player_hp=100 then raise exception 'No puedes curarte ahora' using errcode='22023'; end if;
    v_damage := least(20,100-b.player_hp);
    b.last_healing:=v_damage;
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
  if b.pending_question_id is null then b:=public.prepare_enemy_intent(b); end if;
  b.updated_at:=clock_timestamp();
  update public.battles set player_hp=b.player_hp,enemy_hp=b.enemy_hp,turn=b.turn,heals_left=b.heals_left,
    attack_bonus=b.attack_bonus,enemy_penalty=b.enemy_penalty,defending=b.defending,status=b.status,
    energy=b.energy,special_uses=b.special_uses,intent_kind=b.intent_kind,last_enemy_healing=b.last_enemy_healing,intent_damage=b.intent_damage,intent_label=b.intent_label,intent_heavy=b.intent_heavy,last_player_damage=b.last_player_damage,last_enemy_damage=b.last_enemy_damage,last_healing=b.last_healing,
    pending_question_id=b.pending_question_id,last_question_id=b.last_question_id,xp_awarded=b.xp_awarded,last_event=b.last_event,updated_at=b.updated_at where id=b.id returning * into b;
  insert into public.battle_operations(battle_id,operation_id,action,expected_turn) values(b.id,p_operation_id,p_action,p_expected_turn);
  return b;
end;
$$;
create or replace function public.answer_battle_question(p_battle_id uuid,p_question_id uuid,p_option integer,p_operation_id text)
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
    if b.rules_version=3 then b.energy:=least(3,b.energy+1);end if;
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
  b.last_player_damage:=0;b.last_healing:=0;
  b:=public.prepare_enemy_intent(b);
  update public.battles set energy=b.energy,intent_kind=b.intent_kind,enemy_hp=b.enemy_hp,last_enemy_healing=b.last_enemy_healing,intent_damage=b.intent_damage,intent_label=b.intent_label,intent_heavy=b.intent_heavy,last_enemy_damage=b.last_enemy_damage,last_player_damage=b.last_player_damage,last_healing=b.last_healing,pending_question_id=null,player_hp=b.player_hp,status=b.status,attack_bonus=b.attack_bonus,
    enemy_penalty=b.enemy_penalty,defending=b.defending,correct_answers=b.correct_answers,wrong_answers=b.wrong_answers,
    last_event=b.last_event,updated_at=clock_timestamp() where id=b.id returning * into b;
  return b;
end;
$$;
create or replace function public.get_battle_records() returns jsonb
language sql stable security invoker set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('enemy_id',enemy_id,'best_hp',best_hp,'best_accuracy',best_accuracy,
  'fewest_errors',fewest_errors,'fewest_actions',fewest_actions,'wins',wins) order by enemy_id),'[]'::jsonb)
from (select enemy_id,max(player_hp) best_hp,
  max(case when correct_answers+wrong_answers>0 then round(100.0*correct_answers/(correct_answers+wrong_answers),1) else null end) best_accuracy,
  min(wrong_answers) fewest_errors,min(turn-1) fewest_actions,count(*) wins
  from public.battles where user_id=auth.uid() and status='won' and rules_version=3 group by enemy_id) r;
$$;
commit;
