-- Fase 6. Ejecutar tras las migraciones anteriores. No publica las respuestas.
begin;
create function public.get_watch_state() returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'player',jsonb_build_object('id',p.id,'display_name',p.display_name,
      'total_xp',g.total_xp,'level',floor(g.total_xp/100.0)+1,'wins',g.wins,'losses',g.losses),
    'battle',case when b.id is null then null else jsonb_build_object(
      'id',b.id,'enemy_name',e.name,'player_hp',b.player_hp,'enemy_hp',b.enemy_hp,
      'enemy_max_hp',b.enemy_max_hp,'turn',b.turn,'status',b.status,
      'pending_question',b.pending_question_id is not null,'last_event',b.last_event) end
  ) from public.profiles p join public.player_progress g on g.user_id=p.id
  left join lateral (select * from public.battles x where x.user_id=p.id order by x.created_at desc,x.id desc limit 1) b on true
  left join public.enemies e on e.id=b.enemy_id
  where p.id=auth.uid();
$$;
revoke all on function public.get_watch_state() from public,anon,authenticated;
grant execute on function public.get_watch_state() to authenticated;
do $$
declare v_table text;
begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    raise exception 'No existe supabase_realtime. Revisa Realtime en el proyecto Supabase.';
  end if;
  foreach v_table in array array['profiles','player_progress','battles'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
      execute format('alter publication supabase_realtime add table public.%I',v_table);
    end if;
  end loop;
end $$;
commit;
