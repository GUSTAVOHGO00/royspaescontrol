import { AlertTriangle, ArrowLeft, LockKeyhole } from "lucide-react";
import { useEffect } from "react";

import "./finalConfirmation.css";

interface FinalConfirmationProps {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FinalConfirmation({
  open,
  saving,
  onCancel,
  onConfirm,
}: FinalConfirmationProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open, saving]);

  if (!open) return null;

  return (
    <div
      className="definitive-confirmation-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        aria-labelledby="definitive-confirmation-title"
        aria-modal="true"
        className="definitive-confirmation"
        role="dialog"
      >
        <div className="definitive-confirmation-icon">
          <AlertTriangle aria-hidden="true" />
        </div>
        <span className="definitive-confirmation-eyebrow">
          Última conferência
        </span>
        <h2 id="definitive-confirmation-title">
          Finalizar definitivamente?
        </h2>
        <p>
          Confira atentamente todas as informações. Depois de finalizar, este
          fechamento será definitivo para a equipe e somente um administrador
          poderá criar uma correção.
        </p>
        <div className="definitive-confirmation-warning">
          <LockKeyhole aria-hidden="true" />
          <span>
            A funcionária não poderá voltar, editar ou apagar este lançamento.
          </span>
        </div>
        <div className="definitive-confirmation-actions">
          <button
            className="definitive-secondary"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            <ArrowLeft aria-hidden="true" />
            Voltar e revisar
          </button>
          <button
            className="definitive-primary"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? "Finalizando…" : "Sim, finalizar definitivamente"}
          </button>
        </div>
      </section>
    </div>
  );
}
