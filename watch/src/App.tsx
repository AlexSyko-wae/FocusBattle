import { useState } from 'react'
import { usePlayer } from './hooks/use-player'
import { LiveWatch } from './components/live-watch'
import './App.css'

export default function App() {
  const account = usePlayer()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword,setShowPassword]=useState(false)
  return <main><header><p className="eyebrow">FOCUSBATTLE</p><h1>Tu aventura,<br />en la muñeca.</h1>{!account.session && <p>Inicia sesión con tu cuenta de jugador.</p>}
    {!account.ready ? <p role="status">Recuperando sesión…</p> : account.session ? <div className="account">
      <p>{account.session.user.email}</p>
      <button disabled={account.busy} onClick={() => void account.signOut()}>{account.busy ? 'Cerrando…' : 'Cerrar sesión del reloj'}</button>
      <button disabled={account.loading || account.busy} onClick={account.refresh}>Actualizar perfil</button>
    </div> : <form noValidate onSubmit={async (event) => {
      event.preventDefault()
      if (await account.authenticate(email, password)) {setPassword('');setShowPassword(false)}
    }}>
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" type="email" autoComplete="email" aria-describedby="login-message" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={account.busy} />
      <label htmlFor="password">Contraseña</label>
      <input id="password" type={showPassword?'text':'password'} autoComplete="current-password" aria-describedby="login-message" required value={password} onChange={event => setPassword(event.target.value)} disabled={account.busy} />
      <label style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" checked={showPassword} onChange={event=>setShowPassword(event.target.checked)}/>Mostrar contraseña</label>
      <button type="submit" disabled={account.busy}>{account.busy ? 'Entrando…' : 'Iniciar sesión'}</button>
      <p>¿Aún no tienes cuenta? Créala en tu celular.</p>
    </form>}
    <p id="login-message" className="notice" role="status" aria-live="polite">{account.message || (account.busy ? 'Comprobando tus datos…' : '')}</p>
  </header>
    {account.session ? <LiveWatch key={account.session.user.id} session={account.session} /> :
      <section aria-label="Smartwatch" className="watch"><div className="face"><span className="eyebrow">FOCUSBATTLE</span><span className="rune" aria-hidden="true">✦</span><h2>En espera</h2><p>Inicia sesión para seguir tu batalla.</p></div></section>}
    </main>
}
