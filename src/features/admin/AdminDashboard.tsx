import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FilePenLine,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Store,
  TriangleAlert,
  Wheat,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CountKey, StoredClosing } from "../../data/models";
import { OPERATIONAL_REPORT_ITEMS } from "../../domain/operationalCatalog";
import {
  effectiveClosings,
  filterClosings,
  monthlyMetrics,
} from "./adminMetrics";
import { touchAdminSession } from "./adminAuth";
import { ReconciliationChart } from "./ReconciliationChart";
import "./adminDashboard.css";
import "./adminAuditTools.css";
import "./adminManagement.css";
import { AccessManagement } from "./AccessManagement";

type AdminView = "overview" | "closings" | "audit" | "settings";

interface AdminDashboardProps {
  records: readonly StoredClosing[];
  onBack: () => void;
  onCorrect: (record: StoredClosing) => void;
  onLogout: () => void;
}

function latestMonth(records: readonly StoredClosing[]): string {
  return (
    [...records]
      .map((record) => record.date.slice(0, 7))
      .sort()
      .at(-1) ??
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    }).format(new Date())
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatRate(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  if (!year || !month) return "Todos os meses";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

const RAW_COUNT_LABELS: Record<CountKey, string> = {
  opening: "Abertura",
  produced: "Assados",
  waste: "Desperdícios",
  courtesy: "Cortesias",
  leftover: "Sobra final",
};

function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function differenceTone(record: StoredClosing) {
  if (record.difference === 0) return "matched";
  return record.difference > 0 ? "positive" : "negative";
}

function differenceMessage(record: StoredClosing) {
  if (record.difference === 0) return "Bateu exatamente";
  return record.difference > 0 ? "Sistema acima" : "Manual acima";
}

const NAVIGATION: {
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "closings", label: "Fechamentos", icon: ClipboardList },
  { id: "audit", label: "Auditoria", icon: ShieldCheck },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function AdminDashboard({
  records,
  onBack,
  onCorrect,
  onLogout,
}: AdminDashboardProps) {
  const [view, setView] = useState<AdminView>("overview");
  const [month, setMonth] = useState(() => latestMonth(records));
  const [unit, setUnit] = useState("all");
  const [shift, setShift] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [revisionFilter, setRevisionFilter] = useState("all");
  const [responsibleQuery, setResponsibleQuery] = useState("");

  const units = useMemo(
    () => [...new Set(records.map((record) => record.unit))].sort(),
    [records],
  );
  const shifts = useMemo(
    () => [...new Set(records.map((record) => record.shift))].sort(),
    [records],
  );
  const baseFilteredRecords = useMemo(
    () => filterClosings(records, { month, unit, shift }),
    [month, records, shift, unit],
  );
  const effectiveBaseRecords = useMemo(
    () => effectiveClosings(baseFilteredRecords),
    [baseFilteredRecords],
  );
  const applyAdvancedFilters = (source: readonly StoredClosing[]) => {
    const query = responsibleQuery.trim().toLocaleLowerCase("pt-BR");
    return source.filter((record) => {
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      const matchesRevision =
        revisionFilter === "all" ||
        (revisionFilter === "original"
          ? !record.correctsId
          : Boolean(record.correctsId));
      const matchesResponsible =
        !query ||
        record.responsible.toLocaleLowerCase("pt-BR").includes(query);
      return matchesStatus && matchesRevision && matchesResponsible;
    });
  };
  const filteredRecords = useMemo(
    () => applyAdvancedFilters(baseFilteredRecords),
    [baseFilteredRecords, responsibleQuery, revisionFilter, statusFilter],
  );
  const effectiveRecords = useMemo(
    () => applyAdvancedFilters(effectiveBaseRecords),
    [effectiveBaseRecords, responsibleQuery, revisionFilter, statusFilter],
  );
  const metrics = useMemo(
    () => monthlyMetrics(effectiveRecords),
    [effectiveRecords],
  );

  useEffect(() => {
    let lastTouch = 0;
    const registerActivity = () => {
      const now = Date.now();
      if (now - lastTouch < 30_000) return;
      lastTouch = now;
      touchAdminSession();
    };
    document.addEventListener("pointerdown", registerActivity);
    document.addEventListener("keydown", registerActivity);
    window.addEventListener("scroll", registerActivity, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", registerActivity);
      document.removeEventListener("keydown", registerActivity);
      window.removeEventListener("scroll", registerActivity);
    };
  }, []);

  function exportAdminCsv() {
    touchAdminSession();
    const header = [
      "id", "data", "turno", "unidade", "responsavel", "manual", "sistema",
      "diferenca", "status", "revisao", "corrige_id", "justificativa",
    ];
    const rows = filteredRecords.map((record) =>
      [
        record.id, record.date, record.shift, record.unit, record.responsible,
        record.physical, record.system, record.difference, record.status,
        record.revision, record.correctsId ?? "", record.justification,
      ].map(csvCell).join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roys-fechamentos-${month || "todos"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadOriginal(record: StoredClosing) {
    if (!record.document) return;
    touchAdminSession();
    const url = URL.createObjectURL(record.document.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = record.document.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function changeView(next: AdminView) {
    touchAdminSession();
    setView(next);
  }

  function startCorrection(record: StoredClosing) {
    touchAdminSession();
    onCorrect(record);
  }

  return (
    <main className="admin-dashboard-shell">
      <aside className="admin-sidebar">
        <button
          aria-label="Voltar ao fechamento"
          className="admin-sidebar-back"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="admin-sidebar-brand">
          <img src="brand/logo-primary-transparent.png" alt="Roy's Sandwich Shop" />
          <div>
            <strong>Roy's Controle</strong>
            <span>Pães & operação</span>
          </div>
        </div>
        <span className="admin-nav-caption">Administração</span>
        <nav aria-label="Navegação administrativa" className="admin-nav">
          {NAVIGATION.map(({ id, label, icon: Icon }) => (
            <button
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "active" : ""}
              key={id}
              onClick={() => changeView(id)}
              type="button"
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={onLogout} type="button">
          <LogOut aria-hidden="true" />
          Encerrar sessão
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-main-header">
          <div>
            <span>Painel administrativo</span>
            <h1>
              {view === "overview"
                ? "Visão operacional"
                : view === "closings"
                  ? "Fechamentos"
                  : view === "audit"
                    ? "Trilha de auditoria"
                    : "Configurações"}
            </h1>
          </div>
          <div className="admin-period-badge">
            <CalendarRange aria-hidden="true" />
            <span>{formatMonth(month)}</span>
          </div>
        </header>

        {view !== "settings" && (
          <div className="admin-filter-bar">
            <label>
              <CalendarRange aria-hidden="true" />
              <span>Mês</span>
              <input
                aria-label="Filtrar por mês"
                onChange={(event) => {
                  touchAdminSession();
                  setMonth(event.target.value);
                }}
                type="month"
                value={month}
              />
            </label>
            <label>
              <Store aria-hidden="true" />
              <span>Unidade</span>
              <select
                aria-label="Filtrar por unidade"
                onChange={(event) => {
                  touchAdminSession();
                  setUnit(event.target.value);
                }}
                value={unit}
              >
                <option value="all">Todas as unidades</option>
                {units.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <Clock3 aria-hidden="true" />
              <span>Turno</span>
              <select
                aria-label="Filtrar por turno"
                onChange={(event) => {
                  touchAdminSession();
                  setShift(event.target.value);
                }}
                value={shift}
              >
                <option value="all">Todos os turnos</option>
                {shifts.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <ShieldCheck aria-hidden="true" />
              <span>Resultado</span>
              <select
                aria-label="Filtrar por resultado"
                onChange={(event) => {
                  touchAdminSession();
                  setStatusFilter(event.target.value);
                }}
                value={statusFilter}
              >
                <option value="all">Todos os resultados</option>
                <option value="balanced">Bateu em zero</option>
                <option value="attention">Atenção</option>
                <option value="critical">Crítico</option>
              </select>
            </label>
            <label>
              <FilePenLine aria-hidden="true" />
              <span>Tipo</span>
              <select
                aria-label="Filtrar por tipo de registro"
                onChange={(event) => {
                  touchAdminSession();
                  setRevisionFilter(event.target.value);
                }}
                value={revisionFilter}
              >
                <option value="all">Originais e correções</option>
                <option value="original">Somente originais</option>
                <option value="correction">Somente correções</option>
              </select>
            </label>
            <label>
              <ClipboardList aria-hidden="true" />
              <span>Responsável</span>
              <input
                aria-label="Filtrar por responsável"
                onChange={(event) => {
                  touchAdminSession();
                  setResponsibleQuery(event.target.value);
                }}
                placeholder="Buscar nome"
                type="search"
                value={responsibleQuery}
              />
            </label>
          </div>
        )}

        {view === "overview" && (
          <>
            <section className="admin-kpi-grid" aria-label="Indicadores do período">
              <article className="admin-kpi admin-kpi-primary">
                <ClipboardList aria-hidden="true" />
                <span>Fechamentos</span>
                <strong data-testid="admin-total">{metrics.total}</strong>
                <small>{metrics.corrections} correções administrativas</small>
              </article>
              <article className="admin-kpi">
                <CheckCircle2 aria-hidden="true" />
                <span>Bateram em zero</span>
                <strong data-testid="admin-matched">{metrics.matched}</strong>
                <small>{formatRate(metrics.matchedRate)} do período</small>
              </article>
              <article className="admin-kpi admin-kpi-positive">
                <ArrowUpRight aria-hidden="true" />
                <span>Diferença positiva</span>
                <strong data-testid="admin-positive">{metrics.positive}</strong>
                <small>Não bateu · sistema acima</small>
              </article>
              <article className="admin-kpi admin-kpi-negative">
                <ArrowDownRight aria-hidden="true" />
                <span>Diferença negativa</span>
                <strong>{metrics.negative}</strong>
                <small>Não bateu · manual acima</small>
              </article>
              <article className="admin-kpi admin-kpi-warning">
                <TriangleAlert aria-hidden="true" />
                <span>Críticos</span>
                <strong>{metrics.critical}</strong>
                <small>Exigem análise administrativa</small>
              </article>
              <article className="admin-kpi">
                <Wheat aria-hidden="true" />
                <span>Desperdício</span>
                <strong>{formatNumber(metrics.waste)}</strong>
                <small>pães equivalentes</small>
              </article>
            </section>

            <section className="admin-chart-card">
              <div className="admin-card-heading">
                <div>
                  <span>Meta operacional · diferença exatamente 0</span>
                  <h2>Conferência manual × sistema</h2>
                  <p>
                    Verde bateu; azul é diferença positiva; vermelho é
                    diferença negativa. Clique em uma barra para ver os valores.
                  </p>
                </div>
                <div className="admin-chart-legend" aria-label="Legenda">
                  <span><i className="matched" /> Bateu</span>
                  <span><i className="positive" /> Positiva</span>
                  <span><i className="negative" /> Negativa</span>
                </div>
              </div>
              <ReconciliationChart records={effectiveRecords} />
            </section>

            <ClosingTable
              records={effectiveRecords.slice().reverse().slice(0, 6)}
              title="Fechamentos recentes"
            />
          </>
        )}

        {view === "closings" && (
          <section className="admin-list-page">
            <div className="admin-list-intro">
              <div>
                <span>Registros efetivos</span>
                <h2>Fechamentos do período</h2>
              </div>
              <div className="admin-list-actions">
                <p>
                  A correção cria uma nova revisão. O lançamento original continua
                  guardado para auditoria.
                </p>
                <button onClick={exportAdminCsv} type="button">
                  <Download aria-hidden="true" />
                  Exportar CSV filtrado
                </button>
              </div>
            </div>
            {effectiveRecords.length === 0 ? (
              <AdminEmpty />
            ) : (
              <div className="admin-closing-cards">
                {effectiveRecords
                  .slice()
                  .reverse()
                  .map((record) => (
                    <article className="admin-closing-card" key={record.id}>
                      <div className={`admin-record-status ${differenceTone(record)}`}>
                        <span>{differenceMessage(record)}</span>
                        <strong>
                          {record.difference > 0 ? "+" : ""}
                          {formatNumber(record.difference)}
                        </strong>
                      </div>
                      <div className="admin-record-main">
                        <span>{record.date} · {record.shift}</span>
                        <h3>{record.unit}</h3>
                        <p>Responsável: {record.responsible}</p>
                      </div>
                      <div className="admin-record-values">
                        <p><span>Manual</span><b>{formatNumber(record.physical)}</b></p>
                        <p><span>Sistema</span><b>{formatNumber(record.system)}</b></p>
                        <p><span>Revisão</span><b>#{record.revision}</b></p>
                      </div>
                      <details className="admin-record-details">
                        <summary>Ver dados lançados e evidências</summary>
                        <div className="admin-raw-counts">
                          {(Object.keys(RAW_COUNT_LABELS) as CountKey[]).map((key) => (
                            <p key={key}>
                              <span>{RAW_COUNT_LABELS[key]}</span>
                              <b>30 cm: {record.counts[key].q30}</b>
                              <b>15 cm: {record.counts[key].q15}</b>
                            </p>
                          ))}
                        </div>
                        <div className="admin-raw-report">
                          {OPERATIONAL_REPORT_ITEMS.filter((item) => (record.report[item.id] ?? 0) > 0).map((item) => (
                            <p key={item.id}><span>{item.label}</span><b>{record.report[item.id]}</b></p>
                          ))}
                        </div>
                        {record.justification && (
                          <p className="admin-record-note"><b>Ocorrência:</b> {record.justification}</p>
                        )}
                        {record.document && (
                          <button onClick={() => downloadOriginal(record)} type="button">
                            <Download aria-hidden="true" />
                            Baixar {record.document.name}
                          </button>
                        )}
                      </details>
                      <button
                        className="admin-correct-button"
                        onClick={() => startCorrection(record)}
                        type="button"
                      >
                        <FilePenLine aria-hidden="true" />
                        Criar correção administrativa
                      </button>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}

        {view === "audit" && (
          <section className="admin-list-page">
            <div className="admin-list-intro">
              <div>
                <span>Originais + revisões</span>
                <h2>Histórico imutável</h2>
              </div>
              <p>
                Aqui aparecem todas as versões. Nenhum lançamento é substituído
                ou apagado.
              </p>
            </div>
            {filteredRecords.length === 0 ? (
              <AdminEmpty />
            ) : (
              <div className="admin-audit-list">
                {filteredRecords
                  .slice()
                  .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                  .map((record) => (
                    <article key={record.id}>
                      <span className={`admin-audit-line ${differenceTone(record)}`} />
                      <div>
                        <span>{record.date} · {record.shift} · {record.unit}</span>
                        <strong>{record.responsible}</strong>
                        <small>ID {record.id}</small>
                      </div>
                      <div>
                        <span>Versão</span>
                        <strong>#{record.revision}</strong>
                        <small>{record.createdByRole === "admin" ? "Administrador" : "Funcionária"}</small>
                      </div>
                      <div>
                        <span>Diferença</span>
                        <strong>{record.difference > 0 ? "+" : ""}{formatNumber(record.difference)}</strong>
                        <small>{record.correctsId ? `Corrige ${record.correctsId}` : "Registro original"}</small>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}

        {view === "settings" && (
          <>
          <AccessManagement />
          <section className="admin-settings-card">
            <div className="admin-settings-icon">
              <ShieldCheck aria-hidden="true" />
            </div>
            <span>Segurança na nuvem</span>
            <h2>Sessão administrativa protegida</h2>
            <p>
              A sessão expira após 15 minutos sem atividade. Cinco tentativas
              incorretas bloqueiam o acesso por cinco minutos.
            </p>
            <div className="admin-settings-facts">
              <p><span>Senha</span><strong>PBKDF2 + SHA-256</strong></p>
              <p><span>Armazenamento</span><strong>Somente hash e salt</strong></p>
              <p><span>Escopo</span><strong>Este navegador</strong></p>
            </div>
            <button onClick={onLogout} type="button">
              <LogOut aria-hidden="true" />
              Encerrar sessão agora
            </button>
          </section>
          </>
        )}
      </section>
    </main>
  );
}

function AdminEmpty() {
  return (
    <div className="admin-empty">
      <ClipboardList aria-hidden="true" />
      <strong>Nenhum fechamento neste filtro</strong>
      <span>Altere o mês, a unidade ou o turno.</span>
    </div>
  );
}

function ClosingTable({
  records,
  title,
}: {
  records: readonly StoredClosing[];
  title: string;
}) {
  return (
    <section className="admin-table-card">
      <div className="admin-card-heading compact">
        <div>
          <span>Acompanhamento</span>
          <h2>{title}</h2>
        </div>
      </div>
      {records.length === 0 ? (
        <AdminEmpty />
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Fechamento</th>
                <th>Manual</th>
                <th>Sistema</th>
                <th>Diferença</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.unit}</strong><span>{record.responsible}</span></td>
                  <td>{record.date}<span>{record.shift}</span></td>
                  <td>{formatNumber(record.physical)}</td>
                  <td>{formatNumber(record.system)}</td>
                  <td className={differenceTone(record)}>
                    {record.difference > 0 ? "+" : ""}
                    {formatNumber(record.difference)}
                  </td>
                  <td><span className={`admin-table-result ${differenceTone(record)}`}>{differenceMessage(record)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
