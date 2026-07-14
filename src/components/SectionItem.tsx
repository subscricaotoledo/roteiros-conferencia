import { useAppStore } from "../stores/useAppStore";
import { OccurrencePanel } from "./OccurrencePanel";
import type { Item } from "../types";

interface SectionItemProps {
  item: Item;
  id: string;
  sectionTitle: string;
}

export function SectionItem({ item, id, sectionTitle }: SectionItemProps) {
  const { marks, addOccurrence } = useAppStore();
  const occs = marks[id] ?? [];
  const isMarked = occs.length > 0;
  const gravClass = item.gravidade
    ? `grav-${item.gravidade.toLowerCase()}`
    : "grav-none";

  return (
    <div className={`item ${gravClass} ${isMarked ? "marked" : ""}`}>
      <div className="item-top">
        <div className="item-main">
          <div className="item-title-row">
            <span className="item-erro">{item.erro}</span>
            {isMarked && (
              <span className="badge-apontado">
                ✓ apontado ×{occs.length}
              </span>
            )}
          </div>
          {item.nota && <div className="item-nota">{item.nota}</div>}
          <div className="tags">
            {item.classificador && (
              <span className="tag classificador">{item.classificador}</span>
            )}
            {item.gravidade && (
              <span className={`tag ${item.gravidade}`}>{item.gravidade}</span>
            )}
            {item.consequencia && (
              <span className="tag consequencia">{item.consequencia}</span>
            )}
            {item.tipo && <span className="tag tipo">{item.tipo}</span>}
          </div>
        </div>
        <div style={{ flex: "none" }}>
          {isMarked ? (
            <button
              className="mark-btn"
              data-marked="true"
              onClick={() => addOccurrence(id, item, sectionTitle)}
            >
              + Ocorrência
            </button>
          ) : (
            <button
              className="mark-btn"
              onClick={() => addOccurrence(id, item, sectionTitle)}
            >
              Apontar
            </button>
          )}
        </div>
      </div>

      {isMarked && (
        <div className="occurrences">
          {occs.map((_, oi) => (
            <OccurrencePanel
              key={oi}
              id={id}
              oi={oi}
              totalOccs={occs.length}
              item={item}
              autoFocus={oi === occs.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
