-- Tras migración 005. Solo prueba la consulta y publicación; no prueba WebSocket.
begin;
do $$ begin
  if (select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in ('profiles','player_progress','battles'))<>3 then raise exception 'Publicación incompleta'; end if;
end $$;
insert into auth.users(id,email) values
 ('82dc315c-f83d-4cab-ad7f-57e68da60061','watch-test-a@example.invalid'),
 ('82dc315c-f83d-4cab-ad7f-57e68da60062','watch-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','82dc315c-f83d-4cab-ad7f-57e68da60061',true);
select set_config('request.jwt.claims','{"sub":"82dc315c-f83d-4cab-ad7f-57e68da60061","role":"authenticated"}',true);
do $$
declare s jsonb; b public.battles;
begin
  s:=public.get_watch_state();
  if s->'player'->>'id'<>auth.uid()::text or s->'battle'<>'null'::jsonb then raise exception 'Estado inicial incorrecto'; end if;
  perform public.save_learning_preferences(array[(select min(id)::integer from public.categories)],'adaptive');
  b:=public.start_battle(1,'watch-start-one');
  b:=public.battle_action(b.id,'attack','watch-attack-one',b.turn);
  s:=public.get_watch_state();
  if s->'battle'->>'id'<>b.id::text or (s->'battle'->>'player_hp')::integer<>92 or (s->'battle'->>'enemy_hp')::integer<>30 then raise exception 'HP incorrecto en reloj'; end if;
  if s->'battle'->>'last_event'<>b.last_event or (s->'battle'->>'turn')::integer<>2 then raise exception 'Turno/evento incorrecto'; end if;
  b:=public.battle_action(b.id,'attack','watch-attack-two',b.turn);
  s:=public.get_watch_state();
  if not (s->'battle'->>'pending_question')::boolean or (s->'battle'->>'player_hp')::integer<>92 then raise exception 'No muestra pregunta antes de contraataque'; end if;
  if (s->'battle') ? 'correct_index' or (s->'battle') ? 'explanation' then raise exception 'Filtra solución'; end if;
end $$;
select set_config('request.jwt.claim.sub','82dc315c-f83d-4cab-ad7f-57e68da60062',true);
select set_config('request.jwt.claims','{"sub":"82dc315c-f83d-4cab-ad7f-57e68da60062","role":"authenticated"}',true);
do $$ declare s jsonb; begin
  s:=public.get_watch_state();
  if s->'player'->>'id'<>auth.uid()::text or s->'battle'<>'null'::jsonb then raise exception 'B ve datos de A'; end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.get_watch_state();raise exception 'Consulta anónima permitida';
  exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Reloj: consulta, publicación e aislamiento aprobados; datos revertidos' as resultado;
