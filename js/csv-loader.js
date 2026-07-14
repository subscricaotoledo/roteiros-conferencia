/**
 * Carrega dados de roteiro a partir de um CSV publicado do Google Sheets.
 * Converte automaticamente para o formato esperado pelo app:
 * [{ titulo, itens: [{ erro, nota, tipo, classificador, gravidade, consequencia, visibilidade }] }]
 *
 * Cada roteiro (ver ROTEIROS em app.js) declara uma "structure", que diz
 * qual conjunto de colunas essa planilha usa — evita depender de posição
 * fixa de coluna, já que roteiros diferentes têm colunas extras (ex.:
 * classificador de arquivamento) deslocando as demais.
 */
const CSV_STRUCTURES = {
  padrao: {
    erro: "ERRO",
    nota: "DETALHAMENTO DO ERRO",
    tipo: "TIPO DE ERRO",
    gravidade: "GRAVIDADE",
    consequencia: "CONSEQUÊNCIA",
    visibilidade: "PODE/DEVE SER VISTO PELO CONFERENTE",
  },
  // Roteiro de arquivamento: só documento e classificador — sem gravidade,
  // consequência ou visibilidade (não fazem sentido para esse roteiro,
  // mesmo que a planilha ainda tenha essas colunas preenchidas).
  arquivamento: {
    erro: "ERRO",
    nota: "DETALHAMENTO DO ERRO",
    classificador: "CLASSIFICADOR DE ARQUIVAMENTO",
  },
};

function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      rows.push(current);
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      rows.push(current);
      current = "";
      // marca fim de linha
      rows.push(null);
    } else {
      current += ch;
    }
  }
  if (current) rows.push(current);

  // converte flat com null-separators em array de arrays
  const lines = [];
  let line = [];
  for (const val of rows) {
    if (val === null) {
      if (line.length > 0) lines.push(line);
      line = [];
    } else {
      line.push(val);
    }
  }
  if (line.length > 0) lines.push(line);

  return lines;
}

function isSectionRow(cols) {
  // Linha de seção: primeira coluna em CAIXA ALTA, demais vazias.
  // Só checar "demais colunas vazias" não basta: roteiros com itens de
  // checklist sem gravidade/consequência preenchida (ex.: documentos a
  // arquivar) também ficam com as demais colunas vazias.
  const title = cols[0] && cols[0].trim();
  if (!title) return false;
  for (let i = 1; i < cols.length; i++) {
    if (cols[i] && cols[i].trim()) return false;
  }
  return title === title.toUpperCase();
}

function csvToData(csvText, structureKey) {
  const columns = CSV_STRUCTURES[structureKey] || CSV_STRUCTURES.padrao;
  const lines = parseCSV(csvText);
  if (lines.length === 0) return [];

  const header = lines[0].map((h) => (h || "").trim().toUpperCase());
  const colIndex = {};
  Object.keys(columns).forEach((key) => {
    colIndex[key] = header.indexOf(columns[key]);
  });
  const col = (cols, key) => {
    const i = colIndex[key];
    return i >= 0 ? (cols[i] || "").trim() : "";
  };

  const dataLines = lines.slice(1);
  const sections = [];
  let currentSection = null;

  for (const cols of dataLines) {
    if (isSectionRow(cols)) {
      currentSection = { titulo: cols[0].trim(), itens: [] };
      sections.push(currentSection);
    } else if (currentSection && cols[0] && cols[0].trim()) {
      currentSection.itens.push({
        erro: col(cols, "erro"),
        nota: col(cols, "nota"),
        tipo: col(cols, "tipo"),
        classificador: col(cols, "classificador"),
        gravidade: col(cols, "gravidade"),
        consequencia: col(cols, "consequencia"),
        visibilidade: col(cols, "visibilidade"),
      });
    }
  }

  return sections;
}

async function loadFromCSV(url, structureKey) {
  const cacheBuster = "_cb=" + Date.now();
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(url + separator + cacheBuster, { cache: "no-store" });
  if (!response.ok) throw new Error(`Erro ao carregar planilha: ${response.status}`);
  const text = await response.text();
  return csvToData(text, structureKey);
}
