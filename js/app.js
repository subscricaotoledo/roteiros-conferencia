/* ── URLs das planilhas (Google Sheets publicadas como CSV) ── */
const CSV_URLS = {
  "venda-compra-doacao": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUXmDUQD0WTFgdEDEKqqIkiqhJ-uOFgNMdDlH0wwymeoZOIiaeyV8S8LWfkc7dzojBpZNViuTEFQD8/pub?output=csv",
  "adjudicacao-compulsoria": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSIrcR2pD1Kz_Sr21-9uutjgQvXtSsCqmlgs8D8mIDBj_pN46OrtCqnoGCNlfY3-FO_vJLbkC0whDR/pub?output=csv",
};

/* ── Estado global ── */
let DATA = [];
let state = { search: "", grav: "todos", onlyMarked: false, openSections: new Set([0]) };
let marks = {};
let collapsed = new Set();
let currentRoteiro = "venda-compra-doacao";

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
            <span class="tag ${it.gravidade}">${it.gravidade}</span>
            <span class="tag consequencia ${it.gravidade}">${it.consequencia}</span>
            <span class="tag vis" title="${it.visibilidade}">${it.visibilidade}</span>
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
  let s = `[${m.gravidade.toUpperCase()}] [${m.consequencia}]${occLabel ? " — " + occLabel : ""}`;
  s += `\n> ${(m.detalhe || "").trim()}`;
  return s;
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
        <div class="drawer-item-title">[${m.gravidade}] ${m.erro}${label}</div>
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
function toggleRoteiroMenu() {
  document.getElementById("roteiroSelector").classList.toggle("open");
}

function selectRoteiro(el) {
  if (el.classList.contains("disabled")) return;
  document.getElementById("roteiroSelector").classList.remove("open");

  const roteiroKey = el.dataset.roteiro;
  if (!roteiroKey || roteiroKey === currentRoteiro) return;

  if (Object.keys(marks).length > 0 && !confirm("Trocar de roteiro? Os apontamentos desta conferência serão apagados.")) return;

  document.querySelectorAll(".roteiro-dropdown-item").forEach((i) => i.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("roteiroSelectedLabel").textContent =
    el.querySelector(".roteiro-label-name").textContent;

  loadRoteiro(roteiroKey);
}

async function loadRoteiro(key) {
  currentRoteiro = key;
  marks = {};
  collapsed = new Set();
  state = { search: "", grav: "todos", onlyMarked: false, openSections: new Set([0]) };
  document.getElementById("searchInput").value = "";
  setGrav("todos");
  document.getElementById("onlyMarkedToggle").setAttribute("data-active", false);
  try {
    DATA = await loadFromCSV(CSV_URLS[key]);
  } catch (e) {
    console.error("Falha ao carregar planilha:", e.message);
    DATA = [];
  }
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

/* Carrega dados da planilha */
(async function init() {
  try {
    DATA = await loadFromCSV(CSV_URLS[currentRoteiro]);
  } catch (e) {
    console.error("Falha ao carregar planilha:", e.message);
  }
  render();
})();
