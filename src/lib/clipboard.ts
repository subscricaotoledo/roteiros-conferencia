import type { Item, Occurrence } from "../types";
import { formatApontamento } from "./format";

export function formatOne(item: Item, occ: Occurrence): string {
  return formatApontamento(item, occ);
}

export function copyToClipboard(
  text: string,
  showToast: (msg: string) => void,
): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copiado para a área de transferência"))
      .catch(() => fallbackCopy(text, showToast));
  } else {
    fallbackCopy(text, showToast);
  }
}

function fallbackCopy(
  text: string,
  showToast: (msg: string) => void,
): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast("Copiado para a área de transferência");
  } catch {
    /* noop */
  }
  document.body.removeChild(ta);
}
