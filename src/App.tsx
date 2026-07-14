import { useEffect } from "react";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmModal";
import { FilterBar } from "./components/FilterBar";
import { SectionList } from "./components/SectionList";
import { SectionNav } from "./components/SectionNav";
import { ApontamentosPanel } from "./components/ApontamentosPanel";
import { Drawer } from "./components/Drawer";
import { useAppStore } from "./stores/useAppStore";
import { ROTEIROS } from "./data/roteiros";

function AppContent() {
  const isLoading = useAppStore((s) => s.isLoading);
  const currentRoteiro = useAppStore((s) => s.currentRoteiro);
  const selectRoteiro = useAppStore((s) => s.selectRoteiro);

  useEffect(() => {
    if (currentRoteiro) return;
    try {
      const savedKey = localStorage.getItem("rct_current_roteiro");
      if (!savedKey) return;
      const roteiro = ROTEIROS.find((r) => r.key === savedKey && r.url);
      if (roteiro) void selectRoteiro(roteiro);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <SectionNav />
      </aside>

      <main className="app-main">
        <header className="app-header">
          <h1 className="app-title">Roteiro de Conferência</h1>
          <p className="app-subtitle">
            Gravidade, consequência e apontamento em um só lugar.
          </p>
        </header>

        <FilterBar />

        {isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            Carregando roteiro...
          </div>
        ) : (
          <SectionList />
        )}
      </main>

      <aside className="app-right">
        <ApontamentosPanel />
      </aside>

      <Drawer />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </ToastProvider>
  );
}
