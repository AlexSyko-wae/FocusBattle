-- Prueba determinista del nuevo equilibrio. Revierte todo al terminar.
begin;
update public.questions set active=false;
insert into public.questions(id,category_id,difficulty,prompt,options,correct_index,explanation)
 values('gameplay-v2-test',(select id from public.categories where name='Matemáticas'),1,'Pregunta de prueba del combate',array['Correcta','Error 1','Error 2','Error 3'],0,'Explicación de prueba.');
insert into auth.users(id,email) values
 ('34579df2-dbe2-4847-97a6-e4a9a3880001','gameplay-a@example.invalid'),
 ('34579df2-dbe2-4847-97a6-e4a9a3880002','gameplay-b@example.invalid');
-- Batalla representativa de una partida iniciada antes de esta revisión.
insert into public.battles(user_id,enemy_id,enemy_hp,enemy_max_hp,enemy_attack,question_mode,category_ids,start_operation,rules_version,intent_damage)
 values('34579df2-dbe2-4847-97a6-e4a9a3880002',1,45,45,8,'adaptive',array[(select min(id) from public.categories)],'legacy-battle-v1',1,8);
set local role authenticated;
select set_config('request.jwt.claim.sub','34579df2-dbe2-4847-97a6-e4a9a3880001',true);
select set_config('request.jwt.claims','{"sub":"34579df2-dbe2-4847-97a6-e4a9a3880001","role":"authenticated"}',true);
do $$
declare b public.battles; previous public.battles; records jsonb; r jsonb; i integer;
begin
 perform public.save_learning_preferences(array[(select id::integer from public.categories where name='Matemáticas')],'adaptive');
 b:=public.start_battle(1,'gameplay-slime-one');
 if b.rules_version<>2 or b.enemy_hp<>75 or b.intent_damage<>8 or b.intent_heavy then raise exception 'Inicio v2 incorrecto';end if;
 b:=public.battle_action(b.id,'attack','slime-one-atk1',b.turn);
 b:=public.battle_action(b.id,'attack','slime-one-atk2',b.turn);
 if b.player_hp<>92 or b.enemy_hp<>45 or b.pending_question_id is null or b.intent_damage<>8 then raise exception 'No conservó intención al pausar';end if;
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'slime-one-answer');
 if b.player_hp<>84 or b.intent_damage<>14 or not b.intent_heavy then raise exception 'Intención siguiente incorrecta';end if;
 b:=public.battle_action(b.id,'attack','slime-one-atk3',b.turn);
 if b.enemy_hp<>15 or b.player_hp<>70 or b.last_player_damage<>30 or b.last_enemy_damage<>14 then raise exception 'Daño/buff incorrectos';end if;
 b:=public.battle_action(b.id,'attack','slime-one-atk4',b.turn);
 previous:=public.battle_action(b.id,'attack','slime-one-atk4',4);
 if b.status<>'won' or b.player_hp<>70 or b.xp_awarded<>50 or b.last_enemy_damage<>0 or previous.turn<>b.turn then raise exception 'Victoria/idempotencia incorrectas';end if;

 b:=public.start_battle(1,'gameplay-slime-repeat');
 b:=public.battle_action(b.id,'attack','slime-repeat-atk1',b.turn);
 b:=public.battle_action(b.id,'attack','slime-repeat-atk2',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,1,'slime-repeat-answer');
 if b.player_hp<>74 then raise exception 'Penalización incorrecta';end if;
 b:=public.battle_action(b.id,'defend','slime-repeat-guard',b.turn);
 if b.player_hp<>67 or not b.attack_bonus or b.last_enemy_damage<>7 then raise exception 'Defensa no prepara réplica';end if;
 b:=public.battle_action(b.id,'heal','slime-repeat-heal',b.turn);
 if b.player_hp<>79 or b.last_healing<>20 or b.heals_left<>1 or not b.attack_bonus then raise exception 'Curación o persistencia de beneficio incorrectas';end if;
 b:=public.battle_action(b.id,'attack','slime-repeat-atk3',b.turn);
 b:=public.battle_action(b.id,'attack','slime-repeat-atk4',b.turn);
 if b.status<>'won' or b.player_hp<>71 or b.xp_awarded<>0 then raise exception 'Repetición/recompensa incorrectas';end if;
 records:=public.get_battle_records();r:=records->0;
 if (r->>'best_hp')::integer<>71 or (r->>'fewest_actions')::integer<>4 or (r->>'best_accuracy')::numeric<>100 or (r->>'wins')::integer<>2 then raise exception 'Marcas personales incorrectas';end if;

 b:=public.start_battle(2,'gameplay-ghost-start');
 if b.enemy_hp<>105 or b.intent_damage<>10 then raise exception 'Fantasma mal configurado';end if;
 b:=public.battle_action(b.id,'attack','ghost-action-1',b.turn);
 if b.intent_damage<>20 or not b.intent_heavy then raise exception 'Fantasma no alterna intenciones';end if;
 b:=public.battle_action(b.id,'defend','ghost-action-2',b.turn);
 if b.player_hp<>90 or not b.defending or b.intent_damage<>20 then raise exception 'Pregunta perdió defensa/intención';end if;
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'ghost-answer-one');
 if b.player_hp<>80 or b.intent_damage<>10 or not b.attack_bonus then raise exception 'Daño de emboscada defendida incorrecto';end if;
 b:=public.battle_action(b.id,'attack','ghost-action-3',b.turn);
 b:=public.battle_action(b.id,'attack','ghost-action-4',b.turn);
 b:=public.battle_action(b.id,'defend','ghost-action-5',b.turn);
 b:=public.battle_action(b.id,'defend','ghost-action-6',b.turn);
 b:=public.battle_action(b.id,'heal','ghost-action-7',b.turn);
 b:=public.battle_action(b.id,'attack','ghost-action-8',b.turn);
 b:=public.battle_action(b.id,'attack','ghost-action-9',b.turn);
 if b.status<>'won' or b.player_hp<>25 then raise exception 'Fantasma no es ganable con el patrón previsto';end if;

 b:=public.start_battle(3,'gameplay-guardian-start');
 if b.enemy_hp<>135 or b.intent_damage<>12 then raise exception 'Guardián mal configurado';end if;
 b:=public.battle_action(b.id,'attack','guardian-action-1',b.turn);
 if b.intent_damage<>6 or b.intent_heavy then raise exception 'Guardián no anuncia carga';end if;
 b:=public.battle_action(b.id,'attack','guardian-action-2',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,1,'guardian-answer-one');
 if b.player_hp<>72 or b.intent_damage<>30 or not b.intent_heavy then raise exception 'Golpe cargado no anunciado';end if;
 b:=public.battle_action(b.id,'defend','guardian-action-3',b.turn);
 b:=public.battle_action(b.id,'attack','guardian-action-4',b.turn);
 b:=public.battle_action(b.id,'attack','guardian-action-5',b.turn);
 b:=public.battle_action(b.id,'defend','guardian-action-6',b.turn);
 b:=public.battle_action(b.id,'heal','guardian-action-7',b.turn);
 b:=public.battle_action(b.id,'heal','guardian-action-8',b.turn);
 for i in 9..11 loop b:=public.battle_action(b.id,'attack','guardian-action-'||i,b.turn);end loop;
 if b.status<>'won' or b.player_hp<>4 or b.xp_awarded<>50 then raise exception 'Estrategia de defensa/curación no funciona';end if;
 b:=public.start_battle(3,'gameplay-guardian-rush');
 b:=public.battle_action(b.id,'attack','rush-action-1',b.turn);
 b:=public.battle_action(b.id,'attack','rush-action-2',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,1,'rush-answer-one');
 for i in 3..6 loop b:=public.battle_action(b.id,'attack','rush-action-'||i,b.turn);end loop;
 if b.status<>'lost' or b.player_hp<>0 then raise exception 'Atacar sin atender al rival no tiene consecuencias';end if;
 if (select total_xp from public.player_progress where user_id=auth.uid())<>150 then raise exception 'XP repetida o alterada';end if;
 if jsonb_array_length(public.get_battle_records())<>3 then raise exception 'Récords incluyen derrotas o rivales ajenos';end if;
