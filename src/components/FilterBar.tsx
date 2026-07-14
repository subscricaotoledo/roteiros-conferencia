import { useAppStore } from "../stores/useAppStore";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";
import { RoteiroSelector } from "./RoteiroSelector";

const GRAVIDADES = ["todos", "Leve", "Moderado", "Grave"] as const;

export function FilterBar() {
  const {
    data,
    currentRoteiro,
    search,
    setSearch,
    grav,
    setGrav,
    onlyMarked,
    toggleOnlyMarked,
    marks,
    resetConferencia,
    restoreUndo,
  } = useAppStore();
  const showToast = useToast();
  const confirm = useConfirm();

  const counts: Record<string, number> = { Leve: 0, Moderado: 0, Grave: 0 };
  let totalItems = 0;
  data.forEach((section) =>
    section.itens.forEach((it) => {
      totalItems++;
      if (it.gravidade && counts[it.gravidade] !== undefined) {
        counts[it.gravidade]!++;
      }
    }),
  );

  const handleReset = async () => {
    if (Object.keys(marks).length > 0) {
      const ok = await confirm({
        title: "Nova conferência",
        message: "Os apontamentos atuais serão apagados. Deseja continuar?",
        confirmLabel: "Sim, iniciar nova",
        destructive: true,
      });
      if (!ok) return;
    }
    resetConferencia();
    showToast("Conferência reiniciada", {
      label: "Desfazer",
      onClick: () => restoreUndo(),
    });
  };

  return (
    <div className="controls-card">
      {/* Linha 1: Seletor de roteiro (largura total) */}
      <div style={{ marginBottom: "12px" }}>
        <RoteiroSelector />
      </div>

      {/* Linha 2: Busca + Nova conferência */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "stretch",
          marginBottom: "12px",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <svg
            style={{
              position: "absolute",
              left: "13px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#9aa4b1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="9" r="6.5" />
            <line x1="14" y1="14" x2="18" y2="18" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por termo (ex: procuração, ITBI, matrícula…)"
            style={{
              width: "100%",
              height: "44px",
              padding: "0 14px 0 38px",
              border: "1px solid #d3dae2",
              borderRadius: "10px",
              fontSize: "14px",
              color: "#2b3543",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>
        <button
          className="btn-nova-conferencia"
          onClick={handleReset}
        >
          Nova conferência
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
          {GRAVIDADES.map((g) => (
            <button
              key={g}
              className="chip"
              data-g={g}
              data-active={grav === g ? "true" : "false"}
              onClick={() => setGrav(g)}
            >
              {g !== "todos" && <span className="chip-dot" />}
              {g === "todos" ? "Todos" : g}
              {g !== "todos" && (
                <span className="chip-count">{counts[g] ?? 0}</span>
              )}
            </button>
          ))}
        </div>
        <button
          className="toggle-marked"
          data-active={onlyMarked ? "true" : "false"}
          onClick={toggleOnlyMarked}
        >
          Somente apontados
        </button>
      </div>

      {currentRoteiro && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #eef1f5",
            fontSize: "12.5px",
            color: "#8b96a3",
          }}
        >
          <strong style={{ color: "#55606d", fontWeight: 600 }}>
            {totalItems}
          </strong>{" "}
          {totalItems === 1 ? "item visível" : "itens visíveis"} · {totalItems}{" "}
          no roteiro
        </div>
      )}
    </div>
  );
}
