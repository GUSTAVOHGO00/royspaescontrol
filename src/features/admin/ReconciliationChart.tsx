import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { StoredClosing } from "../../data/models";
import { dailyWorstSeries } from "./adminMetrics";
import "./reconciliationChart.css";

interface ReconciliationChartProps {
  records: readonly StoredClosing[];
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function tone(record: StoredClosing) {
  if (record.difference === 0) return "matched";
  return record.difference > 0 ? "positive" : "negative";
}

function accessibleLabel(record: StoredClosing): string {
  const meaning =
    record.difference === 0
      ? "Diferença zero"
      : record.difference > 0
        ? "Diferença positiva"
        : "Diferença negativa";
  return `${meaning} em ${formatShortDate(record.date)}: ${formatNumber(record.difference)} pão equivalente`;
}

export function ReconciliationChart({
  records,
}: ReconciliationChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const series = useMemo(() => dailyWorstSeries(records), [records]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = series.find((record) => record.id === selectedId);
  const maximum = Math.max(
    1,
    ...series.map((record) => Math.abs(record.difference)),
  );

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setSelectedId(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }

    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (series.length === 0) {
    return (
      <div className="reconciliation-empty">
        <strong>Nenhum fechamento neste período</strong>
        <span>Altere os filtros ou faça o primeiro lançamento.</span>
      </div>
    );
  }

  return (
    <div className="reconciliation-chart" ref={rootRef}>
      <div className="chart-axis-label chart-axis-top">
        +{formatNumber(maximum)}
      </div>
      <div className="chart-axis-label chart-axis-zero">Meta 0</div>
      <div className="chart-axis-label chart-axis-bottom">
        −{formatNumber(maximum)}
      </div>
      <div className="chart-grid-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div
        className="chart-bars"
        style={{ "--chart-columns": series.length } as CSSProperties}
      >
        {series.map((record) => {
          const selectedBar = record.id === selectedId;
          const size = Math.max(
            record.difference === 0 ? 2.5 : 7,
            (Math.abs(record.difference) / maximum) * 43,
          );

          return (
            <div className="chart-bar-column" key={record.id}>
              <button
                aria-label={accessibleLabel(record)}
                aria-pressed={selectedBar}
                className={`chart-bar-button ${tone(record)} ${selectedBar ? "selected" : ""}`}
                onClick={() =>
                  setSelectedId((current) =>
                    current === record.id ? null : record.id,
                  )
                }
                style={{ "--bar-size": `${size}%` } as CSSProperties}
                type="button"
              >
                <span className="chart-bar-fill" />
                <span className="chart-bar-date">
                  {record.date.slice(-2)}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <aside className="chart-tooltip" role="status">
          <div className="chart-tooltip-heading">
            <span>{formatShortDate(selected.date)}</span>
            <strong>
              {selected.unit} · {selected.shift}
            </strong>
          </div>
          <div className="chart-tooltip-values">
            <p>
              <span>Manual</span>
              <b>{formatNumber(selected.physical)}</b>
            </p>
            <p>
              <span>Sistema</span>
              <b>{formatNumber(selected.system)}</b>
            </p>
            <p className={tone(selected)}>
              <span>Diferença</span>
              <b>
                {selected.difference > 0 ? "+" : ""}
                {formatNumber(selected.difference)}
              </b>
            </p>
          </div>
          <div className={`chart-tooltip-result ${tone(selected)}`}>
            {selected.difference === 0
              ? "Bateu exatamente — fechamento correto"
              : selected.difference > 0
                ? "Não bateu — o sistema está acima da conferência manual"
                : "Não bateu — a conferência manual está acima do sistema"}
          </div>
        </aside>
      )}
    </div>
  );
}
