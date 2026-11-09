-- Contrato del reloj con rivales v4; no verifica transporte WebSocket remoto.
begin;
insert into auth.users(id,email) values('82dc315c-f83d-4cab-ad7f-57e68da60064','watch-v4@example.invalid');
update public.player_progress set unlocked_enemy=6 where user_id='82dc315c-f83d-4cab-ad7f-57e68da60064';
set local role authenticated;
select set_config('request.jwt.claim.sub','82dc315c-f83d-4cab-ad7f-57e68da60064',true);
do $$declare b public.battles;s jsonb;begin
 perform public.save_learning_preferences(array[(select min(id)::integer from public.categories)],'adaptive');
 b:=public.start_battle(6,'watch-v4-dragon-start');
 s:=public.get_watch_state();
 if s->'battle'->>'enemy_name'<>'Dragón de la Distracción' or (s->'battle'->>'enemy_max_hp')::integer<>190 then raise exception 'Reloj sin rival nuevo';end if;
 b:=public.battle_action(b.id,'attack','watch-v4-dragon-attack',1);
 s:=public.get_watch_state();
 if (s->'battle'->>'player_hp')::integer<>b.player_hp or (s->'battle'->>'enemy_hp')::integer<>b.enemy_hp or s->'battle'->>'last_event'<>b.last_event then raise exception 'Reloj con datos distintos al combate';end if;
end;$$;
reset role;
update public.battles set enemy_hp=1 where user_id='82dc315c-f83d-4cab-ad7f-57e68da60064' and status='active';
set local role authenticated;
do $$declare b public.battles;s jsonb;begin
 select * into b from public.battles where user_id=auth.uid() and status='active';
 b:=public.battle_action(b.id,'attack','watch-v4-dragon-finish',b.turn);
 s:=public.get_watch_state();
 if s->'battle'->>'status'<>'won' or (s->'player'->>'total_xp')::integer<>50 or (s->'player'->>'wins')::integer<>1 then raise exception 'Reloj no refleja cierre/XP';end if;
end;$$;
reset role;
update public.battles set created_at=now()-interval '1 minute' where user_id='82dc315c-f83d-4cab-ad7f-57e68da60064';
set local role authenticated;
do $$declare b public.battles;s jsonb;begin
 b:=public.start_battle(4,'watch-v4-bat-start');
 s:=public.get_watch_state();
 if s->'battle'->>'id'<>b.id::text or s->'battle'->>'status'<>'active' or (s->'battle'->>'player_hp')::integer<>100 then raise exception 'Reloj conserva pelea anterior';end if;
end;$$;
rollback;
