-- Ejecutar después de migración 004 y banco inicial. Todo se revierte.
begin;
do $$ begin
  if (select count(*) from public.questions where active)<99 then raise exception 'Falta cargar el banco inicial de 99 preguntas'; end if;
  if exists(select 1 from public.categories c where
    (select count(*) from public.questions q where q.category_id=c.id and q.difficulty=1 and q.active)<3 or
    (select count(*) from public.questions q where q.category_id=c.id and q.difficulty=2 and q.active)<3 or
    (select count(*) from public.questions q where q.category_id=c.id and q.difficulty=3 and q.active)<3) then raise exception 'Cobertura inicial incompleta'; end if;
end $$;
-- Contenido controlado para verificar las reglas independientemente del azar.
update public.questions set active=false;
insert into public.questions(id,category_id,difficulty,prompt,options,correct_index,explanation)
select 'phase5-test-'||n,(select id from public.categories where name='Matemáticas'),((n-1)/3+1)::smallint,
  'Pregunta controlada '||n,array['Correcta','Incorrecta 1','Incorrecta 2','Incorrecta 3'],0,'Explicación de prueba.' from generate_series(1,9) n;
insert into auth.users(id,email) values
 ('a7ed2294-d48d-4934-8191-e1e452a50051','focusbattle-question-a@example.invalid'),
 ('a7ed2294-d48d-4934-8191-e1e452a50052','focusbattle-question-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a7ed2294-d48d-4934-8191-e1e452a50051',true);
select set_config('request.jwt.claims','{"sub":"a7ed2294-d48d-4934-8191-e1e452a50051","role":"authenticated"}',true);
do $$
declare b public.battles; previous public.battles; q jsonb; q_id uuid; i integer; option_index integer; cp public.category_progress;
begin
  perform public.save_learning_preferences(array[(select id::integer from public.categories where name='Matemáticas')],'adaptive');
  b:=public.start_battle(1,'phase5-start-first');
  for i in 1..9 loop
    b:=public.battle_action(b.id,'defend','phase5-odd-'||i,b.turn);
    if b.pending_question_id is not null then raise exception 'Pregunta en turno impar'; end if;
    previous:=b;
    b:=public.battle_action(b.id,'defend','phase5-even-'||i,b.turn);
    if b.pending_question_id is null or b.player_hp<>previous.player_hp or not b.defending then raise exception 'No pausó antes del contraataque'; end if;
    q:=public.get_battle_question(b.id);
    if q->>'correct_index' is not null or q->>'explanation' is not null or (q->>'answered')::boolean then raise exception 'Filtró respuesta o explicación'; end if;
    if q->>'category'<>'Matemáticas' then raise exception 'Pregunta fuera de intereses'; end if;
    if i<=3 and (q->>'difficulty')::integer<>1 then raise exception 'Adaptación inicial incorrecta'; end if;
    if i between 4 and 6 and (q->>'difficulty')::integer<>2 then raise exception 'No subió a media tras tres aciertos'; end if;
    if i=7 and (q->>'difficulty')::integer<>3 then raise exception 'No subió a difícil'; end if;
    q_id:=b.pending_question_id;
    begin
      perform public.battle_action(b.id,'attack','phase5-blocked-'||i,b.turn);
      raise exception 'Permitió acción con pregunta pendiente';
    exception when invalid_parameter_value then null; end;
    option_index:=case when i in (7,8) then 1 else 0 end;
    b:=public.answer_battle_question(b.id,q_id,option_index,'phase5-answer-'||i);
    if b.pending_question_id is not null or b.defending or b.enemy_penalty then raise exception 'No consumió defensa/penalización'; end if;
    if b.player_hp<>previous.player_hp-(case when i in (7,8) then 9 else 4 end) then raise exception 'Daño con defensa o penalización incorrecto'; end if;
    previous:=public.answer_battle_question(b.id,q_id,option_index,'phase5-answer-'||i);
    if previous.player_hp<>b.player_hp then raise exception 'Respuesta duplicada aplicó contraataque'; end if;
    begin
      perform public.answer_battle_question(b.id,q_id,option_index,'phase5-other-'||i);
      raise exception 'Permitió segunda respuesta';
    exception when invalid_parameter_value then null; end;
    q:=public.get_battle_question(b.id);
    if q->>'correct_index'<>'0' or q->>'explanation'<>'Explicación de prueba.' or not (q->>'answered')::boolean then raise exception 'No mostró explicación posterior'; end if;
  end loop;
  select * into cp from public.category_progress where user_id=auth.uid();
  if cp.correct_count<>7 or cp.wrong_count<>2 or cp.difficulty<>2 or cp.correct_streak<>1 or cp.wrong_streak<>0 then raise exception 'Estadísticas/rachas incorrectas'; end if;
  if b.correct_answers<>7 or b.wrong_answers<>2 or b.player_hp<>18 then raise exception 'Contadores de batalla incorrectos'; end if;
  if (select count(*) from public.question_history where user_id=auth.uid())<>9 or exists(select 1 from public.question_history where user_id=auth.uid() and seen_count<>1) then raise exception 'Repetición dentro de batalla'; end if;
  b:=public.battle_action(b.id,'defend','phase5-exhaust-odd',b.turn);
  b:=public.battle_action(b.id,'defend','phase5-exhaust-even',b.turn);
  if b.pending_question_id is not null or b.player_hp<>10 then raise exception 'No continuó al agotar preguntas'; end if;
  b:=public.battle_action(b.id,'attack','phase5-bonus-hit',b.turn);
  if b.enemy_hp<>15 or b.attack_bonus or b.player_hp<>2 then raise exception 'Beneficio acumulado o no consumido'; end if;
  b:=public.battle_action(b.id,'attack','phase5-lethal-hit',b.turn);
  if b.status<>'won' or b.player_hp<>2 or b.pending_question_id is not null then raise exception 'Pregunta o contraataque tras golpe letal'; end if;
  begin
    perform correct_index from public.questions;
    raise exception 'Cliente lee respuestas del banco';
  exception when insufficient_privilege then null; end;
  begin
    perform correct_index from public.battle_questions;
    raise exception 'Cliente lee respuestas de preguntas asignadas';
  exception when insufficient_privilege then null; end;
  -- Guardar el ID para la comprobación de aislamiento.
  perform set_config('focusbattle.question_battle',b.id::text,true);
