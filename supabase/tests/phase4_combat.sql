-- Ejecutar en SQL Editor tras las migraciones 001, 002 y 003.
-- Prueba real de funciones en transacción; revierte todos los datos al finalizar.
begin;
insert into auth.users(id,email) values
 ('be719a47-9755-4354-bf99-38d8c7800041','focusbattle-combat-a@example.invalid'),
 ('be719a47-9755-4354-bf99-38d8c7800042','focusbattle-combat-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','be719a47-9755-4354-bf99-38d8c7800041',true);
select set_config('request.jwt.claims','{"sub":"be719a47-9755-4354-bf99-38d8c7800041","role":"authenticated"}',true);
do $$
declare b public.battles; previous public.battles; n integer; v_enemy integer;
begin
  begin
    perform public.start_battle(1,'start-no-interests');
    raise exception 'Aceptó batalla sin intereses';
  exception when invalid_parameter_value then null; end;
  perform public.save_learning_preferences(array[(select min(id)::integer from public.categories)],'adaptive');
  begin
    perform public.start_battle(2,'start-locked-enemy');
    raise exception 'Aceptó enemigo bloqueado';
  exception when invalid_parameter_value then null; end;
  b:=public.start_battle(1,'start-slime-first');
  previous:=public.start_battle(1,'start-slime-first');
  if b.id<>previous.id or b.player_hp<>100 or b.enemy_hp<>45 or b.heals_left<>2 or b.turn<>1 then raise exception 'Inicio incorrecto'; end if;
  begin
    perform public.start_battle(1,'start-second-active');
    raise exception 'Aceptó dos batallas activas';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.battle_action(b.id,'heal','invalid-full-heal',b.turn);
    raise exception 'Aceptó curación con HP completo';
  exception when invalid_parameter_value then null; end;
  b:=public.battle_action(b.id,'attack','first-attack-one',1);
  if b.player_hp<>92 or b.enemy_hp<>30 or b.turn<>2 then raise exception 'Ataque o contraataque incorrecto'; end if;
  previous:=public.battle_action(b.id,'attack','first-attack-one',1);
  if previous.turn<>b.turn or previous.player_hp<>b.player_hp then raise exception 'Acción duplicada aplicada'; end if;
  begin
    perform public.battle_action(b.id,'defend','first-attack-one',1);
    raise exception 'Reutilizó operación con otro contenido';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.battle_action(b.id,'attack','stale-turn-request',1);
    raise exception 'Aceptó turno desactualizado';
  exception when serialization_failure then null; end;
  b:=public.battle_action(b.id,'attack','first-attack-two',b.turn);
  b:=public.battle_action(b.id,'attack','first-attack-three',b.turn);
  if b.status<>'won' or b.player_hp<>84 or b.enemy_hp<>0 or b.xp_awarded<>50 then raise exception 'Victoria incorrecta o contraataque tras muerte'; end if;
  previous:=public.battle_action(b.id,'attack','first-attack-three',3);
  if previous.xp_awarded<>50 then raise exception 'Reintento terminal incorrecto'; end if;
  if (select wins from public.player_progress where user_id=auth.uid())<>1 or (select total_xp from public.player_progress where user_id=auth.uid())<>50 then raise exception 'Premio duplicado'; end if;

  b:=public.start_battle(1,'start-slime-repeat');
  b:=public.battle_action(b.id,'defend','repeat-defend-one',b.turn);
  if b.player_hp<>96 or b.defending then raise exception 'Defensa incorrecta o no consumida'; end if;
  b:=public.battle_action(b.id,'heal','repeat-heal-one',b.turn);
  if b.player_hp<>92 or b.heals_left<>1 then raise exception 'Curación sin límite de HP o sin contraataque'; end if;
  b:=public.battle_action(b.id,'heal','repeat-heal-two',b.turn);
  if b.player_hp<>92 or b.heals_left<>0 then raise exception 'Segunda curación incorrecta'; end if;
  begin
    perform public.battle_action(b.id,'heal','repeat-heal-third',b.turn);
    raise exception 'Aceptó tercera curación';
  exception when invalid_parameter_value then null; end;
  for n in 1..3 loop b:=public.battle_action(b.id,'attack','repeat-attack-'||n,b.turn); end loop;
  if b.status<>'won' or b.xp_awarded<>0 then raise exception 'Recompensa inicial repetida'; end if;
  for v_enemy in 2..3 loop
    b:=public.start_battle(v_enemy,'start-enemy-'||v_enemy);
    n:=0;
    while b.status='active' loop
      n:=n+1;
      if n>10 then raise exception 'La batalla no termina'; end if;
      b:=public.battle_action(b.id,'attack','progress-attack-'||n,b.turn);
    end loop;
    if b.status<>'won' or b.xp_awarded<>50 then raise exception 'Progresión incorrecta'; end if;
  end loop;
  if (select total_xp from public.player_progress where user_id=auth.uid())<>150
    or (select unlocked_enemy from public.player_progress where user_id=auth.uid())<>3 then raise exception 'XP/desbloqueos incorrectos'; end if;
  b:=public.start_battle(3,'start-defeat-test');
  for n in 1..7 loop b:=public.battle_action(b.id,'defend','defeat-defend-'||n,b.turn); end loop;
  for n in 1..3 loop b:=public.battle_action(b.id,'attack','defeat-attack-'||n,b.turn); end loop;
  if b.status<>'lost' or b.player_hp<>0 or b.xp_awarded<>0 then raise exception 'Derrota incorrecta'; end if;
  previous:=public.battle_action(b.id,'attack','defeat-attack-3',10);
  if (select losses from public.player_progress where user_id=auth.uid())<>1 or (select total_xp from public.player_progress where user_id=auth.uid())<>150 then raise exception 'Derrota duplicada o XP alterada'; end if;
  begin
    update public.battles set player_hp=100 where id=b.id;
    raise exception 'Escritura directa de HP permitida';
  exception when insufficient_privilege then null; end;
  -- Se deja una batalla para probar efectos preparados para la próxima fase.
  perform public.start_battle(3,'start-effects-test');
