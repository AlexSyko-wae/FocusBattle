begin;
update public.questions set active=false;
insert into public.questions(id,category_id,difficulty,prompt,options,correct_index,explanation)
 select 'v3-test-'||n,(select id from public.categories where name='Matemáticas'),((n-1)/3+1)::smallint,
 'Desafío v3 '||n,array['Correcta','Error 1','Error 2','Error 3'],0,'Explicación de prueba.' from generate_series(1,9) n;
insert into auth.users(id,email) values
 ('55e07c17-1b87-4d20-9596-37dbcc800001','v3-a@example.invalid'),
 ('55e07c17-1b87-4d20-9596-37dbcc800002','v3-b@example.invalid'),
 ('55e07c17-1b87-4d20-9596-37dbcc800003','v3-legacy@example.invalid');
insert into public.battles(user_id,enemy_id,enemy_hp,enemy_max_hp,enemy_attack,question_mode,category_ids,start_operation,rules_version,intent_damage)
 values('55e07c17-1b87-4d20-9596-37dbcc800003',1,75,75,8,'adaptive',array[(select min(id) from public.categories)],'v3-legacy-v2-start',2,8);
set local role authenticated;
select set_config('request.jwt.claim.sub','55e07c17-1b87-4d20-9596-37dbcc800001',true);
select set_config('request.jwt.claims','{"sub":"55e07c17-1b87-4d20-9596-37dbcc800001","role":"authenticated"}',true);
do $$declare b public.battles;prior public.battles;medals jsonb;begin
 perform public.save_learning_preferences(array[(select id::integer from public.categories where name='Matemáticas')],'adaptive');
 b:=public.start_battle(1,'v3-slime-first');
 if b.rules_version<>3 or b.energy<>0 then raise exception 'Inicio v3 inválido';end if;
 begin perform public.battle_action(b.id,'special','v3-invalid-special',b.turn);raise exception 'Especial sin energía';exception when invalid_parameter_value then null;end;
 b:=public.battle_action(b.id,'defend','v3-slime-def1',b.turn);
 b:=public.battle_action(b.id,'defend','v3-slime-def2',b.turn);
 prior:=b;b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-slime-answer1');
 if b.energy<>1 then raise exception 'No cargó energía';end if;
 b:=public.answer_battle_question(b.id,prior.pending_question_id,0,'v3-slime-answer1');
 if b.energy<>1 then raise exception 'Energía duplicada';end if;
 b:=public.battle_action(b.id,'defend','v3-slime-def3',b.turn);
 if b.intent_kind<>'recover' then raise exception 'Slime no anuncia regeneración';end if;
 b:=public.battle_action(b.id,'defend','v3-slime-def4',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-slime-answer2');
 if b.energy<>2 or b.player_hp<>83 then raise exception 'Energía o contraataque incorrectos';end if;
 b:=public.battle_action(b.id,'special','v3-slime-special',b.turn);
 prior:=public.battle_action(b.id,'special','v3-slime-special',5);
 if b.energy<>0 or b.enemy_hp<>30 or b.special_uses<>1 or prior.special_uses<>1 or not b.attack_bonus then raise exception 'Especial/consumo/idempotencia incorrectos';end if;
 b:=public.battle_action(b.id,'attack','v3-slime-finish',b.turn);
 if b.status<>'won' or b.player_hp<>75 then raise exception 'Victoria especial incorrecta';end if;

 b:=public.start_battle(1,'v3-slime-regen');
 b:=public.battle_action(b.id,'attack','v3-regen-action1',b.turn);
 b:=public.battle_action(b.id,'defend','v3-regen-action2',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-regen-answer1');
 b:=public.battle_action(b.id,'defend','v3-regen-action3',b.turn);
 b:=public.battle_action(b.id,'defend','v3-regen-action4',b.turn);
 if b.enemy_hp<>60 then raise exception 'Regeneró antes de respuesta';end if;
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-regen-answer2');
 if b.enemy_hp<>72 or b.last_enemy_healing<>12 or b.player_hp<>79 then raise exception 'Regeneración incorrecta';end if;
 b:=public.battle_action(b.id,'special','v3-regen-special',b.turn);
 b:=public.battle_action(b.id,'attack','v3-regen-finish',b.turn);

 b:=public.start_battle(2,'v3-ghost-start');
 b:=public.battle_action(b.id,'attack','v3-ghost-action1',b.turn);
 b:=public.battle_action(b.id,'defend','v3-ghost-action2',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-ghost-answer1');
 if b.intent_kind<>'evade' then raise exception 'Evasión no anunciada';end if;
 b:=public.battle_action(b.id,'attack','v3-ghost-action3',b.turn);
 if b.enemy_hp<>75 or b.last_player_damage<>15 then raise exception 'Evasión no reduce ataque normal';end if;
 b:=public.battle_action(b.id,'defend','v3-ghost-action4',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-ghost-answer2');
 b:=public.battle_action(b.id,'defend','v3-ghost-action5',b.turn);
 if b.intent_kind<>'evade' then raise exception 'Patrón de evasión incorrecto';end if;
 b:=public.battle_action(b.id,'special','v3-ghost-special',b.turn);
 if b.enemy_hp<>30 or b.last_player_damage<>45 or b.energy<>0 then raise exception 'Especial no ignora evasión';end if;
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-ghost-answer3');
 b:=public.battle_action(b.id,'attack','v3-ghost-finish',b.turn);
 if b.status<>'won' or b.player_hp<>49 then raise exception 'Fantasma no ganable';end if;

 b:=public.start_battle(3,'v3-guardian-start');
 b:=public.battle_action(b.id,'attack','v3-guardian-action1',b.turn);
 if b.enemy_hp<>125 or b.last_player_damage<>10 or b.intent_kind<>'vulnerable' then raise exception 'Armadura/vulnerabilidad incorrecta';end if;
 b:=public.battle_action(b.id,'attack','v3-guardian-action2',b.turn);
 if b.enemy_hp<>105 or b.last_player_damage<>20 then raise exception 'Ventana vulnerable incorrecta';end if;
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-guardian-answer1');
 b:=public.battle_action(b.id,'defend','v3-guardian-action3',b.turn);
 b:=public.battle_action(b.id,'attack','v3-guardian-action4',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-guardian-answer2');
 b:=public.battle_action(b.id,'attack','v3-guardian-action5',b.turn);
 b:=public.battle_action(b.id,'special','v3-guardian-special',b.turn);
 if b.enemy_hp<>0 or b.last_player_damage<>45 then raise exception 'Especial no ignora armadura';end if;
 if b.status<>'won' or b.player_hp<>49 or b.pending_question_id is not null then raise exception 'Especial letal no termina inmediatamente';end if;
 b:=public.start_battle(1,'v3-survivor-start');
 b:=public.battle_action(b.id,'attack','v3-survivor-action1',b.turn);
 b:=public.battle_action(b.id,'attack','v3-survivor-action2',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-survivor-answer1');
 b:=public.battle_action(b.id,'heal','v3-survivor-action3',b.turn);
 b:=public.battle_action(b.id,'attack','v3-survivor-action4',b.turn);
 b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-survivor-answer2');
 b:=public.battle_action(b.id,'special','v3-survivor-finish',b.turn);
 if b.status<>'won' or b.player_hp<>82 then raise exception 'Objetivo de supervivencia no funciona';end if;
 if (select total_xp from public.player_progress where user_id=auth.uid())<>150 then raise exception 'Premios incorrectos';end if;
 medals:=public.get_campaign_medals();
 if jsonb_array_length(medals)<>6 or (select count(*) from jsonb_array_elements(medals) where (value->>'unlocked')::boolean)<>6 then raise exception 'Medallas incorrectas';end if;
 begin update public.battles set energy=3 where id=b.id;raise exception 'Cliente puede cambiar energía';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','55e07c17-1b87-4d20-9596-37dbcc800002',true);
select set_config('request.jwt.claims','{"sub":"55e07c17-1b87-4d20-9596-37dbcc800002","role":"authenticated"}',true);
do $$declare b public.battles;i integer;begin
 if exists(select 1 from jsonb_array_elements(public.get_campaign_medals()) where (value->>'unlocked')::boolean) then raise exception 'B ve medallas de A';end if;
 perform public.save_learning_preferences(array[(select id::integer from public.categories where name='Matemáticas')],'adaptive');
 b:=public.start_battle(1,'v3-energy-cap-start');
 for i in 1..8 loop
  b:=public.battle_action(b.id,'defend','v3-cap-action-'||i,b.turn);
  if b.pending_question_id is not null then b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v3-cap-answer-'||i);end if;
 end loop;
 if b.energy<>3 or b.correct_answers<>4 then raise exception 'Energía excede límite';end if;
end $$;
select set_config('request.jwt.claim.sub','55e07c17-1b87-4d20-9596-37dbcc800003',true);
select set_config('request.jwt.claims','{"sub":"55e07c17-1b87-4d20-9596-37dbcc800003","role":"authenticated"}',true);
do $$declare b public.battles;begin
 select * into b from public.battles where status='active';
 b:=public.battle_action(b.id,'attack','v3-legacy-action',b.turn);
 if b.rules_version<>2 or b.enemy_hp<>60 or b.player_hp<>92 or b.energy<>0 then raise exception 'Se modificaron las reglas de una partida anterior';end if;
 begin perform public.battle_action(b.id,'special','v3-legacy-special',b.turn);raise exception 'Especial disponible en partida anterior';exception when invalid_parameter_value then null;end;
end $$;
set local role anon;
do $$begin begin perform public.get_campaign_medals();raise exception 'Medallas accesibles sin sesión';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select 'V3: energía, especial, mecánicas, medallas y seguridad aprobados; datos revertidos' as resultado;
