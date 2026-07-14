import { useRef, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { useToast } from "./Toast";
import { copyToClipboard } from "../lib/clipboard";
import { formatApontamento } from "../lib/format";
import type { Item } from "../types";


interface OccurrencePanelProps {
  id: string;
  oi: number;
  totalOccs: number;
  item: Item;
  autoFocus?: boolean;
}

export function OccurrencePanel({
  id,
  oi,
  totalOccs,
  item,
  autoFocus,
}: OccurrencePanelProps) {
  const {
    marks,
    collapsed,
    partes,
    toggleCollapse,
    updateDetalhe,
    updateParte,
    removeOccurrence,
  } = useAppStore();
  const showToast = useToast();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const occs = marks[id] ?? [];
  const occ = occs[oi];
  if (!occ) return null;

  const isCollapsed = collapsed.has(`${id}::${oi}`);

  useEffect(() => {
    if (autoFocus && !isCollapsed && taRef.current) {
      taRef.current.focus();
    }
  }, [autoFocus, isCollapsed]);

  const handleCopy = () => {
    if (!occ.detalhe?.trim()) {
      if (isCollapsed) toggleCollapse(id, oi);
      showToast("Preencha o detalhamento antes de copiar");
      setTimeout(() => taRef.current?.focus(), 50);
      return;
    }
    copyToClipboard(formatApontamento(item, occ), () => {
      showToast("Copiado: 1 ocorrência");
    });
  };

  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    removeOccurrence(id, oi);
    showToast("Apontamento removido", {
      label: "Desfazer",
      onClick: () => useAppStore.getState().restoreUndo(),
    });
  };

  if (isCollapsed) {
    const preview =
      occ.detalhe?.trim() ||
      "(sem detalhamento preenchido — clique para editar)";
    return (
      <div
        className="detail-panel collapsed"
        onClick={() => toggleCollapse(id, oi)}
      >
        <div className="detail-panel-head">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
              minWidth: 0,
              cursor: "pointer",
            }}
          >
            <span className="collapse-chevron collapsed" />
            <label>
              {totalOccs > 1
                ? `Ocorrência ${oi + 1} de ${totalOccs}`
                : "Detalhamento (obrigatório)"}
            </label>
            <span
              className={`collapsed-preview ${occ.detalhe?.trim() ? "" : "empty"}`}
            >
              {preview}
            </span>
          </div>
          <button className="occ-remove" onClick={handleRemove}>
            Remover
          </button>
        </div>
      </div>
    );
  }

  const previewText = formatApontamento(item, occ);

  return (
    <div className="detail-panel">
      <div className="detail-panel-head">
        <label>
          {totalOccs > 1
            ? `Ocorrência ${oi + 1} de ${totalOccs}`
            : "Detalhamento (obrigatório)"}
        </label>
        <button className="occ-remove" onClick={handleRemove}>
          Remover
        </button>
      </div>

      {item.mostrarPartes && partes.length > 0 && (
        <div className="party-chips">
          <span className="party-label">Parte:</span>
          {partes.map((p) => (
            <button
              key={p}
              className={`party-chip ${occ.parte === p ? "active" : ""}`}
              onClick={() => updateParte(id, oi, occ.parte === p ? "" : p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={taRef}
        value={occ.detalhe}
        onChange={(e) => updateDetalhe(id, oi, e.target.value)}
        placeholder="Detalhamento do erro (obrigatório) — descreva o que foi encontrado no ato"
      />

      <div className="preview-block">
        <div className="preview-label">Vai colar assim ↓</div>
        <div className="preview-text">{previewText}</div>
      </div>

      <div className="copy-row">
        <button className="copy-btn" onClick={handleCopy}>
          Copiar esta ocorrência
        </button>
      </div>
    </div>
  );
}
