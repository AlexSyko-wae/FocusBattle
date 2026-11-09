import type { Session } from '@supabase/supabase-js';
import { useWatch } from '../hooks/use-watch';
export function LiveWatch({ session }: { session: Session }) {
  const watch = useWatch(session);
  const labels = { connecting: 'Conectando', live: 'En directo', reconnecting: 'Reconectando', offline: 'Sin conexión', error: 'No se pudo sincronizar' };
  const latestBattle = watch.data?.battle;
  const b = latestBattle?.status === 'active' ? latestBattle : null;
  const p = watch.data?.player;
  return <div className="companion">
    <div className={`connection ${watch.connection}`} role="status"><span aria-hidden="true">● </span>{labels[watch.connection]}</div>
    <section aria-label="Smartwatch de consulta" className="watch"><div className="face live-face">
      <span className="eyebrow">FOCUSBATTLE</span>
      {p ? <><h2 className="player-name">{p.display_name}</h2><p>Nv. {p.level} · {p.total_xp} XP · {p.wins} victorias</p>
        {b ? <><p className="enemy-name">{b.enemy_name}</p>
          <Health label="Tú" hp={b.player_hp} max={100} />
          <Health label="Enemigo" hp={b.enemy_hp} max={b.enemy_max_hp} />
          <p className="battle-state">{b.pending_question ? `Desafío · turno ${b.turn-1}` : `Turno ${b.turn}`}</p>
        </> : <><span className="rune" aria-hidden="true">✦</span><p className="battle-state">En el campamento</p><p>Listo para la próxima batalla</p></>}
      </> : <p>Cargando tu aventura…</p>}
    </div></section>
    <div className="event-card"><p className="eyebrow">{b ? 'ÚLTIMO EVENTO' : 'TU AVENTURA'}</p><p>{b?.last_event ?? 'Elige un rival en el celular para comenzar.'}</p>
      {watch.connection!=='live' && <p className="notice">Los datos pueden estar desactualizados.</p>}
      {watch.connection!=='live' && <button onClick={watch.reconnect}>Reconectar</button>}
    </div>
  </div>;
}
function Health({ label,hp,max }: { label: string; hp: number; max: number }) {
  return <div className="watch-health"><div className="health-label"><span>{label}</span><span>{hp}/{max} HP</span></div>
    <div className="health-track" role="progressbar" aria-label={`HP de ${label}`} aria-valuenow={hp} aria-valuemin={0} aria-valuemax={max}>
      <div style={{ width: `${hp/max*100}%`,backgroundColor: hp/max>0.3 ? '#43BFA0' : '#D75B65' }} /></div></div>;
}
