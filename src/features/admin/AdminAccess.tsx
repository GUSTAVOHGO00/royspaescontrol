import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  authenticateAdmin,
  configureAdminPassword,
  hasAdminPassword,
} from "./adminAuth";
import "./admin.css";

interface AdminAccessProps {
  onAuthenticated: () => void;
  onBack: () => void;
}

export function AdminAccess({
  onAuthenticated,
  onBack,
}: AdminAccessProps) {
  const [setupMode] = useState(() => !hasAdminPassword());
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const isLocked = lockedUntil > now;

  useEffect(() => {
    if (!isLocked) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isLocked]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (setupMode && password !== confirmation) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }

    setBusy(true);
    try {
      if (setupMode) {
        await configureAdminPassword(password);
      }

      const result = await authenticateAdmin(password);
      if (result.ok) {
        onAuthenticated();
        return;
      }

      if (result.reason === "locked") {
        const nextLockedUntil = result.lockedUntil ?? 0;
        setLockedUntil(nextLockedUntil);
        setNow(Date.now());
        const remainingMinutes = Math.max(
          1,
          Math.ceil((nextLockedUntil - Date.now()) / 60_000),
        );
        setError(
          `Acesso temporariamente bloqueado. Tente novamente em cerca de ${remainingMinutes} minutos.`,
        );
      } else {
        setError(
          "Senha incorreta. Confira com atenção antes de tentar novamente.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível proteger o acesso agora.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-access-shell">
      <section className="admin-access-brand" aria-label="Roy's Controle">
        <button
          aria-label="Voltar ao fechamento"
          className="admin-back-button"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" />
          Voltar
        </button>
        <div className="admin-brand-lockup">
          <img src="brand/logo-primary-transparent.png" alt="Roy's Sandwich Shop" />
          <div>
            <span>Roy's Controle</span>
            <strong>Administração operacional</strong>
          </div>
        </div>
        <div className="admin-access-promise">
          <span className="admin-access-index">Acesso restrito</span>
          <h1>
            Decisões claras.
            <br />
            <em>Dados protegidos.</em>
          </h1>
          <p>
            Acompanhe fechamentos, encontre divergências e crie correções sem
            apagar o lançamento original.
          </p>
        </div>
        <div className="admin-security-note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Senha protegida neste aparelho</strong>
            <span>Não salvamos sua senha em texto legível.</span>
          </div>
        </div>
      </section>

      <section className="admin-access-form-panel">
        <form className="admin-access-form" onSubmit={handleSubmit}>
          <div className="admin-form-icon">
            {setupMode ? (
              <LockKeyhole aria-hidden="true" />
            ) : (
              <KeyRound aria-hidden="true" />
            )}
          </div>
          <span className="admin-form-eyebrow">
            {setupMode ? "Primeiro acesso" : "Área protegida"}
          </span>
          <h2>
            {setupMode ? "Proteja a administração" : "Acesso administrativo"}
          </h2>
          <p>
            {setupMode
              ? "Crie a senha que será usada pelos responsáveis administrativos neste navegador."
              : "Digite sua senha para consultar indicadores e auditorias."}
          </p>

          <label className="admin-password-field">
            <span>Senha administrativa</span>
            <div>
              <input
                autoComplete={setupMode ? "new-password" : "current-password"}
                autoFocus
                disabled={busy || isLocked}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </button>
            </div>
          </label>

          {setupMode && (
            <label className="admin-password-field">
              <span>Confirmar senha</span>
              <div>
                <input
                  autoComplete="new-password"
                  disabled={busy}
                  minLength={8}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                />
              </div>
            </label>
          )}

          {error && (
            <p className="admin-form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="admin-submit"
            disabled={busy || isLocked}
            type="submit"
          >
            {busy
              ? "Protegendo acesso…"
              : setupMode
                ? "Criar acesso seguro"
                : "Entrar no painel"}
          </button>

          <small className="admin-local-caveat">
            Esta versão usa proteção local. Limpar os dados do navegador remove
            a configuração e o histórico deste aparelho.
          </small>
        </form>
      </section>
    </main>
  );
}
