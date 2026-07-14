import { useState, useMemo } from "react";
import { useAppStore } from "../stores/useAppStore";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";
import { copyToClipboard } from "../lib/clipboard";
import { formatApontamento, buildFullText } from "../lib/format";
import type { Item } from "../types";

function useItemsMap(): Map<string, Item> {
  const data = useAppStore((s) => s.data);
  return useMemo(() => {
    const map = new Map<string, Item>();
    data.forEach((section, si) => {
      section.itens.forEach((item, ii) => {
        map.set(`${si}-${ii}`, item);
      });
    });
    return map;
  }, [data]);
}

export function ApontamentosPanel() {
  const { marks, clearAll, removeOccurrence, restoreUndo } = useAppStore();
  const showToast = useToast();
  const confirm = useConfirm();
  const itemsMap = useItemsMap();

  const [editedFull, setEditedFull] = useState<string | null>(null);
  const [editedBase, setEditedBase] = useState<string | null>(null);
  const [expandedModal, setExpandedModal] = useState(false);

  const totalOcc = Object.values(marks).reduce(
    (sum, occs) => sum + occs.length,
    0,
  );

  const baseFull = useMemo(
    () => buildFullText(marks, itemsMap),
    [marks, itemsMap],
  );
  const isEdited = editedFull !== null && editedBase === baseFull;
  const fullText = isEdited ? editedFull : baseFull;

  const handleClearAll = async () => {
    if (Object.keys(marks).length === 0) return;
    const ok = await confirm({
      title: "Limpar apontamentos",
      message: "Todos os apontamentos desta conferência serão removidos. Deseja continuar?",
      confirmLabel: "Sim, limpar tudo",
      destructive: true,
    });
    if (!ok) return;
    clearAll();
    setEditedFull(null);
    setEditedBase(null);
    showToast("Todos os apontamentos foram removidos", {
      label: "Desfazer",
      onClick: () => restoreUndo(),
    });
  };

  const handleCopyAll = () => {
    if (!fullText) {
      showToast("Nenhum apontamento para copiar");
      return;
    }
    copyToClipboard(fullText, () => {
      showToast(
        `Copiado: ${totalOcc} apontamento${totalOcc > 1 ? "s" : ""}`,
      );
    });
  };

  const handleRemove = (id: string, oi: number) => {
    removeOccurrence(id, oi);
    showToast("Apontamento removido", {
      label: "Desfazer",
      onClick: () => restoreUndo(),
    });
  };

  const handleRestore = () => {
    setEditedFull(null);
    setEditedBase(null);
  };

  return (
    <div className="apontamentos-panel">
      <div className="apontamentos-header">
        <span className="apontamentos-title">Apontamentos</span>
        <span className="apontamentos-count">{totalOcc}</span>
      </div>

      <div className="apontamentos-body">
        {totalOcc === 0 ? (
          <div className="apontamentos-empty">
            Nenhum apontamento ainda.
            <br />
            Clique em <strong style={{ color: "#6b7684" }}>Apontar</strong> em
            qualquer item.
          </div>
        ) : (
          Object.keys(marks).map((id) =>
            (marks[id] ?? []).map((m, oi) => {
              const item = itemsMap.get(id);
              const occs = marks[id] ?? [];
              return (
                <div key={`${id}-${oi}`} className="ap-item">
                  <div className="ap-item-badges">
                    {m.gravidade && (
                      <span className={`tag ${m.gravidade}`}>
                        {m.gravidade}
                      </span>
                    )}
                    {m.parte && (
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 600,
                          color: "#55606d",
                          background: "#eef1f5",
                          borderRadius: "5px",
                          padding: "2px 7px",
                        }}
                      >
                        {m.parte}
                      </span>
                    )}
                    {occs.length > 1 && (
                      <span style={{ fontSize: "10.5px", color: "#9aa4b1" }}>
                        {oi + 1}/{occs.length}
                      </span>
                    )}
                  </div>
                  <div className="ap-item-title">{m.erro}</div>
                  <div className="ap-item-detail">
                    {item
                      ? formatApontamento(item, m)
                      : m.detalhe?.trim() || "(sem detalhamento)"}
                  </div>
                  <button
                    className="ap-item-remove"
                    onClick={() => handleRemove(id, oi)}
                  >
                    Remover
                  </button>
                </div>
              );
            }),
          )
        )}
      </div>

      <div className="apontamentos-footer">
        {totalOcc > 0 && (
          <div style={{ marginBottom: "10px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "5px",
              }}
            >
              <span className="editable-full-label">
                Texto final · editável
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isEdited && (
                  <button className="editable-full-restore" onClick={handleRestore}>
                    Restaurar
                  </button>
                )}
                <button
                  className="editable-full-expand"
                  onClick={() => setExpandedModal(true)}
                  title="Expandir texto"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="10 2 14 2 14 6" />
                    <line x1="9" y1="7" x2="14" y2="2" />
                    <polyline points="6 14 2 14 2 10" />
                    <line x1="7" y1="9" x2="2" y2="14" />
                  </svg>
                </button>
              </div>
            </div>
            <textarea
              className="editable-full-textarea"
              value={fullText}
              onChange={(e) => {
                setEditedFull(e.target.value);
                setEditedBase(baseFull);
              }}
            />
          </div>
        )}
        <button
          className="ap-copy-all"
          disabled={totalOcc === 0}
          onClick={handleCopyAll}
        >
          Copiar todos p/ observações
        </button>
        <button className="ap-clear-all" onClick={handleClearAll}>
          Limpar tudo
        </button>
      </div>
      {expandedModal && (
        <div className="fulltext-overlay" onClick={() => setExpandedModal(false)}>
          <div className="fulltext-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fulltext-modal-header">
              <span className="fulltext-modal-title">Texto final · editável</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {isEdited && (
                  <button className="editable-full-restore" onClick={handleRestore}>
                    Restaurar
                  </button>
                )}
                <button
                  className="fulltext-modal-close"
                  onClick={() => setExpandedModal(false)}
                >
                  &times;
                </button>
              </div>
            </div>
            <textarea
              className="fulltext-modal-textarea"
              value={fullText}
              onChange={(e) => {
                setEditedFull(e.target.value);
                setEditedBase(baseFull);
              }}
              autoFocus
            />
            <div className="fulltext-modal-footer">
              <button
                className="ap-copy-all"
                onClick={() => {
                  if (!fullText) return;
                  copyToClipboard(fullText, () => {
                    showToast(`Copiado: ${totalOcc} apontamento${totalOcc > 1 ? "s" : ""}`);
                    setExpandedModal(false);
                  });
                }}
              >
                Copiar texto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
