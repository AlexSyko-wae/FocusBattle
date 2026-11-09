-- Ejecutar después de 202611060002_preferences.sql. No deja datos de prueba.
begin;
insert into auth.users(id,email) values
 ('bc799674-5fef-4e0b-a28d-9300d586cd31','focusbattle-preferences-a@example.invalid'),
 ('bc799674-5fef-4e0b-a28d-9300d586cd32','focusbattle-preferences-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','bc799674-5fef-4e0b-a28d-9300d586cd31',true);
select set_config('request.jwt.claims','{"sub":"bc799674-5fef-4e0b-a28d-9300d586cd31","role":"authenticated"}',true);
do $$
declare ids integer[]; v_mode text;
begin
  select array_agg(id::integer order by id) into ids from public.categories;
  if cardinality(ids) < 2 then raise exception 'Faltan categorías iniciales'; end if;
  if (select question_mode from public.profiles where id=auth.uid()) <> 'adaptive' then raise exception 'Predeterminado incorrecto'; end if;
  if (select count(*) from public.user_interests) <> 0 then raise exception 'Intereses iniciales incorrectos'; end if;
  foreach v_mode in array array['easy','normal','hard','adaptive'] loop
    perform public.save_learning_preferences(ids[1:2], v_mode);
    if (select question_mode from public.profiles where id=auth.uid()) <> v_mode then raise exception 'Modo no persistido'; end if;
  end loop;
  -- El mismo guardado repetido no duplica intereses.
  perform public.save_learning_preferences(ids[1:2], 'adaptive');
  if (select count(*) from public.user_interests) <> 2 then raise exception 'Intereses duplicados o incompletos'; end if;
  perform public.save_learning_preferences(array[ids[1],ids[1]], 'hard');
  if (select count(*) from public.user_interests) <> 1 then raise exception 'No deduplica categorías'; end if;
  begin
    perform public.save_learning_preferences(array[]::integer[], 'easy');
    raise exception 'Aceptó selección vacía';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_learning_preferences(array[ids[1]], 'invalid');
    raise exception 'Aceptó modo inválido';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_learning_preferences(array[-1], 'normal');
    raise exception 'Aceptó categoría inexistente';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_learning_preferences(array[null]::integer[], 'easy');
    raise exception 'Aceptó categoría nula';
  exception when invalid_parameter_value then null; end;
  if (select question_mode from public.profiles where id=auth.uid()) <> 'hard'
    or (select count(*) from public.user_interests) <> 1 then raise exception 'Una solicitud inválida alteró preferencias'; end if;
  begin
    insert into public.user_interests(user_id,category_id) values(auth.uid(),ids[2]);
    raise exception 'Escritura directa permitida';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','bc799674-5fef-4e0b-a28d-9300d586cd32',true);
select set_config('request.jwt.claims','{"sub":"bc799674-5fef-4e0b-a28d-9300d586cd32","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.user_interests) <> 0 then raise exception 'B ve intereses de A'; end if;
  if (select question_mode from public.profiles where id=auth.uid()) <> 'adaptive' then raise exception 'A cambió el modo de B'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'B ve perfiles ajenos'; end if;
end $$;

-- Comprueba auth.uid incluso si la función se invoca con rol authenticated sin identidad.
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
begin
  begin
    perform public.save_learning_preferences(array[1], 'easy');
    raise exception 'Aceptó solicitud sin identidad';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$
begin
  begin
    perform public.save_learning_preferences(array[1], 'easy');
    raise exception 'Anon puede ejecutar la función';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Pruebas de preferencias completadas; datos temporales revertidos' as resultado;
