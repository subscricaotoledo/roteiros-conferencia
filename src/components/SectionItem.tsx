import { useState } from "react";
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
  const [escolhendoClasse, setEscolhendoClasse] = useState(false);
  const occs = marks[id] ?? [];
  const isMarked = occs.length > 0;
  const gravClass = item.gravidade
    ? `grav-${item.gravidade.toLowerCase()}`
    : "grav-none";
  const temDuplaClassificacao = !!(
    item.gravidadeArquivamento || item.consequenciaArquivamento
  );

  function handleApontarClick() {
    if (temDuplaClassificacao) {
      setEscolhendoClasse(true);
    } else {
      addOccurrence(id, item, sectionTitle);
    }
  }

  function handleEscolha(usarArquivamento: boolean) {
    addOccurrence(id, item, sectionTitle, usarArquivamento);
    setEscolhendoClasse(false);
  }

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
            {item.tipo && (
              <span
                className={`tag tipo${item.tipo.trim().toLowerCase() === "arquivamento" ? " arquivamento" : ""}`}
              >
                {item.tipo}
              </span>
            )}
            {temDuplaClassificacao && (
              <span className="tag dual-arquivamento">+ Arquivamento</span>
            )}
          </div>
        </div>
        <div style={{ flex: "none" }}>
          {escolhendoClasse ? (
            <div className="classe-choice">
              <button className="classe-choice-btn" onClick={() => handleEscolha(false)}>
                Jurídico/Material
              </button>
              <button
                className="classe-choice-btn arquivamento"
                onClick={() => handleEscolha(true)}
              >
                Arquivamento
              </button>
            </div>
          ) : isMarked ? (
            <button
              className="mark-btn"
              data-marked="true"
              onClick={handleApontarClick}
            >
              + Ocorrência
            </button>
          ) : (
            <button className="mark-btn" onClick={handleApontarClick}>
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
