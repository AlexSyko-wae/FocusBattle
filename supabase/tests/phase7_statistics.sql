begin;
insert into auth.users(id,email) values
 ('71439fa3-e45a-4596-bf03-b1d977270071','stats-a@example.invalid'),
 ('71439fa3-e45a-4596-bf03-b1d977270072','stats-b@example.invalid');
insert into public.category_progress(user_id,category_id,difficulty,correct_count,wrong_count,correct_streak,wrong_streak) values
 ('71439fa3-e45a-4596-bf03-b1d977270071',(select id from public.categories where name='Matemáticas'),2,2,1,1,0),
 ('71439fa3-e45a-4596-bf03-b1d977270071',(select id from public.categories where name='Ciencia'),1,0,2,0,2);
update public.player_progress set total_xp=150,wins=4,losses=2,unlocked_enemy=3 where user_id='71439fa3-e45a-4596-bf03-b1d977270071';
insert into public.battles(user_id,enemy_id,enemy_hp,enemy_max_hp,enemy_attack,question_mode,category_ids,start_operation,status,xp_awarded)
 values('71439fa3-e45a-4596-bf03-b1d977270071',1,0,45,8,'adaptive',array[(select min(id) from public.categories)],'stats-fixture-battle','won',50);
insert into public.enemy_rewards(user_id,enemy_id,battle_id) select user_id,enemy_id,id from public.battles where user_id='71439fa3-e45a-4596-bf03-b1d977270071';
set local role authenticated;
select set_config('request.jwt.claim.sub','71439fa3-e45a-4596-bf03-b1d977270071',true);
select set_config('request.jwt.claims','{"sub":"71439fa3-e45a-4596-bf03-b1d977270071","role":"authenticated"}',true);
do $$ declare s jsonb; c jsonb; begin
 s:=public.get_player_stats();
 if (s->>'answered')::integer<>5 or (s->>'correct')::integer<>2 or (s->>'wrong')::integer<>3 or (s->>'accuracy')::numeric<>40 then raise exception 'Totales o precisión ponderada incorrectos';end if;
 if (s->>'level')::integer<>2 or (s->>'total_xp')::integer<>150 or (s->>'xp_in_level')::integer<>50 or (s->>'xp_to_next_level')::integer<>50 then raise exception 'Nivel o XP incorrectos';end if;
 if (s->>'wins')::integer<>4 or (s->>'losses')::integer<>2 or (s->>'unlocked_enemies')::integer<>3 then raise exception 'Progreso incorrecto';end if;
 if jsonb_array_length(s->'categories')<>11 or jsonb_array_length(s->'enemies')<>3 then raise exception 'Catálogos incompletos';end if;
 select value into c from jsonb_array_elements(s->'categories') where value->>'name'='Matemáticas';
 if (c->>'accuracy')::numeric<>66.7 or (c->>'difficulty')::integer<>2 or (c->>'correct_streak')::integer<>1 then raise exception 'Datos por categoría incorrectos';end if;
 if (select count(*) from jsonb_array_elements(s->'enemies') where (value->>'defeated')::boolean)<>1 then raise exception 'Confundió desbloqueados con derrotados';end if;
end $$;
select set_config('request.jwt.claim.sub','71439fa3-e45a-4596-bf03-b1d977270072',true);
select set_config('request.jwt.claims','{"sub":"71439fa3-e45a-4596-bf03-b1d977270072","role":"authenticated"}',true);
do $$ declare s jsonb; begin
 s:=public.get_player_stats();
 if (s->>'answered')::integer<>0 or s->>'accuracy' is not null or (s->>'total_xp')::integer<>0 then raise exception 'B ve datos de A o precisión inicial incorrecta';end if;
 if (s->>'xp_to_next_level')::integer<>100 then raise exception 'Progreso inicial incorrecto';end if;
 if exists(select 1 from jsonb_array_elements(s->'categories') where (value->>'answered')::integer<>0 or value->>'accuracy' is not null) then raise exception 'Categorías iniciales incorrectas';end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.get_player_stats();raise exception 'Consulta anónima permitida';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Estadísticas: totales, precisión, progreso e aislamiento aprobados; datos revertidos' as resultado;
