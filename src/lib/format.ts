import type { Item, Occurrence } from "../types";

export function formatApontamento(item: Item, occ: Occurrence): string {
  const gravidade = item.gravidade || occ.gravidade;
  const prefix = gravidade ? `[${gravidade}] ` : "";
  const parte = occ.parte ? ` (${occ.parte})` : "";
  const consequencia = item.consequencia ? ` [${item.consequencia}]` : "";
  const detalhe = (occ.detalhe ?? "").trim() || "…";
  return `${prefix}${item.erro}${parte}${consequencia} — ${detalhe}`;
}

export function buildFullText(
  marks: Record<string, Occurrence[]>,
  dataItems: Map<string, Item>,
): string {
  const blocks: string[] = [];
  Object.keys(marks).forEach((id) => {
    const occs = marks[id] ?? [];
    const item = dataItems.get(id);
    if (!item) return;
    occs.forEach((occ) => {
      blocks.push(formatApontamento(item, occ));
    });
  });
  return blocks.join("\n\n");
}
