import { useMemo } from "react";
import { useAppStore } from "../stores/useAppStore";
import { SectionItem } from "./SectionItem";

function itemId(si: number, ii: number): string {
  return `${si}-${ii}`;
}

export function SectionList() {
  const {
    data,
    currentRoteiro,
    search,
    grav,
    onlyMarked,
    openSections,
    marks,
    toggleSection,
  } = useAppStore();

  const { sections, totalVisible } = useMemo(() => {
    if (!currentRoteiro) return { sections: [], totalVisible: 0 };

    let total = 0;
    const filtered = data
      .map((section, si) => {
        const visibleItems = section.itens
          .map((it, ii) => ({ it, ii }))
          .filter(({ it, ii }) => {
            const id = itemId(si, ii);
            if (onlyMarked && !marks[id]?.length) return false;
            if (grav !== "todos" && it.gravidade !== grav) return false;
            if (search) {
              const q = search.toLowerCase();
              const hay =
                `${it.erro} ${it.nota} ${it.consequencia}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
        total += visibleItems.length;
        return { section, si, visibleItems };
      })
      .filter((s) => s.visibleItems.length > 0);

    return { sections: filtered, totalVisible: total };
  }, [data, currentRoteiro, search, grav, onlyMarked, marks]);

  if (!currentRoteiro) {
    return (
      <div className="empty-state">
        Selecione um roteiro de conferência no menu acima para começar.
      </div>
    );
  }

  const countMarkedInSection = (si: number, itens: { ii: number }[]) => {
    let count = 0;
    itens.forEach(({ ii }) => {
      const id = itemId(si, ii);
      if (marks[id]?.length) count++;
    });
    return count;
  };

  const gravDotsForSection = (section: (typeof data)[number]) => {
    const has = { Leve: false, Moderado: false, Grave: false };
    for (const it of section.itens) {
      if (it.gravidade && it.gravidade in has) {
        has[it.gravidade as keyof typeof has] = true;
      }
    }
    return has;
  };

  return (
    <div className="sections-list">
      {totalVisible === 0 ? (
        <div className="empty-state">
          Nenhum item corresponde aos filtros. Ajuste a busca ou os filtros de
          gravidade.
        </div>
      ) : (
        sections.map(({ section, si, visibleItems }) => {
          const markedCount = countMarkedInSection(
            si,
            section.itens.map((_, ii) => ({ ii })),
          );

          const isOpen = openSections.has(si) || !!search || onlyMarked;
          const dots = gravDotsForSection(section);

          const summary =
            markedCount > 0
              ? `${markedCount} apontado${markedCount > 1 ? "s" : ""} · ${section.itens.length} itens`
              : `${section.itens.length} itens`;

          return (
            <section
              key={si}
              className={`section ${isOpen ? "open" : ""}`}
              data-section-index={si}
            >
              <button
                className="section-head"
                onClick={() => toggleSection(si)}
              >
                <span className="section-head-left">
                  <span className="section-num">
                    {String(si + 1).padStart(2, "0")}
                  </span>
                  <span className="section-title">{section.titulo}</span>
                </span>
                <span className="section-head-right">
                  <span className="grav-dots">
                    {dots.Grave && <span className="grav-dot grave" />}
                    {dots.Moderado && <span className="grav-dot moderado" />}
                    {dots.Leve && <span className="grav-dot leve" />}
                  </span>
                  <span className="section-count">{summary}</span>
                  <span className="chevron" />
                </span>
              </button>
              <div className="section-body">
                {visibleItems.map(({ it, ii }) => (
                  <SectionItem
                    key={ii}
                    item={it}
                    id={itemId(si, ii)}
                    sectionTitle={section.titulo}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
