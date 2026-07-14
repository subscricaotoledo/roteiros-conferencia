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

export function Drawer() {
  const [open, setOpen] = useState(false);
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
    <>
      <button
        className="drawer-trigger"
        style={{
          position: "fixed",
          bottom: "22px",
          right: "22px",
          background: "#1e2b3d",
          color: "#fff",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          fontSize: "13.5px",
          padding: "14px 20px",
          borderRadius: "9999px",
          boxShadow: "0 6px 20px rgba(30,43,61,0.28)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 40,
          border: "none",
        }}
        onClick={() => setOpen(true)}
      >
        Apontamentos desta conferência
        <span
          style={{
            background: "#2e5f9e",
            color: "#fff",
            borderRadius: "9999px",
            padding: "1px 8px",
            fontSize: "11.5px",
            fontWeight: 700,
          }}
        >
          {totalOcc}
        </span>
      </button>

      <div className={`drawer ${open ? "open" : ""}`}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #eef1f5",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "17px",
              fontWeight: 600,
              margin: 0,
              color: "#1e2b3d",
            }}
          >
            Apontamentos desta conferência
          </h2>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              color: "#8b96a3",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <div
          style={{ overflowY: "auto", padding: "10px 20px", flex: 1 }}
        >
          {totalOcc === 0 ? (
            <div className="drawer-empty">
              Nenhum apontamento ainda. Use &quot;Apontar&quot; em um item da
              lista.
            </div>
          ) : (
            Object.keys(marks).map((id) =>
              (marks[id] ?? []).map((m, oi) => {
                const item = itemsMap.get(id);
                const occs = marks[id] ?? [];
                const label =
                  occs.length > 1
                    ? ` (ocorrência ${oi + 1} de ${occs.length})`
                    : "";
                return (
                  <div key={`${id}-${oi}`} className="drawer-item">
                    <div className="drawer-item-title">
                      {m.gravidade ? `[${m.gravidade}] ` : ""}
                      {m.erro}
                      {m.parte ? ` (${m.parte})` : ""}
                      {label}
                    </div>
                    <div className="drawer-item-detail">
                      {item
                        ? formatApontamento(item, m)
                        : m.detalhe?.trim() || "(sem detalhamento preenchido)"}
                    </div>
                    <button
                      className="drawer-item-remove"
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

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #eef1f5",
          }}
        >
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
                    <button
                      className="editable-full-restore"
                      onClick={handleRestore}
                    >
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
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleClearAll}
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: "13px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #d3dae2",
                background: "#fff",
                color: "#55606d",
                cursor: "pointer",
              }}
            >
              Limpar tudo
            </button>
            <button
              onClick={handleCopyAll}
              style={{
                flex: 1,
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: "13.5px",
                padding: "12px 0",
                borderRadius: "10px",
                border: "none",
                background: totalOcc > 0 ? "#1e2b3d" : "#c3cbd4",
                color: "#fff",
                cursor: totalOcc > 0 ? "pointer" : "not-allowed",
              }}
            >
              Copiar todos p/ observações
            </button>
          </div>
        </div>
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
    </>
  );
}
