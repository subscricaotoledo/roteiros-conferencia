import { useState, useEffect, useRef } from "react";
import { ROTEIROS } from "../data/roteiros";
import { useAppStore } from "../stores/useAppStore";
import { useConfirm } from "./ConfirmModal";

const SORTED_ROTEIROS = [...ROTEIROS].sort((a, b) =>
  a.label.localeCompare(b.label, "pt-BR")
);

export function RoteiroSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { currentRoteiro, isLoading, selectRoteiro, marks } = useAppStore();
  const confirm = useConfirm();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const selectedLabel =
    ROTEIROS.find((r) => r.key === currentRoteiro)?.label ??
    "Selecione um roteiro";

  const handleSelect = async (r: (typeof ROTEIROS)[number]) => {
    if (!r.url || isLoading) return;
    if (r.key === currentRoteiro) {
      setOpen(false);
      return;
    }
    if (Object.keys(marks).length > 0) {
      const ok = await confirm({
        title: "Trocar de roteiro?",
        message: "Os apontamentos desta conferência serão apagados.",
        confirmLabel: "Trocar",
        destructive: true,
      });
      if (!ok) return;
      useAppStore.getState().clearAll();
    }
    setOpen(false);
    void selectRoteiro(r);
  };

  return (
    <div
      className={`roteiro-selector ${open ? "open" : ""}`}
      ref={ref}
      style={{ position: "relative" }}
    >
      <button className="roteiro-trigger" onClick={() => setOpen(!open)}>
        <svg className="roteiro-trigger-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="1.5" width="12" height="13" rx="2" />
          <line x1="5" y1="5" x2="11" y2="5" />
          <line x1="5" y1="8" x2="11" y2="8" />
          <line x1="5" y1="11" x2="9" y2="11" />
        </svg>
        <span className="roteiro-trigger-label">{selectedLabel}</span>
        <span className="selector-chevron" />
      </button>
      <div className="roteiro-dropdown">
        {SORTED_ROTEIROS.map((r, i) => {
          const disabled = !r.url;
          const active = r.key === currentRoteiro;
          return (
            <div
              key={r.key}
              className={`roteiro-dropdown-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                fontSize: "13px",
                color: "#2b3543",
                cursor: disabled ? "not-allowed" : "pointer",
                borderBottom:
                  i < SORTED_ROTEIROS.length - 1 ? "1px solid #eef1f5" : "none",
                fontFamily: "var(--font-sans)",
              }}
              onClick={() => handleSelect(r)}
            >
              <span
                className="check"
                style={{
                  width: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#2e5f9e",
                }}
              >
                <svg
                  style={{ display: active ? "block" : "none" }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: "13px" }}>
                  {r.label}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#8b96a3",
                    fontWeight: 400,
                    marginTop: "2px",
                  }}
                >
                  {disabled ? "Em breve" : r.desc}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
