import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ClipboardCheck,
  Download,
  FileText,
  History,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { closingRepository } from "./data/closingRepository";
import type {
  BreadCount,
  ClosingCounts,
  ClosingDraft,
  ClosingStep,
  CountKey,
  StoredClosing,
  StoredDocument
} from "./data/models";
import { calculatePhysicalMovement, reconcileClosing } from "./domain/closing";
import { canReviewReport } from "./features/closing/reportReadiness";
import {
  extractDocument,
  isTrustworthyExtraction,
  validateDocumentFile
} from "./import/documentExtractor";
import {
  parseReport,
  type ParsedReportItem,
  type ReportCategory
} from "./import/reportParser";
import "./styles/global.css";
import "./styles/ocr.css";

type Step = "home" | ClosingStep | "done";

const INITIAL_COUNTS: ClosingCounts = {
  opening: { q30: 0, q15: 0 },
  produced: { q30: 0, q15: 0 },
  waste: { q30: 0, q15: 0 },
  courtesy: { q30: 0, q15: 0 },
  leftover: { q30: 0, q15: 0 }
};

const COUNT_LABELS: Record<CountKey, { eyebrow: string; title: string; tone: string }> = {
  opening: { eyebrow: "A", title: "Abertura", tone: "blue" },
  produced: { eyebrow: "B", title: "Assados hoje", tone: "yellow" },
  waste: { eyebrow: "C", title: "Desperdícios", tone: "red" },
  courtesy: { eyebrow: "D", title: "Cortesias", tone: "sky" },
  leftover: { eyebrow: "E", title: "Sobra final", tone: "ink" }
};

const REPORT_FIELDS = [
  { id: "smart", label: "Subs Smart", factor: 0.5 },
  { id: "super", label: "Subs Super", factor: 1 },
  { id: "comboSmart", label: "Combos Smart", factor: 0.5 },
  { id: "comboSuper", label: "Combos Super", factor: 1 },
  { id: "integrator", label: "Integrador padrão (confirmar)", factor: 0.5 }
] as const;

const CATEGORY_OPTIONS: { value: ReportCategory; label: string; factor: number }[] = [
  { value: "smart", label: "Smart", factor: 0.5 },
  { value: "super", label: "Super", factor: 1 },
  { value: "combo-smart", label: "Combo Smart", factor: 0.5 },
  { value: "combo-super", label: "Combo Super", factor: 1 }
];

function equivalent(value: BreadCount) {
  return value.q30 + value.q15 * 0.5;
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function defaultShift() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false
    }).format(new Date())
  );
  return hour < 12 ? "Manhã" : hour < 18 ? "Tarde" : "Noite";
}

function reportTotals(items: ParsedReportItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((result, item) => {
    const key =
      item.category === "combo-smart"
        ? "comboSmart"
        : item.category === "combo-super"
          ? "comboSuper"
          : item.category;
    result[key] = (result[key] ?? 0) + item.quantity;
    return result;
  }, {});
}

