begin;
-- Solo lectura; RLS filtra todos los datos personales.
create function public.get_player_stats() returns jsonb
language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'display_name',p.display_name,'total_xp',g.total_xp,'level',floor(g.total_xp/100.0)+1,
 'xp_in_level',g.total_xp%100,'xp_to_next_level',100-g.total_xp%100,
 'wins',g.wins,'losses',g.losses,'unlocked_enemies',g.unlocked_enemy,
 'correct',t.correct,'wrong',t.wrong,'answered',t.correct+t.wrong,
 'accuracy',case when t.correct+t.wrong=0 then null else round(100.0*t.correct/(t.correct+t.wrong),1) end,
 'categories',(select jsonb_agg(jsonb_build_object(
   'id',c.id,'name',c.name,'difficulty',coalesce(cp.difficulty,1),
   'correct',coalesce(cp.correct_count,0),'wrong',coalesce(cp.wrong_count,0),
   'answered',coalesce(cp.correct_count,0)+coalesce(cp.wrong_count,0),
   'accuracy',case when coalesce(cp.correct_count,0)+coalesce(cp.wrong_count,0)=0 then null else round(100.0*cp.correct_count/(cp.correct_count+cp.wrong_count),1) end,
   'correct_streak',coalesce(cp.correct_streak,0),'wrong_streak',coalesce(cp.wrong_streak,0)
 ) order by c.id) from public.categories c left join public.category_progress cp on cp.category_id=c.id and cp.user_id=p.id),
 'enemies',(select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'unlocked',e.id<=g.unlocked_enemy,
   'defeated',exists(select 1 from public.enemy_rewards r where r.user_id=p.id and r.enemy_id=e.id)) order by e.id) from public.enemies e)
) from public.profiles p join public.player_progress g on g.user_id=p.id
cross join lateral (select coalesce(sum(correct_count),0) correct,coalesce(sum(wrong_count),0) wrong from public.category_progress where user_id=p.id) t
where p.id=auth.uid();
$$;
revoke all on function public.get_player_stats() from public,anon,authenticated;
grant execute on function public.get_player_stats() to authenticated;
commit;