end $$;
-- Una respuesta incorrecta también puede terminar la batalla en derrota.
select public.start_battle(1,'phase5-fatal-start');
reset role;
update public.battles set player_hp=5,turn=2 where user_id='a7ed2294-d48d-4934-8191-e1e452a50051' and status='active';
set local role authenticated;
do $$
declare b public.battles; q_id uuid; previous public.battles;
begin
  select * into b from public.battles where status='active';
  b:=public.battle_action(b.id,'defend','phase5-fatal-defend',b.turn);
  q_id:=b.pending_question_id;
  b:=public.answer_battle_question(b.id,q_id,1,'phase5-fatal-answer');
  if b.status<>'lost' or b.player_hp<>0 or b.pending_question_id is not null then raise exception 'Error en derrota causada por respuesta'; end if;
  previous:=public.answer_battle_question(b.id,q_id,1,'phase5-fatal-answer');
  if (select losses from public.player_progress where user_id=auth.uid())<>1 then raise exception 'Derrota por respuesta duplicada'; end if;
  if public.get_battle_question(b.id)->>'explanation' is null then raise exception 'No conservó explicación tras derrota'; end if;
end $$;
select set_config('request.jwt.claim.sub','a7ed2294-d48d-4934-8191-e1e452a50052',true);
select set_config('request.jwt.claims','{"sub":"a7ed2294-d48d-4934-8191-e1e452a50052","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.category_progress)<>0 then raise exception 'B ve estadísticas de A'; end if;
  begin
    perform public.get_battle_question(current_setting('focusbattle.question_battle')::uuid);
    raise exception 'B ve pregunta de A';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.get_battle_question(current_setting('focusbattle.question_battle')::uuid);
    raise exception 'Anon consulta preguntas';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Preguntas: secuencia, seguridad, efectos, rachas y agotamiento aprobados; datos revertidos' as resultado;
