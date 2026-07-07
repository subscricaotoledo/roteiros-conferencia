/* ── Roteiros disponíveis ──
 * Cada roteiro carrega uma planilha (Google Sheets publicada como CSV) e
 * declara qual "structure" de colunas ela usa (ver CSV_STRUCTURES em
 * csv-loader.js). Roteiros sem url ficam desabilitados no menu ("Em breve").
 */
const ROTEIROS = [
  {
    key: "venda-compra-doacao",
    label: "Venda e Compra / Doação de Imóveis",
    desc: "Escrituras de compra e venda, doação e doação de numerário",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUXmDUQD0WTFgdEDEKqqIkiqhJ-uOFgNMdDlH0wwymeoZOIiaeyV8S8LWfkc7dzojBpZNViuTEFQD8/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "adjudicacao-compulsoria",
    label: "Adjudicação Compulsória",
    desc: "Ações de adjudicação compulsória de imóveis",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSIrcR2pD1Kz_Sr21-9uutjgQvXtSsCqmlgs8D8mIDBj_pN46OrtCqnoGCNlfY3-FO_vJLbkC0whDR/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "alienacao-fiduciaria",
    label: "Alienação Fiduciária",
    desc: "Escrituras de alienação fiduciária de imóveis",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQH5I2eLMQM73gZ2xbvXp2xjxvXn1QqVOAQuuIwKa18o7kXSAEEMO1_zhdYY6fek9KnLzEZNht3en7N/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "cessao-precatorio",
    label: "Cessão de Precatório",
    desc: "Escrituras de cessão de crédito de precatório",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTunm02rN2xrJAZAVBdci184nVoGsJ5dIxUC2Vp0tWNW5UP8P-BJbsw32nCHB6d08xGXkaZvgummCCO/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "dacao-pagamento",
    label: "Dação em Pagamento",
    desc: "Escrituras de dação em pagamento de imóveis",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQU3QQxWGhho93L_yoXAyJ68UiV9gzPgdIExyyIBQLSqtLl9TEu8JCGUCldd5bP6A0AslqtJJlNQJsG/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "divorcio",
    label: "Divórcio",
    desc: "Escrituras de divórcio consensual",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTt1WsS5jjP3mnlRwY8cxhJYmrCXnh6NgoJrz6noiRYSad7Nxmb6dvgUJvJWa0uAGo-AsPbNMpXWdrF/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "inventario-partilha",
    label: "Inventário e Partilha",
    desc: "Escrituras de inventário e partilha de bens",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSI-2alJlY18u2xWASuOhJwBaRTUMdbSx8FP4d54IU-Ykor49B8zyfcyQBVaRigzN8s9YsYhAWinx6a/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "arquivamento-inventario-partilha",
    label: "Arquivamento — Inventário e Partilha",
    desc: "Documentos a arquivar no ato de inventário e partilha",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_ugMYmcVilC9TlLaKb4ThpltHRpc6_8LAYVVJtLL9yUkRoNI5GJiSjNgKcnTtIbL-IW0splPewVow/pub?output=csv",
    structure: "arquivamento",
  },
  {
    key: "permuta",
    label: "Permuta",
    desc: "Escrituras de permuta de imóveis",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTgXXGkr4QiazYd2YGII6N_l5ZWKdo4SI5TKqSveU2bQpicSwHcXRJkBViIohoizHk025Sq2zyhyefH/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "usucapiao",
    label: "Usucapião",
    desc: "Escrituras de usucapião extrajudicial",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_0tfAOGFA4QesIpF0tAvDpd0sztz2JO-IzWlVC99VmrUZP9V-3z-ZWnd9ZZusGi9VXpfBn5Rn4vRN/pub?output=csv",
    structure: "padrao",
  },
  {
    key: "procuracao",
    label: "Procuração",
    desc: "Em breve",
    url: null,
    structure: "padrao",
  },
];

/* ── Estado global ── */
let DATA = [];
let state = { search: "", grav: "todos", onlyMarked: false, openSections: new Set([0]) };
let marks = {};
let collapsed = new Set();
let currentRoteiro = null;
let isLoadingRoteiro = false;

