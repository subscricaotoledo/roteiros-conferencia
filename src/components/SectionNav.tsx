import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";

function itemId(si: number, ii: number): string {
  return `${si}-${ii}`;
}

export function SectionNav() {
  const { data, marks, currentRoteiro, focusSection } = useAppStore();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const elements = document.querySelectorAll("[data-section-index]");
    let closest = 0;
    let closestDist = Infinity;
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - 140);
      if (dist < closestDist) {
        closestDist = dist;
        closest = parseInt(
          el.getAttribute("data-section-index") ?? "0",
          10,
        );
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (si: number) => {
    focusSection(si);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-section-index="${si}"]`);
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 20,
          behavior: "smooth",
        });
      }
    });
  };

  return (
    <div>
      <div className="sidebar-brand">
        <span className="seal" />
        <span className="sidebar-brand-text">Cartório Toledo</span>
      </div>

      {currentRoteiro && data.length > 0 && (
        <>
          <div className="sidebar-heading">Seções do roteiro</div>
          <nav className="section-nav">
            {data.map((section, si) => {
              let sectionMarksCount = 0;
              section.itens.forEach((_, ii) => {
                const id = itemId(si, ii);
                sectionMarksCount += marks[id]?.length ?? 0;
              });
              return (
                <button
                  key={si}
                  className={`section-nav-item ${activeIndex === si ? "active" : ""}`}
                  onClick={() => scrollToSection(si)}
                >
                  <span className="section-nav-inner">
                    <span className="section-nav-num">
                      {String(si + 1).padStart(2, "0")}
                    </span>
                    <span className="section-nav-label">
                      {section.titulo}
                    </span>
                  </span>
                  {sectionMarksCount > 0 && (
                    <span className="section-nav-badge">
                      {sectionMarksCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
