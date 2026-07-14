import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { loadFromCSV } from "../lib/csv-loader";
import type { Section, Occurrence, Roteiro } from "../types";

const CURRENT_ROTEIRO_KEY = "rct_current_roteiro";

function storageKey(roteiroId: string): string {
  return `rct_apont_${roteiroId}`;
}

function loadMarksFromStorage(roteiroId: string): Record<string, Occurrence[]> {
  try {
    const raw = localStorage.getItem(storageKey(roteiroId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Occurrence[]>;
  } catch {
    return {};
  }
}

function saveMarksToStorage(
  roteiroId: string | null,
  marks: Record<string, Occurrence[]>,
): void {
  if (!roteiroId) return;
  try {
    if (Object.keys(marks).length === 0) {
      localStorage.removeItem(storageKey(roteiroId));
    } else {
      localStorage.setItem(storageKey(roteiroId), JSON.stringify(marks));
    }
  } catch {
    /* quota exceeded — silent */
  }
}

interface UndoSnapshot {
  marks: Record<string, Occurrence[]>;
  collapsed: Set<string>;
}

interface AppState {
  data: Section[];
  partes: string[];
  currentRoteiro: string | null;
  isLoading: boolean;
  search: string;
  grav: string;
  onlyMarked: boolean;
  openSections: Set<number>;
  marks: Record<string, Occurrence[]>;
  collapsed: Set<string>;
  undoSnapshot: UndoSnapshot | null;

  selectRoteiro: (roteiro: Roteiro) => Promise<void>;
  setSearch: (search: string) => void;
  setGrav: (grav: string) => void;
  toggleOnlyMarked: () => void;
  toggleSection: (si: number) => void;
  addOccurrence: (
    id: string,
    item: Section["itens"][number],
    sectionTitle: string,
  ) => void;
  removeOccurrence: (id: string, oi: number) => void;
  toggleCollapse: (id: string, oi: number) => void;
  updateDetalhe: (id: string, oi: number, detalhe: string) => void;
  updateParte: (id: string, oi: number, parte: string) => void;
  clearAll: () => void;
  resetConferencia: () => void;
  restoreUndo: () => void;
  focusSection: (si: number) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    data: [],
    partes: [],
    currentRoteiro: null,
    isLoading: false,
    search: "",
    grav: "todos",
    onlyMarked: false,
    openSections: new Set<number>(),
    marks: {},
    collapsed: new Set(),
    undoSnapshot: null,

    selectRoteiro: async (roteiro) => {
      const savedMarks = loadMarksFromStorage(roteiro.key);
      try {
        localStorage.setItem(CURRENT_ROTEIRO_KEY, roteiro.key);
      } catch { /* quota exceeded */ }
      set({
        isLoading: true,
        currentRoteiro: roteiro.key,
        marks: savedMarks,
        collapsed: new Set(),
        search: "",
        grav: "todos",
        onlyMarked: false,
        openSections: new Set<number>(),
        undoSnapshot: null,
      });
      try {
        const result = await loadFromCSV(roteiro.url!, roteiro.structure);
        set({ data: result.sections, partes: result.partes, isLoading: false });
      } catch (e) {
        console.error("Falha ao carregar planilha:", e);
        set({ data: [], partes: [], isLoading: false });
      }
    },

    setSearch: (search) => set({ search }),
    setGrav: (grav) => set({ grav }),
    toggleOnlyMarked: () => set((s) => ({ onlyMarked: !s.onlyMarked })),

    toggleSection: (si) =>
      set((s) => {
        if (s.openSections.has(si)) {
          return { openSections: new Set<number>() };
        }
        return { openSections: new Set([si]) };
      }),

    addOccurrence: (id, item, sectionTitle) =>
      set((s) => {
        const newCollapsed = new Set(s.collapsed);
        Object.keys(s.marks).forEach((mid) => {
          (s.marks[mid] ?? []).forEach((_, oi) => {
            newCollapsed.add(`${mid}::${oi}`);
          });
        });
        const existing = s.marks[id] ?? [];
        existing.forEach((_, oi) => {
          newCollapsed.add(`${id}::${oi}`);
        });
        const newOcc: Occurrence = {
          erro: item.erro,
          gravidade: item.gravidade,
          consequencia: item.consequencia,
          secao: sectionTitle,
          detalhe: "",
          parte: "",
        };
        newCollapsed.delete(`${id}::${existing.length}`);
        return {
          marks: { ...s.marks, [id]: [...existing, newOcc] },
          collapsed: newCollapsed,
        };
      }),

    removeOccurrence: (id, oi) =>
      set((s) => {
        const snapshot: UndoSnapshot = {
          marks: JSON.parse(JSON.stringify(s.marks)),
          collapsed: new Set(s.collapsed),
        };
        const occs = [...(s.marks[id] ?? [])];
        occs.splice(oi, 1);
        const newMarks = { ...s.marks };
        if (occs.length === 0) delete newMarks[id];
        else newMarks[id] = occs;
        const newCollapsed = new Set<string>();
        s.collapsed.forEach((key) => {
          const [kid, koi] = key.split("::");
          if (kid !== id) {
            newCollapsed.add(key);
            return;
          }
          const idx = parseInt(koi!, 10);
          if (idx < oi) newCollapsed.add(key);
          else if (idx > oi) newCollapsed.add(`${id}::${idx - 1}`);
        });
        return { marks: newMarks, collapsed: newCollapsed, undoSnapshot: snapshot };
      }),

    toggleCollapse: (id, oi) =>
      set((s) => {
        const key = `${id}::${oi}`;
        const next = new Set(s.collapsed);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return { collapsed: next };
      }),

    updateDetalhe: (id, oi, detalhe) =>
      set((s) => {
        const occs = [...(s.marks[id] ?? [])];
        if (!occs[oi]) return s;
        occs[oi] = { ...occs[oi], detalhe };
        return { marks: { ...s.marks, [id]: occs } };
      }),

    updateParte: (id, oi, parte) =>
      set((s) => {
        const occs = [...(s.marks[id] ?? [])];
        if (!occs[oi]) return s;
        occs[oi] = { ...occs[oi], parte };
        return { marks: { ...s.marks, [id]: occs } };
      }),

    clearAll: () =>
      set((s) => {
        const snapshot: UndoSnapshot = {
          marks: JSON.parse(JSON.stringify(s.marks)),
          collapsed: new Set(s.collapsed),
        };
        return { marks: {}, collapsed: new Set(), undoSnapshot: snapshot };
      }),

    resetConferencia: () =>
      set((s) => {
        const snapshot: UndoSnapshot = {
          marks: JSON.parse(JSON.stringify(s.marks)),
          collapsed: new Set(s.collapsed),
        };
        return {
          marks: {},
          collapsed: new Set(),
          search: "",
          grav: "todos",
          onlyMarked: false,
          openSections: new Set<number>(),
          undoSnapshot: snapshot,
        };
      }),

    restoreUndo: () =>
      set((s) => {
        if (!s.undoSnapshot) return s;
        return {
          marks: s.undoSnapshot.marks,
          collapsed: s.undoSnapshot.collapsed,
          undoSnapshot: null,
        };
      }),

    focusSection: (si) =>
      set(() => ({
        openSections: new Set([si]),
      })),
  })),
);

// Persist marks to localStorage on every change
useAppStore.subscribe(
  (s) => ({ marks: s.marks, currentRoteiro: s.currentRoteiro }),
  ({ marks, currentRoteiro }) => {
    saveMarksToStorage(currentRoteiro, marks);
  },
  { equalityFn: (a, b) => a.marks === b.marks && a.currentRoteiro === b.currentRoteiro },
);
