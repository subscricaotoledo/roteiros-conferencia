import axios from "axios";
import type { Section, LoadResult } from "../types";

const CSV_STRUCTURES: Record<string, Record<string, string>> = {
  padrao: {
    erro: "ERRO",
    nota: "DETALHAMENTO DO ERRO",
    tipo: "TIPO DE ERRO",
    gravidade: "GRAVIDADE",
    consequencia: "CONSEQUÊNCIA",
    visibilidade: "PODE/DEVE SER VISTO PELO CONFERENTE",
    mostrarPartes: "MOSTRAR PARTES?",
  },
  arquivamento: {
    erro: "ERRO",
    nota: "DETALHAMENTO DO ERRO",
    classificador: "CLASSIFICADOR DE ARQUIVAMENTO",
  },
};

function parseCSV(text: string): string[][] {
  const rows: (string | null)[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
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
      rows.push(null);
    } else {
      current += ch;
    }
  }
  if (current) rows.push(current);

  const lines: string[][] = [];
  let line: string[] = [];
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

function isSectionRow(cols: string[]): boolean {
  const title = cols[0]?.trim();
  if (!title) return false;
  for (let i = 1; i < cols.length; i++) {
    if (cols[i]?.trim()) return false;
  }
  return title === title.toUpperCase();
}

function csvToData(csvText: string, structureKey: string): Section[] {
  const columns = CSV_STRUCTURES[structureKey] ?? CSV_STRUCTURES["padrao"]!;
  const lines = parseCSV(csvText);
  if (lines.length === 0) return [];

  const header = lines[0]!.map((h) => (h || "").trim().toUpperCase());
  const colIndex: Record<string, number> = {};
  Object.keys(columns).forEach((key) => {
    colIndex[key] = header.indexOf(columns[key]!);
  });
  const col = (cols: string[], key: string): string => {
    const i = colIndex[key];
    return i !== undefined && i >= 0 ? (cols[i] || "").trim() : "";
  };

  const dataLines = lines.slice(1);
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const cols of dataLines) {
    if (isSectionRow(cols)) {
      currentSection = { titulo: cols[0]!.trim(), itens: [] };
      sections.push(currentSection);
    } else if (currentSection && cols[0]?.trim()) {
      const mostrarPartesRaw = col(cols, "mostrarPartes").toUpperCase();
      currentSection.itens.push({
        erro: col(cols, "erro"),
        nota: col(cols, "nota"),
        tipo: col(cols, "tipo"),
        classificador: col(cols, "classificador"),
        gravidade: col(cols, "gravidade"),
        consequencia: col(cols, "consequencia"),
        visibilidade: col(cols, "visibilidade"),
        mostrarPartes: mostrarPartesRaw === "SIM",
      });
    }
  }

  return sections;
}

function csvToPartes(csvText: string): string[] {
  const lines = parseCSV(csvText);
  if (lines.length === 0) return [];
  const header = (lines[0]?.[0] || "").trim().toUpperCase();
  if (header !== "PARTES") return [];
  return lines.slice(1).map((row) => (row[0] || "").trim()).filter(Boolean);
}

function baseUrlFromPub(pubUrl: string): string {
  const match = pubUrl.match(
    /spreadsheets\/d\/e\/([^/]+)/,
  );
  if (!match) return "";
  return `https://docs.google.com/spreadsheets/d/e/${match[1]}`;
}

async function fetchSheetGids(pubUrl: string): Promise<string[]> {
  const base = baseUrlFromPub(pubUrl);
  if (!base) return [];
  try {
    const { data: html } = await axios.get<string>(base + "/pubhtml", {
      responseType: "text",
      timeout: 8000,
    });
    const gids: string[] = [];
    const regex = /gid=(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      if (!gids.includes(m[1]!)) gids.push(m[1]!);
    }
    return gids;
  } catch {
    return [];
  }
}

async function fetchPartes(pubUrl: string): Promise<string[]> {
  const gids = await fetchSheetGids(pubUrl);
  // Skip gid=0 (main sheet), try all others
  const otherGids = gids.filter((g) => g !== "0");
  for (const gid of otherGids) {
    try {
      const separator = pubUrl.includes("?") ? "&" : "?";
      const url = pubUrl + separator + "gid=" + gid + "&_cb=" + Date.now();
      const { data: csv } = await axios.get<string>(url, {
        responseType: "text",
        timeout: 8000,
      });
      const partes = csvToPartes(csv);
      if (partes.length > 0) return partes;
    } catch {
      // skip this gid
    }
  }
  return [];
}

export async function loadFromCSV(
  url: string,
  structureKey: string,
): Promise<LoadResult> {
  const cacheBuster = "_cb=" + Date.now();
  const separator = url.includes("?") ? "&" : "?";
  const [mainResp, partes] = await Promise.all([
    axios.get<string>(url + separator + cacheBuster, {
      responseType: "text",
      headers: { "Cache-Control": "no-cache" },
    }),
    fetchPartes(url),
  ]);
  const sections = csvToData(mainResp.data, structureKey);
  return { sections, partes };
}