end $$;
reset role;
-- Configuración de prueba desde administrador, nunca desde el cliente.
update public.battles set enemy_attack=15,player_hp=99,enemy_penalty=true,attack_bonus=true
  where user_id='be719a47-9755-4354-bf99-38d8c7800041' and status='active';
set local role authenticated;
do $$
declare b public.battles;
begin
  select * into b from public.battles where status='active';
  b:=public.battle_action(b.id,'defend','effects-defend-one',b.turn);
  if b.player_hp<>86 or b.enemy_penalty or b.defending or not b.attack_bonus then raise exception 'Penalización/defensa/redondeo incorrectos'; end if;
  b:=public.battle_action(b.id,'attack','effects-attack-one',b.turn);
  if b.enemy_hp<>50 or b.attack_bonus or b.player_hp<>71 then raise exception 'Beneficio de ataque incorrecto'; end if;
end $$;

select set_config('request.jwt.claim.sub','be719a47-9755-4354-bf99-38d8c7800042',true);
select set_config('request.jwt.claims','{"sub":"be719a47-9755-4354-bf99-38d8c7800042","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.battles)<>0 then raise exception 'B puede leer batallas de A'; end if;
  if (select count(*) from public.enemy_rewards)<>0 then raise exception 'B puede leer premios de A'; end if;
end $$;
reset role;
-- Comprueba que B no puede ejecutar acciones en la batalla de A, aun conociendo su UUID.
select set_config('focusbattle.test_battle',(select id::text from public.battles where user_id='be719a47-9755-4354-bf99-38d8c7800041' and status='active'),true);
set local role authenticated;
do $$
begin
  begin
    perform public.battle_action(current_setting('focusbattle.test_battle')::uuid,'attack','foreign-battle-attempt',3);
    raise exception 'B puede actuar en batalla de A';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$
begin
  begin
    perform public.start_battle(1,'anonymous-start-one');
    raise exception 'Anon puede iniciar batalla';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Combate: reglas, recompensas, idempotencia y aislamiento aprobados; datos revertidos' as resultado;
