import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Store } from "lucide-react";
import "./storeAccess.css";

export function StoreLogin({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await onLogin(username, password); } catch { setError("Login ou senha incorretos. Confira os dados definidos pela administração."); } finally { setBusy(false); } }
  return <main className="store-login-shell">
    <section className="store-login-brand">
      <img className="store-login-logo" src="/brand/logo-primary-transparent.png" alt="Roy's Sandwich Shop" />
      <span>Fechamento operacional</span><h1>Seu turno.<br/><em>Seu fechamento.</em></h1>
      <p>Acesse a unidade, confira os dados e envie o fechamento em poucos passos.</p>
    </section>
    <section className="store-login-panel"><form onSubmit={submit}>
      <div className="store-login-icon"><Store /></div><span className="eyebrow">Acesso da loja</span><h2>Vamos começar</h2>
      <label>Login da loja<input autoComplete="username" autoFocus value={username} onChange={e=>setUsername(e.target.value)} required /></label>
      <label>Senha<div className="password-wrap"><input autoComplete="current-password" type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" aria-label={show?"Ocultar senha":"Mostrar senha"} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>
      {error&&<p role="alert" className="store-login-error">{error}</p>}
      <button className="store-login-submit" disabled={busy} type="submit"><LockKeyhole />{busy?"Entrando…":"Entrar para fechar"}<ArrowRight /></button>
      <a href="/admin">Acesso administrativo</a>
    </form></section>
  </main>;
}