function safeNonNegative(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const formulaSafe =
    typeof value === "string" && /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

export function App() {
  const [step, setStep] = useState<Step>("home");
  const [draftStep, setDraftStep] = useState<ClosingStep>("identity");
  const [history, setHistory] = useState<StoredClosing[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | StoredClosing["status"]>("all");
  const [closingId, setClosingId] = useState<string>(() => crypto.randomUUID());
  const [revision, setRevision] = useState(1);
  const [correctsId, setCorrectsId] = useState<string>();
  const [responsible, setResponsible] = useState("");
  const [unit, setUnit] = useState("Shopping da Ilha");
  const [shift, setShift] = useState(defaultShift);
  const [date, setDate] = useState(todayInSaoPaulo);
  const [counts, setCounts] = useState<ClosingCounts>(INITIAL_COUNTS);
  const [report, setReport] = useState<Record<string, number>>({});
  const [reportMode, setReportMode] = useState<"file" | "manual">("file");
  const [documentName, setDocumentName] = useState("");
  const [sourceDocument, setSourceDocument] = useState<StoredDocument>();
  const [justification, setJustification] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedReportItem[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const uploadSequence = useRef(0);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let mounted = true;
    void Promise.all([closingRepository.list(), closingRepository.getDraft()])
      .then(([records, draft]) => {
        if (!mounted) return;
        setHistory(records);
        if (draft) {
          setClosingId(draft.closingId);
          setRevision(draft.revision ?? 1);
          setCorrectsId(draft.correctsId);
          setDraftStep(draft.step);
          setResponsible(draft.responsible);
          setUnit(draft.unit);
          setShift(draft.shift);
          setDate(draft.date);
          setCounts(draft.counts);
          setReport(draft.report);
          setReportMode(draft.reportMode);
          setDocumentName(draft.documentName);
          setSourceDocument(draft.document);
          setParsedItems(draft.parsedItems);
          setReviewConfirmed(draft.reviewConfirmed);
          setJustification(draft.justification);
          setHasDraft(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError("Não conseguimos abrir o armazenamento local. Recarregue a página antes de iniciar.");
        }
      })
      .finally(() => {
        if (mounted) setStorageReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || step === "home" || step === "done") return;
    setAutoSaveState("saving");
    const timer = window.setTimeout(() => {
      const draft: ClosingDraft = {
        id: "active",
        closingId,
        revision,
        correctsId,
        step,
        responsible,
        unit,
        shift,
        date,
        counts,
        report,
        reportMode,
        documentName,
        document: sourceDocument,
        parsedItems,
        reviewConfirmed,
        justification,
        updatedAt: new Date().toISOString()
      };
      void closingRepository
        .saveDraft(draft)
        .then(() => {
          setHasDraft(true);
          setDraftStep(step);
          setAutoSaveState("saved");
          setStorageError("");
        })
        .catch(() => {
          setAutoSaveState("idle");
          setStorageError("O rascunho não foi salvo. Mantenha esta tela aberta e tente recarregar.");
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    closingId,
    correctsId,
    counts,
    date,
    documentName,
    justification,
    parsedItems,
    report,
    reportMode,
    responsible,
    revision,
    reviewConfirmed,
    shift,
    sourceDocument,
    step,
    storageReady,
    unit
  ]);

  const physical = useMemo(
    () =>
      calculatePhysicalMovement({
        opening: equivalent(counts.opening),
        produced: equivalent(counts.produced),
        waste: equivalent(counts.waste),
        courtesy: equivalent(counts.courtesy),
        finalStock: equivalent(counts.leftover)
      }),
    [counts]
  );

  const system = useMemo(
    () =>
      REPORT_FIELDS.reduce(
        (total, field) => total + (report[field.id] ?? 0) * field.factor,
        0
      ),
    [report]
  );

  const difference = system - physical;
  const physicalIsValid = physical >= 0;
  const status: StoredClosing["status"] = physicalIsValid
    ? reconcileClosing(physical, system).status
    : "critical";
  const extractionIsTrustworthy = isTrustworthyExtraction(
    parsedItems,
    sourceDocument?.ocrConfidence
  );
  const reportReady =
    physicalIsValid &&
    canReviewReport({
      mode: reportMode,
      documentName,
      parsedItemCount: parsedItems.length,
      systemEquivalent: system,
      reviewConfirmed
    });

  const progress =
    step === "identity"
      ? 20
      : step === "physical"
        ? 40
        : step === "report"
          ? 65
          : step === "review"
            ? 88
            : 100;

  function resetForm() {
    setClosingId(crypto.randomUUID());
    setRevision(1);
    setCorrectsId(undefined);
    setCounts(INITIAL_COUNTS);
    setReport({});
    setReportMode("file");
    setDocumentName("");
    setSourceDocument(undefined);
    setParsedItems([]);
    setReviewConfirmed(false);
    setJustification("");
    setResponsible("");
    setOcrError("");
    setSaveError("");
  }

  async function startClosing() {
    if (
      hasDraft &&
      !window.confirm("Começar um novo fechamento apagará o rascunho atual. Deseja continuar?")
    ) return;
    try {
      await closingRepository.clearDraft();
      resetForm();
      setHasDraft(false);
      setStep("identity");
    } catch {
      setStorageError("Não foi possível limpar o rascunho anterior. Recarregue e tente novamente.");
    }
  }

  function resumeClosing() {
    setStep(draftStep);
  }

  async function startCorrection(item: StoredClosing) {
    if (
      hasDraft &&
      !window.confirm("Criar a correção apagará o rascunho atual. Deseja continuar?")
    ) return;
    try {
      await closingRepository.clearDraft();
      setClosingId(crypto.randomUUID());
      setRevision((item.revision ?? 1) + 1);
      setCorrectsId(item.id);
      setResponsible("");
      setUnit(item.unit);
      setShift(item.shift);
      setDate(item.date);
      setCounts(item.counts);
      setReport(item.report);
      setReportMode(item.reportMode);
      setDocumentName(item.document?.name ?? "");
      setSourceDocument(item.document);
      setParsedItems(item.parsedItems);
      setReviewConfirmed(item.reportMode === "file");
      setJustification(item.justification);
      setHasDraft(false);
      setSaveError("");
      setStep("identity");
    } catch {
      setStorageError("Não foi possível iniciar a correção. Recarregue e tente novamente.");
    }
  }

  function goBack() {
    const previous: Record<ClosingStep, Step> = {
      identity: "home",
      physical: "identity",
      report: "physical",
      review: "report"
    };
    if (step === "done") setStep("home");
    else if (step !== "home") setStep(previous[step]);
  }

  function updateCount(key: CountKey, size: keyof BreadCount, value: string) {
    setCounts((current) => ({
      ...current,
      [key]: { ...current[key], [size]: safeNonNegative(value) }
    }));
  }

  function updateParsedItem(
    index: number,
    changes: Partial<Pick<ParsedReportItem, "quantity" | "category">>
  ) {
    setParsedItems((current) => {
      const next = current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const category = changes.category ?? item.category;
        const quantity = changes.quantity ?? item.quantity;
        const factor = CATEGORY_OPTIONS.find((option) => option.value === category)?.factor ?? 1;
        return {
          ...item,
          category,
          quantity,
          breadFactor: factor,
          breadEquivalent: quantity * factor
        };
      });
      setReport(reportTotals(next));
      return next;
    });
    setReviewConfirmed(false);
  }

  function useManualReport() {
    uploadSequence.current += 1;
    setReportMode("manual");
    setOcrProgress(0);
  }

  async function handleDocument(file?: File) {
    if (!file) return;
    const uploadId = ++uploadSequence.current;

    try {
      validateDocumentFile(file);
    } catch (error) {
      setDocumentName("");
      setSourceDocument(undefined);
      setParsedItems([]);
      setReport({});
      setReviewConfirmed(false);
      setOcrProgress(0);
      setOcrError(error instanceof Error ? error.message : "Arquivo inválido.");
      return;
    }

    setDocumentName(file.name);
    setSourceDocument({
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      warnings: []
    });
    setOcrError("");
    setParsedItems([]);
    setReport({});
    setReviewConfirmed(false);
    setOcrProgress(1);

    try {
      const extraction = await extractDocument(file, (message, progressValue) => {
        if (uploadSequence.current !== uploadId) return;
        setOcrMessage(message);
        setOcrProgress(progressValue);
      });
      if (uploadSequence.current !== uploadId) return;

      const parsed = parseReport(extraction.text);
      const documentData: StoredDocument = {
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
        source: extraction.source,
        pageCount: extraction.pageCount,
        ocrConfidence: extraction.ocrConfidence,
        warnings: [...extraction.warnings, ...parsed.warnings]
      };
      setSourceDocument(documentData);
      if (!parsed.success) {
        setOcrError("Nenhum item foi reconhecido com segurança. Tire outra foto ou digite os totais.");
        return;
      }
      setParsedItems(parsed.items);
      setReport(reportTotals(parsed.items));
      if (!isTrustworthyExtraction(parsed.items, extraction.ocrConfidence)) {
        setOcrError("Leitura com baixa confiança: confira cada linha e corrija quantidade ou categoria.");
      }
    } catch (error) {
      if (uploadSequence.current !== uploadId) return;
      setOcrError(error instanceof Error ? error.message : "Não foi possível ler este arquivo.");
    } finally {
      if (uploadSequence.current === uploadId) setOcrProgress(100);
    }
  }
  async function finalize() {
    if (savingLock.current) return;
    savingLock.current = true;
    setSaving(true);
    setSaveError("");
    const record: StoredClosing = {
      id: closingId,
      revision,
      correctsId,
      catalogVersion: "V5",
      date,
      shift,
      unit,
      responsible: responsible.trim(),
      counts,
      report,
      reportMode,
      parsedItems,
      document: sourceDocument,
      physical,
      system,
      difference,
      status,
      justification: justification.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await closingRepository.finalize(record);
      setHistory(await closingRepository.list());
      setHasDraft(false);
      setStep("done");
    } catch {
      setSaveError("Não foi possível salvar. Seus dados continuam nesta tela; toque em tentar novamente.");
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  function exportCsv() {
    const header = [
      "id",
      "data",
      "turno",
      "unidade",
      "responsavel",
      "consumo_fisico",
      "venda_sistema",
      "diferenca",
      "status",
      "justificativa",
      "catalogo"
    ];
    const rows = history.map((item) =>
      [
        item.id,
        item.date,
        item.shift,
        item.unit,
        item.responsible,
        item.physical,
        item.system,
        item.difference,
        item.status,
        item.justification,
        item.catalogVersion
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roys-fechamentos-${todayInSaoPaulo()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadOriginal(item: StoredClosing) {
    if (!item.document) return;
    const url = URL.createObjectURL(item.document.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = item.document.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (step === "home") {
    const balancedCount = history.filter((item) => item.status === "balanced").length;
    const explainedCount = history.filter(
      (item) => item.status !== "balanced" && item.justification
    ).length;
    const wasteTotal = history.reduce(
      (total, item) => total + equivalent(item.counts?.waste ?? { q30: 0, q15: 0 }),
      0
    );
    const normalizedQuery = historyQuery.trim().toLocaleLowerCase("pt-BR");
    const visibleHistory = history.filter((item) => {
      const matchesStatus = historyStatus === "all" || item.status === historyStatus;
      const matchesQuery =
        !normalizedQuery ||
        [item.responsible, item.unit, item.date, item.shift]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });

    return (
      <main className="app-shell home-shell">
        <header className="brand-bar">
          <img src="brand/logo-primary-black.png" alt="Roy's Sandwich Shop" />
          <span>Controle interno • V2</span>
        </header>

        {storageError && <div className="system-alert">{storageError}</div>}

        <section className="hero">
          <div className="hero-copy">
            <div className="kicker"><span /> Fechamento simples, conferência segura</div>
            <h1 aria-label="Fechamento de Pães">Fechamento<br /><em>de Pães</em></h1>
            <p>Conte, confira e finalize. O sistema mostra somente o que precisa da sua atenção.</p>
            {hasDraft ? (
              <div className="hero-actions">
                <button className="primary-action" onClick={resumeClosing}>
                  Continuar rascunho <RefreshCw aria-hidden />
                </button>
                <button className="secondary-action" onClick={() => void startClosing()}>Começar novo</button>
              </div>
            ) : (
              <button className="primary-action" disabled={!storageReady || Boolean(storageError)} onClick={() => void startClosing()}>
                Começar fechamento <ArrowRight aria-hidden />
              </button>
            )}
          </div>
          <div className="hero-visual" aria-hidden>
            <img src="brand/steak-hero.jpg" alt="" />
            <div className="hero-stamp"><ClipboardCheck /><b>5 etapas</b><span>rápidas</span></div>
          </div>
        </section>

        <section className="today-strip" aria-label="Resumo real do aparelho">
          <article><PackageCheck /><div><strong>{history.length}</strong><span>fechamentos concluídos</span></div></article>
          <article><ShieldCheck /><div><strong>{balancedCount}</strong><span>sem diferença</span></div></article>
          <article><Sparkles /><div><strong>{explainedCount}</strong><span>ocorrências explicadas</span></div></article>
          <article><TriangleAlert /><div><strong>{wasteTotal}</strong><span>pães em desperdício</span></div></article>
        </section>

        <section className="recent">
          <div className="section-title">
            <div><span>Histórico local auditável</span><h2>Últimos fechamentos</h2></div>
            <div className="title-actions">
              {history.length > 0 && <button className="icon-button" onClick={exportCsv} aria-label="Exportar CSV"><Download /></button>}
              <History aria-hidden />
            </div>
          </div>
          {history.length > 0 && (
            <div className="history-filters">
              <label>Buscar<input type="search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Nome, unidade, data ou turno" /></label>
              <label>Status<select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value as typeof historyStatus)}><option value="all">Todos</option><option value="balanced">Sem diferença</option><option value="attention">Atenção</option><option value="critical">Crítico</option></select></label>
            </div>
          )}
          {history.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon"><FileText /></div>
              <h3>Seu primeiro fechamento começa aqui</h3>
              <p>O rascunho é salvo neste aparelho a cada etapa e pode ser retomado.</p>
            </div>
          ) : (
            <div className="history-list">
              {visibleHistory.map((item) => (
                <details key={item.id} className="history-detail">
                  <summary>
                    <span className={`status-dot ${item.status}`} />
                    <div><b>{item.unit}</b><small>{item.date} • {item.shift} • {item.responsible}</small></div>
                    <strong>{item.difference > 0 ? "+" : ""}{item.difference}</strong>
                  </summary>
                  <div className="audit-grid">
                    <p><span>Consumo físico</span><b>{item.physical}</b></p>
                    <p><span>Venda sistema</span><b>{item.system}</b></p>
                    <p><span>Catálogo</span><b>{item.catalogVersion}</b></p>
                    <p><span>Revisão</span><b>#{item.revision}</b></p>
                  </div>
                  {item.migrationWarning && <p className="audit-note"><b>Aviso:</b> {item.migrationWarning}</p>}
                  {item.correctsId && <p className="audit-note"><b>Corrige:</b> {item.correctsId}</p>}
                  {item.justification && <p className="audit-note"><b>Explicação:</b> {item.justification}</p>}
                  <div className="audit-actions">
                    {item.document && (
                      <button className="text-button" onClick={() => downloadOriginal(item)}>
                        <Download /> Baixar original
                      </button>
                    )}
                    <button className="text-button" onClick={() => void startCorrection(item)}>
                      <RefreshCw /> Criar correção
                    </button>
                  </div>
                </details>
              ))}
            </div>
          )}
          {history.length > 0 && visibleHistory.length === 0 && (
            <div className="empty-card"><h3>Nenhum fechamento encontrado</h3><p>Limpe a busca ou escolha outro status.</p></div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell flow-shell">
      <header className="flow-header">
        <button className="icon-button" onClick={goBack} aria-label="Voltar"><ArrowLeft /></button>
        <img src="brand/logo-primary-black.png" alt="Roy's" />
        <span>{progress}%</span>
      </header>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      {step !== "done" && (
        <div className={`autosave ${autoSaveState}`} aria-live="polite">
          {autoSaveState === "saving" ? "Salvando…" : autoSaveState === "saved" ? "Rascunho salvo" : ""}
        </div>
      )}
      {storageError && <div className="system-alert compact">{storageError}</div>}

      {step === "identity" && (
        <section className="flow-page">
          <div className="step-mark">01 • Preparar</div>
          <h1 aria-label="Quem está fechando?">Quem está<br /><em>fechando?</em></h1>
          <p className="lead">Data e turno já vêm prontos. Confira e siga.</p>
          <div className="form-card">
            <label>Responsável
              <input autoFocus value={responsible} onChange={(event) => setResponsible(event.target.value)} placeholder="Digite seu nome" />
            </label>
            <div className="two-cols">
              <label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label>Turno<select value={shift} onChange={(event) => setShift(event.target.value)}><option>Manhã</option><option>Tarde</option><option>Noite</option></select></label>
            </div>
            <label>Unidade<select value={unit} onChange={(event) => setUnit(event.target.value)}><option>Shopping da Ilha</option><option>Shopping Rio Anil</option></select></label>
          </div>
          <button className="primary-action sticky-action" disabled={!responsible.trim()} onClick={() => setStep("physical")}>
            Continuar <ArrowRight />
          </button>
        </section>
      )}

      {step === "physical" && (
        <section className="flow-page">
          <div className="step-mark">02 • Contar</div>
          <h1 aria-label="Movimento dos pães">Movimento<br /><em>dos pães</em></h1>
          <p className="lead">Informe somente as quantidades. O resultado fica escondido até a revisão.</p>
          <div className="count-grid">
            {(Object.keys(COUNT_LABELS) as CountKey[]).map((key) => (
              <article className={`count-card ${COUNT_LABELS[key].tone}`} key={key}>
                <div className="count-title"><span>{COUNT_LABELS[key].eyebrow}</span><b>{COUNT_LABELS[key].title}</b></div>
                <label><span>30 cm</span><input type="number" min="0" inputMode="decimal" value={counts[key].q30 || ""} onChange={(event) => updateCount(key, "q30", event.target.value)} placeholder="0" /></label>
                <label><span>15 cm</span><input type="number" min="0" inputMode="decimal" value={counts[key].q15 || ""} onChange={(event) => updateCount(key, "q15", event.target.value)} placeholder="0" /></label>
              </article>
            ))}
          </div>
          {!physicalIsValid && <p className="ocr-warning">A sobra, cortesia e perda não podem superar a abertura mais os assados. Revise as contagens.</p>}
          <button className="primary-action sticky-action" disabled={!physicalIsValid} onClick={() => setStep("report")}>Conferir relatório <ArrowRight /></button>
        </section>
      )}

      {step === "report" && (
        <section className="flow-page">
          <div className="step-mark">03 • Importar</div>
          <h1>Relatório<br /><em>de vendas</em></h1>
          <p className="lead">Envie o arquivo ou lance os totais. Você sempre revisa antes de concluir.</p>
          <div className="mode-tabs">
            <button className={reportMode === "file" ? "active" : ""} onClick={() => setReportMode("file")}><Camera /> Foto ou PDF</button>
            <button className={reportMode === "manual" ? "active" : ""} onClick={useManualReport}><FileText /> Digitar totais</button>
          </div>
          {reportMode === "file" ? (
            <div className="upload-card">
              <div className="scan-frame"><span /><Upload /><b>{documentName || "Enquadre a folha inteira"}</b><small>Boa luz • celular reto • sem reflexo</small></div>
              <div className="upload-actions">
                <label className="file-button"><Camera /> Tirar foto<input type="file" accept="image/*" capture="environment" onChange={(event) => void handleDocument(event.target.files?.[0])} /></label>
                <label className="file-button secondary"><Upload /> Escolher arquivo<input type="file" accept="image/*,application/pdf" onChange={(event) => void handleDocument(event.target.files?.[0])} /></label>
              </div>
              {ocrProgress > 0 && ocrProgress < 100 && <div className="ocr-progress"><span style={{ width: `${ocrProgress}%` }} /><small>{ocrMessage}</small></div>}
              {parsedItems.length > 0 && (
                <div className="detected-list editable">
                  <div className="detected-heading">
                    <b>{parsedItems.length} itens detectados</b>
                    <span className={extractionIsTrustworthy ? "trust-ok" : "trust-low"}>
                      {extractionIsTrustworthy ? "confiança adequada" : "revisão reforçada"}
                    </span>
                  </div>
                  {parsedItems.map((item, index) => (
                    <div className="detected-row" key={`${item.productId}-${item.evidence.lineNumber}-${index}`}>
                      <div><b>{item.productName}</b><small>Linha {item.evidence.lineNumber}: {item.evidence.rawLine}</small></div>
                      <select aria-label={`Categoria de ${item.productName}`} value={item.category} onChange={(event) => updateParsedItem(index, { category: event.target.value as ReportCategory })}>
                        {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <label><span>Qtd.</span><input aria-label={`Quantidade de ${item.productName}`} type="number" min="1" inputMode="numeric" value={item.quantity} onChange={(event) => updateParsedItem(index, { quantity: Math.max(1, Math.floor(safeNonNegative(event.target.value, 1))) })} /></label>
                      <small className="confidence">{Math.round(item.confidence * 100)}%</small>
                    </div>
                  ))}
                  <label className={`review-check ${!extractionIsTrustworthy ? "required" : ""}`}>
                    <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} />
                    <span><b>Conferi todos os itens</b><small>Produto, tamanho/categoria e quantidade estão iguais ao relatório.</small></span>
                  </label>
                </div>
              )}
              {sourceDocument?.warnings.map((warning) => <p className="ocr-note" key={warning}>{warning}</p>)}
              {ocrError && <p className="ocr-warning">{ocrError}</p>}
              <button className="text-button" onClick={useManualReport}>Prefiro digitar os totais</button>
            </div>
          ) : (
            <div className="report-list">
              {REPORT_FIELDS.map((field) => (
                <label key={field.id}><div><b>{field.label}</b><small>{field.factor === 0.5 ? "½ pão por unidade" : "1 pão por unidade"}</small></div>
                  <input type="number" min="0" inputMode="numeric" placeholder="0" value={report[field.id] || ""} onChange={(event) => setReport((current) => ({ ...current, [field.id]: safeNonNegative(event.target.value) }))} />
                </label>
              ))}
            </div>
          )}
          <button className="primary-action sticky-action" disabled={!reportReady} onClick={() => setStep("review")}>Revisar fechamento <ArrowRight /></button>
        </section>
      )}

      {step === "review" && (
        <section className="flow-page review-page">
          <div className="step-mark">04 • Revisar</div>
          <h1>Está tudo<br /><em>bem explicado</em></h1>
          <div className={`result-panel ${status}`}>
            <span>{status === "balanced" ? "Tudo certo" : status === "attention" ? "Vale conferir" : "Atenção necessária"}</span>
            <strong>{difference > 0 ? "+" : ""}{difference}</strong>
            <small>equivalente de pão (venda − consumo)</small>
            <div><p><b>{physical}</b><span>consumo físico</span></p><p><b>{system}</b><span>venda no sistema</span></p></div>
          </div>
          {status !== "balanced" && (
            <label className="justification">O que aconteceu?
              <textarea value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="Ex.: pão descartado por avaria ainda não lançado..." />
              <small>Uma frase clara já resolve.</small>
            </label>
          )}
          {saveError && <p className="ocr-warning">{saveError}</p>}
          <button className="primary-action sticky-action" disabled={saving || (status !== "balanced" && justification.trim().length < 8)} onClick={() => void finalize()}>
            {saving ? "Salvando…" : saveError ? "Tentar novamente" : "Finalizar fechamento"} <Check />
          </button>
        </section>
      )}

      {step === "done" && (
        <section className="flow-page done-page">
          <div className="done-burst"><span /><Check /></div>
          <div className="step-mark">05 • Pronto</div>
          <h1 aria-label="Fechamento concluído">Fechamento<br /><em>concluído!</em></h1>
          <p>Registro salvo com dados de auditoria e arquivo original. <b>Processo completo e rastreável.</b></p>
          <button className="primary-action" onClick={() => setStep("home")}>Voltar ao início <ArrowRight /></button>
        </section>
      )}
    </main>
  );
}