end $$;
select set_config('request.jwt.claim.sub','34579df2-dbe2-4847-97a6-e4a9a3880002',true);
select set_config('request.jwt.claims','{"sub":"34579df2-dbe2-4847-97a6-e4a9a3880002","role":"authenticated"}',true);
do $$ declare b public.battles;begin
 select * into b from public.battles where status='active';
 b:=public.battle_action(b.id,'attack','legacy-action-one',1);
 if b.player_hp<>92 or b.enemy_hp<>30 or b.rules_version<>1 then raise exception 'Cambió partida antigua';end if;
 if public.get_battle_records()<>'[]'::jsonb then raise exception 'B ve récords de A o mezcla reglas';end if;
end $$;
set local role anon;
do $$begin
 begin perform public.get_battle_records();raise exception 'Récords accesibles sin sesión';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Gameplay v2: patrones, estrategia, recuperación, premios y marcas aprobados; datos revertidos' as resultado;

-- Campaña con banco suficiente para no agotar las preguntas durante la pelea.
begin;
update public.questions set active=false;
insert into public.questions(id,category_id,difficulty,prompt,options,correct_index,explanation)
 select 'v2-campaign-'||n,(select id from public.categories where name='Matemáticas'),((n-1)/3+1)::smallint,
 'Desafío de campaña '||n,array['Correcta','Error 1','Error 2','Error 3'],0,'Explicación de prueba.' from generate_series(1,9) n;
