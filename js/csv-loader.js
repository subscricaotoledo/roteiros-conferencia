/**
 * Carrega dados de roteiro a partir de um CSV publicado do Google Sheets.
 * Converte automaticamente para o formato esperado pelo app:
 * [{ titulo, itens: [{ erro, nota, gravidade, consequencia, visibilidade }] }]
 */

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
  // Linha de seção: primeira coluna preenchida, demais vazias
  if (!cols[0] || !cols[0].trim()) return false;
  for (let i = 1; i < cols.length; i++) {
    if (cols[i] && cols[i].trim()) return false;
  }
  return true;
}

function csvToData(csvText) {
  const lines = parseCSV(csvText);
  if (lines.length === 0) return [];

  // Pula header
  const dataLines = lines.slice(1);
  const sections = [];
  let currentSection = null;

  for (const cols of dataLines) {
    if (isSectionRow(cols)) {
      currentSection = { titulo: cols[0].trim(), itens: [] };
      sections.push(currentSection);
    } else if (currentSection && cols[0] && cols[0].trim()) {
      currentSection.itens.push({
        erro: (cols[0] || "").trim(),
        nota: (cols[1] || "").trim(),
        gravidade: (cols[3] || "").trim(),
        consequencia: (cols[4] || "").trim(),
        visibilidade: (cols[5] || "").trim(),
      });
    }
  }

  return sections;
}

async function loadFromCSV(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro ao carregar planilha: ${response.status}`);
  const text = await response.text();
  return csvToData(text);
}
