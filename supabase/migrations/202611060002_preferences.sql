-- Fase 3. Ejecutar después de la migración inicial.
begin;
alter table public.profiles add column question_mode text not null default 'adaptive'
  check (question_mode in ('easy','normal','hard','adaptive'));

create function public.save_learning_preferences(p_category_ids integer[], p_question_mode text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_ids integer[];
begin
  if v_user is null then raise exception 'Debes iniciar sesión' using errcode = '42501'; end if;
  if p_question_mode is null or p_question_mode not in ('easy','normal','hard','adaptive') then
    raise exception 'Modo de preguntas inválido' using errcode = '22023';
  end if;
  if p_category_ids is null or cardinality(p_category_ids) = 0 or cardinality(p_category_ids) > 100
     or array_position(p_category_ids, null) is not null then
    raise exception 'Selecciona al menos una categoría válida' using errcode = '22023';
  end if;
  select array_agg(distinct id order by id) into v_ids from unnest(p_category_ids) as chosen(id);
  if (select count(*) from public.categories where id = any(v_ids)) <> cardinality(v_ids) then
    raise exception 'Hay categorías inexistentes' using errcode = '22023';
  end if;
  -- Serializa los guardados del usuario y protege el reemplazo completo.
  perform 1 from public.profiles where id = v_user for update;
  if not found then raise exception 'No existe el perfil' using errcode = '42501'; end if;
  delete from public.user_interests where user_id = v_user;
  insert into public.user_interests(user_id, category_id)
    select v_user, id::smallint from unnest(v_ids) as chosen(id);
  update public.profiles set question_mode = p_question_mode where id = v_user;
  return jsonb_build_object('category_ids', v_ids, 'question_mode', p_question_mode);
end;
$$;
revoke all on function public.save_learning_preferences(integer[], text) from public, anon, authenticated;
grant execute on function public.save_learning_preferences(integer[], text) to authenticated;
commit;