insert into auth.users(id,email) values('34579df2-dbe2-4847-97a6-e4a9a3880003','gameplay-campaign@example.invalid');
update public.player_progress set unlocked_enemy=3 where user_id='34579df2-dbe2-4847-97a6-e4a9a3880003';
set local role authenticated;
select set_config('request.jwt.claim.sub','34579df2-dbe2-4847-97a6-e4a9a3880003',true);
select set_config('request.jwt.claims','{"sub":"34579df2-dbe2-4847-97a6-e4a9a3880003","role":"authenticated"}',true);
do $$declare b public.battles;i integer;enemy integer;action text;begin
 perform public.save_learning_preferences(array[(select id::integer from public.categories where name='Matemáticas')],'adaptive');
 for enemy in 1..3 loop
  b:=public.start_battle(enemy,'campaign-start-'||enemy);i:=0;
  while b.status='active' loop
   i:=i+1;if i>40 then raise exception 'No termina la campaña';end if;
   if b.pending_question_id is not null then b:=public.answer_battle_question(b.id,b.pending_question_id,0,'campaign-answer-'||i);
   else
    if b.enemy_hp<=15+(case when b.attack_bonus then 15 else 0 end) then action:='attack';
    elsif b.intent_heavy then action:='defend';
    elsif b.player_hp<=50 and b.heals_left>0 then action:='heal';
    else action:='attack';end if;
    b:=public.battle_action(b.id,action,'campaign-action-'||i,b.turn);
   end if;
  end loop;
  if b.status<>'won' or b.correct_answers<1 then raise exception 'Campaña no ganable con estrategia y respuestas correctas';end if;
 end loop;
 if (select total_xp from public.player_progress where user_id=auth.uid())<>150 then raise exception 'XP de campaña incorrecta';end if;
end $$;
reset role;
rollback;
select 'Campaña v2 completa con preguntas activas aprobada; datos revertidos' as resultado;
