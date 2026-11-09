// Conserva literalmente los bloqueos y controles de las RPC anteriores.
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('supabase/migrations/202611070008_skills_medals.sql','utf8');
const extract=name=>{
 const start=source.indexOf(`create or replace function public.${name}(`);
 if(start<0)throw Error(name);
 return source.slice(start,source.indexOf('\n$$;',start)+4);
};
let start=extract('start_battle').replace('p_operation_id,3)','p_operation_id,4)');
let action=extract('battle_action').replaceAll('b.rules_version<>3','b.rules_version<3').replaceAll('b.rules_version=3','b.rules_version>=3')
 .replace('if v_new_reward=1 then v_reward:=50; end if;','if v_new_reward=1 then v_reward:=50; elsif b.rules_version>=4 then v_reward:=10; end if;')
 .replace('least(3,b.enemy_id+1)',"least(case when b.rules_version>=4 then 6 else 3 end,b.enemy_id+1)");
let answer=extract('answer_battle_question').replaceAll('b.rules_version=3','b.rules_version>=3');
let counter=extract('apply_counterattack').replaceAll('b.rules_version=3','b.rules_version>=3')
 .replace('least(12,b.enemy_max_hp-b.enemy_hp)','least(case b.enemy_id when 4 then 12 when 5 then 16 when 6 then 20 else 12 end,b.enemy_max_hp-b.enemy_hp)')
 .replace("' Slime recupera '","' El rival recupera '");
const legacyIntent=extract('prepare_enemy_intent').replace('public.prepare_enemy_intent(', 'public.prepare_legacy_enemy_intent(');
const intent=`create or replace function public.prepare_enemy_intent(b public.battles) returns public.battles
language plpgsql security definer set search_path='' as $$
declare v_version integer:=b.rules_version;
begin
 if b.rules_version<=3 then return public.prepare_legacy_enemy_intent(b); end if;
 if b.enemy_id<=3 then
  b.rules_version:=3;b:=public.prepare_legacy_enemy_intent(b);b.rules_version:=v_version;
  if b.enemy_id in (2,3) and b.turn%4=0 then
   b.intent_kind:='recover';b.intent_heavy:=false;b.intent_damage:=4;b.intent_label:='Recuperación: hasta 12 HP';
  end if;
  return b;
 end if;
 b.intent_heavy:=false;b.intent_kind:='attack';b.intent_damage:=b.enemy_attack;b.intent_label:='Ataque';
 if b.turn%4=0 then
  b.intent_kind:='recover';b.intent_damage:=case when b.enemy_id=6 then 6 else 4 end;
  b.intent_label:=case b.enemy_id when 4 then 'Drenaje vital: recupera hasta 12 HP' when 5 then 'Ritual: recupera hasta 16 HP' else 'Escamas renovadas: recupera hasta 20 HP' end;
 elsif b.turn%4=3 then
  b.intent_heavy:=true;b.intent_kind:='heavy';
  b.intent_damage:=case b.enemy_id when 4 then 18 when 5 then 24 else 28 end;
  b.intent_label:=case b.enemy_id when 4 then 'Picada del caos' when 5 then 'Tormenta del olvido' else 'Aliento de distracción' end;
 elsif b.enemy_id=5 and b.turn%4=2 then
  b.intent_kind:='evade';b.intent_damage:=8;b.intent_label:='Espejismo: ataque normal a la mitad';
 else
  b.intent_label:=case b.enemy_id when 4 then 'Aleteo cortante' when 5 then 'Orbe del olvido' else 'Zarpazo del dragón' end;
 end if;
 return b;
end;
$$;`;
const medals=source.slice(source.indexOf('create function public.get_campaign_medals()'),source.indexOf('revoke all on function public.get_campaign_medals()')).replace('create function','create or replace function').replaceAll('rules_version=3','rules_version>=3');
const records=extract('get_battle_records').replace('rules_version=3','rules_version=4');
const sql=`-- Rivales y recompensas v4. Las partidas anteriores conservan sus recompensas y patrones.
begin;
alter table public.enemies drop constraint enemies_id_check;
alter table public.enemies add constraint enemies_id_check check(id between 1 and 6);
alter table public.battles drop constraint battles_rules_version_check;
alter table public.battles add constraint battles_rules_version_check check(rules_version in (1,2,3,4));
alter table public.battles drop constraint battles_xp_awarded_check;
alter table public.battles add constraint battles_xp_awarded_check check(xp_awarded in (0,10,50));
insert into public.enemies(id,name,max_hp,attack) values
 (4,'Murciélago del Caos',150,8),(5,'Hechicero del Olvido',165,10),(6,'Dragón de la Distracción',190,12);
-- Quienes ya vencieron al jefe original pueden continuar la expansión.
update public.player_progress p set unlocked_enemy=4 where unlocked_enemy=3
 and exists(select 1 from public.enemy_rewards r where r.user_id=p.user_id and r.enemy_id=3);
${legacyIntent}
revoke all on function public.prepare_legacy_enemy_intent(public.battles) from public,anon,authenticated;
${intent}
${counter}
${start}
${action}
${answer}
${medals}
${records}
commit;
`;
writeFileSync('supabase/migrations/202611090009_villains.sql',sql,'utf8');
