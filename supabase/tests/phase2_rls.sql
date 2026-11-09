-- Ejecutar en SQL Editor después de la migración de Fase 1.
-- Dos usuarios temporales. Todo se revierte al terminar.
begin;
insert into auth.users(id, email) values
 ('fd87fb76-67a8-4fbb-bf88-62b6027f9011','focusbattle-rls-a@example.invalid'),
 ('fd87fb76-67a8-4fbb-bf88-62b6027f9012','focusbattle-rls-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub','fd87fb76-67a8-4fbb-bf88-62b6027f9011',true);
select set_config('request.jwt.claims','{"sub":"fd87fb76-67a8-4fbb-bf88-62b6027f9011","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'RLS: A ve perfiles ajenos o no ve el suyo'; end if;
  if not exists(select 1 from public.profiles where id = auth.uid()) then raise exception 'Falta perfil de A'; end if;
  if (select count(*) from public.player_progress) <> 1 then raise exception 'RLS: progreso no aislado para A'; end if;
  if not exists(select 1 from public.player_progress where user_id = auth.uid() and total_xp = 0 and wins = 0 and losses = 0 and unlocked_enemy = 1) then raise exception 'Progreso inicial inválido'; end if;
  if exists(select 1 from public.profiles where id = 'fd87fb76-67a8-4fbb-bf88-62b6027f9012') then raise exception 'A puede leer B'; end if;
  begin
    update public.player_progress set total_xp = 999 where user_id = auth.uid();
    raise exception 'El cliente puede modificar XP';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set display_name = 'Cambio no autorizado' where id = auth.uid();
    raise exception 'El cliente puede modificar el perfil directamente';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','fd87fb76-67a8-4fbb-bf88-62b6027f9012',true);
select set_config('request.jwt.claims','{"sub":"fd87fb76-67a8-4fbb-bf88-62b6027f9012","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'RLS: perfiles no aislados para B'; end if;
  if not exists(select 1 from public.profiles where id = auth.uid()) then raise exception 'Falta perfil de B'; end if;
  if (select count(*) from public.player_progress) <> 1 then raise exception 'RLS: progreso no aislado para B'; end if;
  if exists(select 1 from public.player_progress where user_id = 'fd87fb76-67a8-4fbb-bf88-62b6027f9011') then raise exception 'B puede leer progreso de A'; end if;
end $$;

set local role anon;
do $$
begin
  begin
    perform id from public.profiles;
    raise exception 'Anon puede leer perfiles';
  exception when insufficient_privilege then null;
  end;
  begin
    perform user_id from public.player_progress;
    raise exception 'Anon puede leer progreso';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'Pruebas de RLS completadas; usuarios temporales revertidos' as resultado;