/* ── Helpers ── */
function itemId(si, ii) { return si + "-" + ii; }
function hasMark(id) { return marks[id] && marks[id].length > 0; }
function occKey(id, oi) { return id + "::" + oi; }

function matchesFilter(item) {
  if (state.grav !== "todos" && item.gravidade !== state.grav) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const hay = (item.erro + " " + item.nota + " " + item.consequencia).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/* ── Render principal ── */
function render() {
  const container = document.getElementById("sections");
  container.innerHTML = "";

  if (!currentRoteiro) {
    document.getElementById("resultCount").textContent = "";
    container.innerHTML = `<div class="empty-state">Selecione um roteiro de conferência no menu acima para começar.</div>`;
    updateChipCounts();
    updateDrawerCount();
    return;
  }

  let totalVisible = 0;

  DATA.forEach((section, si) => {
    const visibleItems = section.itens
      .map((it, ii) => ({ it, ii }))
      .filter(({ it, ii }) => {
        const id = itemId(si, ii);
        if (state.onlyMarked && !hasMark(id)) return false;
        return matchesFilter(it);
      });

    if (visibleItems.length === 0) return;
    totalVisible += visibleItems.length;

    const counts = { Leve: 0, Moderado: 0, Grave: 0 };
    section.itens.forEach((it) => counts[it.gravidade]++);

    const isOpen = state.openSections.has(si) || state.search || state.onlyMarked;

    const secDiv = document.createElement("div");
    secDiv.className = "section" + (isOpen ? " open" : "");

    const head = document.createElement("div");
    head.className = "section-head";
    head.innerHTML = `
      <span class="section-num">${String(si + 1).padStart(2, "0")}</span>
      <span class="section-title">${section.titulo}</span>
      <span class="section-meta">
        ${counts.Grave ? `<span class="mini-dot" style="background:var(--color-grave)" title="${counts.Grave} grave(s)"></span>` : ""}
        ${counts.Moderado ? `<span class="mini-dot" style="background:var(--color-moderado)" title="${counts.Moderado} moderado(s)"></span>` : ""}
        ${counts.Leve ? `<span class="mini-dot" style="background:var(--color-leve)" title="${counts.Leve} leve(s)"></span>` : ""}
        <span class="section-count">${visibleItems.length}/${section.itens.length}</span>
      </span>
      <span class="chevron"></span>
    `;
    head.onclick = () => {
      if (state.openSections.has(si)) state.openSections.delete(si);
      else state.openSections.add(si);
      render();
    };

    const body = document.createElement("div");
    body.className = "section-body";

    visibleItems.forEach(({ it, ii }) => {
      const id = itemId(si, ii);
      const occs = marks[id] || [];

      const panelsHtml = occs
        .map((occ, oi) => {
          const key = occKey(id, oi);
          const isCollapsed = collapsed.has(key);
          const labelText = occs.length > 1 ? `Ocorrência ${oi + 1} de ${occs.length}` : "Detalhamento do erro";

          if (isCollapsed) {
            const preview = occ.detalhe && occ.detalhe.trim() ? occ.detalhe.trim() : "(sem detalhamento preenchido — clique para editar)";
            return `
              <div class="detail-panel collapsed" onclick="toggleCollapse('${id}', ${oi})">
                <div class="detail-panel-head">
                  <div class="detail-panel-head-left">
                    <span class="collapse-chevron"></span>
                    <label>${labelText}</label>
                    <span class="collapsed-preview ${occ.detalhe && occ.detalhe.trim() ? "" : "empty"}">${preview}</span>
                  </div>
                  <div class="occ-actions">
                    <button class="occ-remove" onclick="event.stopPropagation(); removeOccurrence('${id}', ${oi})">Remover</button>
                  </div>
                </div>
              </div>
            `;
          }

          return `
            <div class="detail-panel">
              <div class="detail-panel-head">
                <div class="detail-panel-head-left" onclick="toggleCollapse('${id}', ${oi})">
                  <span class="collapse-chevron"></span>
                  <label>${labelText} <span class="text-grave">*</span> (obrigatório, para colar na tela de observações)</label>
                </div>
                <div class="occ-actions">
                  <button class="occ-remove" onclick="removeOccurrence('${id}', ${oi})">Remover</button>
                </div>
              </div>
              <textarea id="ta-${id}-${oi}" placeholder="Ex.: refere-se ao vendedor João da Silva / refere-se ao comprador...">${occ.detalhe || ""}</textarea>
              <div class="copy-row">
                <button class="copy-btn small" onclick="copyOccurrence('${id}', ${oi})">Copiar esta ocorrência</button>
              </div>
            </div>
          `;
        })
        .join("");

      const itemDiv = document.createElement("div");
      itemDiv.className = "item";
      itemDiv.innerHTML = `
        <div class="item-bar ${it.gravidade}"></div>
        <div class="item-main">
          <div class="item-erro">${it.erro}</div>
          ${it.nota ? `<div class="item-nota">${it.nota}</div>` : ""}
          <div class="tags">
            ${it.classificador ? `<span class="tag classificador" title="Classificador de arquivamento">${it.classificador}</span>` : ""}
            ${it.gravidade ? `<span class="tag ${it.gravidade}">${it.gravidade}</span>` : ""}
            ${it.consequencia ? `<span class="tag consequencia ${it.gravidade}">${it.consequencia}</span>` : ""}
            ${it.visibilidade ? `<span class="tag vis" title="${it.visibilidade}">${it.visibilidade}</span>` : ""}
          </div>
          ${occs.length ? `<div class="occurrences">${panelsHtml}</div>` : ""}
        </div>
        <button class="mark-btn" data-marked="${occs.length > 0}" id="btn-${id}" onclick="addOccurrence('${id}', ${si}, ${ii})">
          ${occs.length ? `+ Ocorrência` : "Apontar"}
          ${occs.length ? `<span class="badge-count">×${occs.length}</span>` : ""}
        </button>
      `;
      body.appendChild(itemDiv);
    });

    secDiv.appendChild(head);
    secDiv.appendChild(body);
    container.appendChild(secDiv);
  });

  document.getElementById("resultCount").textContent =
    totalVisible + (totalVisible === 1 ? " erro encontrado" : " erros encontrados");

  updateChipCounts();

  if (totalVisible === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum erro encontrado com os filtros atuais.</div>`;
  }

  Object.keys(marks).forEach((id) => {
    marks[id].forEach((occ, oi) => {
      const ta = document.getElementById(`ta-${id}-${oi}`);
      if (ta) {
        ta.addEventListener("input", () => {
          occ.detalhe = ta.value;
          updateDrawerCount();
        });
      }
    });
  });

  updateDrawerCount();
}

function updateChipCounts() {
  const counts = { Leve: 0, Moderado: 0, Grave: 0 };
  DATA.forEach((section) => section.itens.forEach((it) => counts[it.gravidade]++));
  Object.keys(counts).forEach((g) => {
    const el = document.getElementById(`count-${g}`);
    if (el) el.textContent = counts[g];
  });
}

/* ── Filtros ── */
function setGrav(g) {
  state.grav = g;
  document.querySelectorAll(".chip[data-g]").forEach((c) => {
    c.setAttribute("data-active", c.dataset.g === g ? "true" : "false");
  });
  render();
}

function toggleOnlyMarked() {
  state.onlyMarked = !state.onlyMarked;
  document.getElementById("onlyMarkedToggle").setAttribute("data-active", state.onlyMarked);
  render();
}

/* ── Ocorrências ── */
function addOccurrence(id, si, ii) {
  Object.keys(marks).forEach((mid) => {
    marks[mid].forEach((_, oi) => collapsed.add(occKey(mid, oi)));
  });

  const it = DATA[si].itens[ii];
  if (!marks[id]) marks[id] = [];
  marks[id].push({
    erro: it.erro,
    gravidade: it.gravidade,
    consequencia: it.consequencia,
    secao: DATA[si].titulo,
    detalhe: "",
  });
  const newIndex = marks[id].length - 1;
  collapsed.delete(occKey(id, newIndex));
  render();
  setTimeout(() => document.getElementById(`ta-${id}-${newIndex}`)?.focus(), 50);
}

function toggleCollapse(id, oi) {
  const key = occKey(id, oi);
  if (collapsed.has(key)) collapsed.delete(key);
  else collapsed.add(key);
  render();
}

function removeOccurrence(id, oi) {
  if (!marks[id]) return;
  marks[id].splice(oi, 1);
  if (marks[id].length === 0) delete marks[id];
  const remaining = new Set();
  collapsed.forEach((key) => {
    const [kid, koi] = key.split("::");
    if (kid !== id) { remaining.add(key); return; }
    const idx = parseInt(koi, 10);
    if (idx < oi) remaining.add(key);
    else if (idx > oi) remaining.add(occKey(id, idx - 1));
  });
  collapsed = remaining;
  render();
}

/* ── Clipboard ── */
function formatOne(m, occLabel) {
  const tags = [
    m.gravidade ? `[${m.gravidade.toUpperCase()}]` : null,
    m.consequencia ? `[${m.consequencia}]` : null,
  ].filter(Boolean).join(" ");
  const header = [tags, occLabel].filter(Boolean).join(" — ");
  return [header, `> ${(m.detalhe || "").trim()}`].filter(Boolean).join("\n");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast("Copiado para a área de transferência")).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); showToast("Copiado para a área de transferência"); } catch (e) { /* noop */ }
  document.body.removeChild(ta);
}

function isDetalheFilled(occ) {
  return !!(occ.detalhe && occ.detalhe.trim());
}

function copyOccurrence(id, oi) {
  const occs = marks[id];
  if (!occs || !occs[oi]) return;
  const occ = occs[oi];
  if (!isDetalheFilled(occ)) {
    collapsed.delete(occKey(id, oi));
    render();
    showToast("Preencha o detalhamento antes de copiar");
    document.getElementById(`ta-${id}-${oi}`)?.focus();
    return;
  }
  const label = occs.length > 1 ? `Ocorrência ${oi + 1} de ${occs.length}` : null;
  copyToClipboard(formatOne(occ, label));
}

function copyAll() {
  const ids = Object.keys(marks);
  if (ids.length === 0) { showToast("Nenhum apontamento selecionado"); return; }

  const pending = [];
  ids.forEach((id) => {
    marks[id].forEach((occ, oi) => {
      if (!isDetalheFilled(occ)) pending.push({ id, oi });
    });
  });
  if (pending.length > 0) {
    pending.forEach(({ id, oi }) => collapsed.delete(occKey(id, oi)));
    render();
    showToast(pending.length === 1
      ? "Preencha o detalhamento pendente antes de copiar"
      : `Preencha os ${pending.length} detalhamentos pendentes antes de copiar`);
    document.getElementById(`ta-${pending[0].id}-${pending[0].oi}`)?.focus();
    return;
  }

  const blocks = [];
  ids.forEach((id) => {
    const occs = marks[id];
    occs.forEach((occ, oi) => {
      const label = occs.length > 1 ? `Ocorrência ${oi + 1} de ${occs.length}` : null;
      blocks.push(formatOne(occ, label));
    });
  });
  copyToClipboard(blocks.join("\n\n"));
}

/* ── Drawer ── */
function updateDrawerCount() {
  const totalOcc = Object.values(marks).reduce((sum, occs) => sum + occs.length, 0);
  document.getElementById("drawerCount").textContent = totalOcc;
  const body = document.getElementById("drawerBody");
  body.innerHTML = "";
  if (totalOcc === 0) {
    body.innerHTML = `<div class="drawer-empty">Nenhum erro apontado ainda. Use "Apontar" em um item da lista.</div>`;
    return;
  }
  Object.keys(marks).forEach((id) => {
    const occs = marks[id];
    occs.forEach((m, oi) => {
      const div = document.createElement("div");
      div.className = "drawer-item";
      const label = occs.length > 1 ? ` (ocorrência ${oi + 1} de ${occs.length})` : "";
      div.innerHTML = `
        <div class="drawer-item-title">${m.gravidade ? `[${m.gravidade}] ` : ""}${m.erro}${label}</div>
        <div class="drawer-item-detail">${m.detalhe && m.detalhe.trim() ? m.detalhe : "(sem detalhamento preenchido)"}</div>
        <button class="drawer-item-remove" onclick="removeOccurrence('${id}', ${oi})">Remover apontamento</button>
      `;
      body.appendChild(div);
    });
  });
}

function toggleDrawer(open) {
  document.getElementById("drawer").classList.toggle("open", open);
}

function clearAll() {
  if (Object.keys(marks).length === 0) return;
  if (confirm("Limpar todos os apontamentos desta conferência?")) {
    marks = {};
    collapsed = new Set();
    render();
  }
}

/* ── Menu de seleção de roteiro ── */
function renderRoteiroDropdown() {
  const container = document.getElementById("roteiroDropdown");
  container.innerHTML = ROTEIROS.map((r, i) => {
    const disabled = !r.url;
    const border = i < ROTEIROS.length - 1 ? "border-b border-line" : "";
    return `
      <div class="roteiro-dropdown-item ${disabled ? "disabled" : ""} flex items-center gap-2.5 py-3 px-3.5 font-sans text-[13px] text-ink cursor-pointer ${border} transition-colors ${disabled ? "" : "hover:bg-azul-soft"}" data-roteiro="${r.key}" onclick="${disabled ? "return false" : "selectRoteiro(this)"}">
        <span class="check w-4 h-4 flex items-center justify-center shrink-0 text-azul"><svg class="hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>
        <span class="roteiro-label flex-1 min-w-0">
          <span class="roteiro-label-name block text-[13px]">${r.label}</span>
          <span class="roteiro-label-desc block text-[11px] text-ink-soft font-normal mt-0.5">${disabled ? "Em breve" : r.desc}</span>
        </span>
      </div>
    `;
  }).join("");
}

function toggleRoteiroMenu() {
  document.getElementById("roteiroSelector").classList.toggle("open");
}

function selectRoteiro(el) {
  if (el.classList.contains("disabled") || isLoadingRoteiro) return;
  document.getElementById("roteiroSelector").classList.remove("open");

  const roteiroKey = el.dataset.roteiro;
  const roteiro = ROTEIROS.find((r) => r.key === roteiroKey);
  if (!roteiro || !roteiro.url || roteiroKey === currentRoteiro) return;

  if (Object.keys(marks).length > 0 && !confirm("Trocar de roteiro? Os apontamentos desta conferência serão apagados.")) return;

  document.querySelectorAll(".roteiro-dropdown-item").forEach((i) => i.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("roteiroSelectedLabel").textContent = roteiro.label;

  loadRoteiro(roteiro);
}

function renderLoading() {
  document.getElementById("resultCount").textContent = "";
  document.getElementById("sections").innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      Carregando roteiro...
    </div>
  `;
}

async function loadRoteiro(roteiro) {
  isLoadingRoteiro = true;
  currentRoteiro = roteiro.key;
  marks = {};
  collapsed = new Set();
  state = { search: "", grav: "todos", onlyMarked: false, openSections: new Set([0]) };
  document.getElementById("searchInput").value = "";
  setGrav("todos");
  document.getElementById("onlyMarkedToggle").setAttribute("data-active", false);
  renderLoading();
  try {
    DATA = await loadFromCSV(roteiro.url, roteiro.structure);
  } catch (e) {
    console.error("Falha ao carregar planilha:", e.message);
    DATA = [];
  }
  isLoadingRoteiro = false;
  render();
}

document.addEventListener("click", (e) => {
  const sel = document.getElementById("roteiroSelector");
  if (!sel.contains(e.target)) sel.classList.remove("open");
});

/* ── Init ── */
document.getElementById("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value.trim();
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (Object.keys(marks).length > 0 && !confirm("Iniciar nova conferência? Os apontamentos atuais serão apagados.")) return;
  marks = {};
  collapsed = new Set();
  state = { search: "", grav: "todos", onlyMarked: false, openSections: new Set([0]) };
  document.getElementById("searchInput").value = "";
  setGrav("todos");
  document.getElementById("onlyMarkedToggle").setAttribute("data-active", false);
  render();
});

/* Nenhum roteiro é carregado por padrão — o conferente escolhe no menu */
renderRoteiroDropdown();
render();
