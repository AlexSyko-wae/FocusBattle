begin;
update public.questions set active=false;
insert into public.questions(id,category_id,difficulty,prompt,options,correct_index,explanation)
 select 'v4-test-'||n,(select id from public.categories where name='Matemáticas'),((n-1)/10+1)::smallint,
 'Desafío v4 '||n,array['Correcta','Error 1','Error 2','Error 3'],0,'Explicación de prueba.' from generate_series(1,30) n;
insert into auth.users(id,email) values ('55e07c17-1b87-4d20-9596-37dbcc800004','v4@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','55e07c17-1b87-4d20-9596-37dbcc800004',true);
do $$declare b public.battles;prior public.battles;v_enemy integer;v_action text;i integer;xp integer;begin
 perform public.save_learning_preferences(array[(select id::integer from public.categories where name='Matemáticas')],'adaptive');
 begin perform public.start_battle(6,'v4-locked-dragon');raise exception 'Rival bloqueado accesible';exception when invalid_parameter_value then null;end;
 for v_enemy in 1..6 loop
  b:=public.start_battle(v_enemy,'v4-start-enemy-'||v_enemy);
  if b.rules_version<>4 or b.player_hp<>100 then raise exception 'Inicio incorrecto';end if;
  i:=0;
  while b.status='active' loop
   i:=i+1;if i>80 then raise exception 'No termina el combate %',v_enemy;end if;
   if b.pending_question_id is not null then
    b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v4-answer-'||v_enemy||'-'||i);
   else
    v_action:=case when b.player_hp<=65 and b.heals_left>0 then 'heal' when b.intent_heavy then 'defend' when b.energy>=2 then 'special' else 'attack' end;
    prior:=b;b:=public.battle_action(b.id,v_action,'v4-action-'||v_enemy||'-'||i,b.turn);
    if b.status='won' then
     prior:=public.battle_action(b.id,v_action,'v4-action-'||v_enemy||'-'||i,prior.turn);
     if prior.xp_awarded<>b.xp_awarded then raise exception 'Reintento distinto';end if;
    end if;
   end if;
  end loop;
  if b.status<>'won' or b.xp_awarded<>50 then raise exception 'Rival % no ganable con estrategia, HP %',v_enemy,b.player_hp;end if;
 end loop;
 select total_xp into xp from public.player_progress where user_id=auth.uid();
 if xp<>300 then raise exception 'XP inicial incorrecta: %',xp;end if;
 b:=public.start_battle(1,'v4-repeat-slime');i:=0;
 while b.status='active' loop
  i:=i+1;
  if b.pending_question_id is not null then b:=public.answer_battle_question(b.id,b.pending_question_id,0,'v4-repeat-answer-'||i);
  else prior:=b;b:=public.battle_action(b.id,'attack','v4-repeat-action-'||i,b.turn);end if;
 end loop;
 if b.status<>'won' or b.xp_awarded<>10 then raise exception 'Revancha sin 10 XP';end if;
 b:=public.battle_action(b.id,'attack','v4-repeat-action-'||i,prior.turn);
 select total_xp into xp from public.player_progress where user_id=auth.uid();
 if xp<>310 then raise exception 'Reintento duplicó XP';end if;
end;$$;
reset role;
-- El contraataque cura dentro del máximo; un golpe letal termina antes de curar.
do $$declare b public.battles;r public.battles;e integer;begin
 for e in 1..6 loop
  select * into b from public.battles where user_id='55e07c17-1b87-4d20-9596-37dbcc800004' and enemy_id=e limit 1;
  b.status:='active';b.player_hp:=100;b.enemy_hp:=b.enemy_max_hp-5;b.turn:=4;
  b:=public.prepare_enemy_intent(b);
  if b.intent_kind<>'recover' then raise exception 'No anuncia curación';end if;
  r:=public.apply_counterattack(b);
  if r.enemy_hp<>b.enemy_max_hp or r.last_enemy_healing<>5 then raise exception 'Curación supera máximo';end if;
 end loop;
end;$$;
set local role authenticated;
do $$declare b public.battles;begin
 b:=public.start_battle(6,'v4-regen-dragon-start');
end;$$;
reset role;
update public.battles set enemy_hp=1,turn=4,intent_kind='recover',intent_damage=6,intent_label='Curación'
 where user_id='55e07c17-1b87-4d20-9596-37dbcc800004' and status='active';
set local role authenticated;
do $$declare b public.battles;begin
 select * into b from public.battles where user_id=auth.uid() and status='active';
 b:=public.battle_action(b.id,'attack','v4-lethal-dragon',4);
 if b.status<>'won' or b.enemy_hp<>0 or b.last_enemy_healing<>0 or b.xp_awarded<>10 then raise exception 'El rival revivió o premio incorrecto';end if;
end;$$;
-- No se puede invocar la función privada de curación.
do $$begin
 begin perform public.apply_counterattack(null::public.battles);raise exception 'Helper expuesto';exception when insufficient_privilege then null;end;
end;$$;
reset role;
-- Partidas antiguas: misma curación y recompensa de revancha que antes.
insert into public.battles(user_id,enemy_id,enemy_hp,enemy_max_hp,enemy_attack,question_mode,category_ids,start_operation,rules_version)
 values('55e07c17-1b87-4d20-9596-37dbcc800004',1,1,75,8,'adaptive',array[(select min(id) from public.categories)],'v4-legacy-v3-battle',3);
set local role authenticated;
do $$declare b public.battles;begin
 select * into b from public.battles where user_id=auth.uid() and status='active';
 b:=public.battle_action(b.id,'attack','v4-legacy-finish',1);
 if b.xp_awarded<>0 then raise exception 'Cambió recompensa de partida antigua';end if;
end;$$;
reset role;
do $$declare b public.battles;begin
 select * into b from public.battles where user_id='55e07c17-1b87-4d20-9596-37dbcc800004' and enemy_id=2 limit 1;
 b.rules_version:=3;b.turn:=4;b:=public.prepare_enemy_intent(b);
 if b.intent_kind<>'heavy' then raise exception 'Cambió intención de partida antigua';end if;
end;$$;
rollback;
