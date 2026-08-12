import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw, ShieldOff, ShieldCheck, UserPlus, Users } from "lucide-react";
import { unitRepository, type Employee, type StoreAccess, type Unit } from "../../data/unitRepository";

export function AccessManagement() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [accesses, setAccesses] = useState<StoreAccess[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [employee, setEmployee] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (selected: string) => {
    if (!selected) return;
    const [nextAccesses, nextEmployees] = await Promise.all([
      unitRepository.listStoreAccesses(selected), unitRepository.listEmployees(selected),
    ]);
    setAccesses(nextAccesses); setEmployees(nextEmployees);
  }, []);

  useEffect(() => { void unitRepository.listUnits().then((data) => { setUnits(data); setUnitId(data[0]?.id ?? ""); }); }, []);
  useEffect(() => { void refresh(unitId).catch(() => setMessage("Não foi possível carregar esta loja.")); }, [refresh, unitId]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); await refresh(unitId); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação."); }
    finally { setBusy(false); }
  }

  function createAccess(event: FormEvent) {
    event.preventDefault();
    void run(() => unitRepository.createStoreAccess({ unitId, username, password }), "Acesso compartilhado criado com sucesso.").then(() => setPassword(""));
  }
  function addEmployee(event: FormEvent) {
    event.preventDefault();
    void run(() => unitRepository.createEmployee(unitId, employee, "admin"), "Funcionário cadastrado com sucesso.").then(() => setEmployee(""));
  }
  function resetPassword(profileId: string) {
    const next = window.prompt("Digite a nova senha da loja (mínimo de 10 caracteres):");
    if (!next) return;
    if (next.length < 10) { setMessage("A nova senha precisa ter pelo menos 10 caracteres."); return; }
    void run(() => unitRepository.resetStorePassword(profileId, next), "Senha da loja alterada com sucesso.");
  }

  return <section className="admin-settings-card access-management">
    <span>Lojas e equipe</span><h2>Gestão de acessos</h2>
    <p>Escolha uma loja para definir o login compartilhado e manter a lista de quem pode realizar o fechamento.</p>
    <label className="access-unit">Unidade<select value={unitId} onChange={(event) => setUnitId(event.target.value)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    <div className="access-management-grid">
      <article><KeyRound aria-hidden="true"/><h3>Acesso da loja</h3>
        {accesses.length === 0 ? <form onSubmit={createAccess}><label>Login<input value={username} onChange={(event) => setUsername(event.target.value)} required pattern="[A-Za-z0-9._-]{3,32}" /></label><label>Senha inicial<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button disabled={busy}>Criar acesso</button></form> : accesses.map((access) => <div className="access-row" key={access.profileId}><div><b>{access.username}</b><small>{access.active ? "Acesso liberado" : "Acesso bloqueado"}</small></div><button onClick={() => resetPassword(access.profileId)} title="Trocar senha"><RefreshCw/></button><button onClick={() => void run(() => unitRepository.setStoreAccessActive(access.profileId, !access.active), access.active ? "Acesso bloqueado." : "Acesso liberado.")} title={access.active ? "Bloquear" : "Liberar"}>{access.active ? <ShieldOff/> : <ShieldCheck/>}</button></div>)}
      </article>
      <article><UserPlus aria-hidden="true"/><h3>Novo funcionário</h3><form onSubmit={addEmployee}><label>Nome completo<input minLength={2} value={employee} onChange={(event) => setEmployee(event.target.value)} required /></label><button disabled={busy}>Cadastrar funcionário</button></form></article>
    </div>
    <div className="employee-admin-list"><h3><Users/> Equipe desta loja</h3>{employees.length === 0 ? <p>Nenhum funcionário cadastrado.</p> : employees.map((person) => <div key={person.id}><span><b>{person.name}</b><small>{person.source === "store" ? "Cadastrado pela loja" : "Cadastrado pelo administrador"}</small></span><button onClick={() => void run(() => unitRepository.setEmployeeActive(person.id, !person.active), person.active ? "Funcionário desativado." : "Funcionário reativado.")}>{person.active ? "Desativar" : "Reativar"}</button></div>)}</div>
    {message && <p className="access-feedback" role="status">{message}</p>}
  </section>;
}
