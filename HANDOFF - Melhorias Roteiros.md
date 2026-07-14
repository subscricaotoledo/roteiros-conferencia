# Handoff — Melhorias de usabilidade (Roteiros Conferência Toledo)

Documento para implementação no projeto local (React/Next + TailwindCSS) via Claude Code.
Descreve **comportamento**, não markup — o Claude Code monta o JSX/Tailwind seguindo os componentes que você já tem.

---

## 0. Regra de negócio central — formato do texto gerado

Toda a ferramenta gira em torno disto. O texto colado na tela de observações de CADA ocorrência é:

```
[<Gravidade>] <Título do item><parte?> — <detalhamento>
```

- `<Gravidade>` = `Leve` | `Moderado` | `Grave`
- `<parte?>` = ` (Comprador)` etc. **só se** a parte foi selecionada; senão vazio
- separador entre título e detalhamento = ` — ` (espaço, travessão, espaço)
- **Copiar todos** = todas as ocorrências de todos os itens, na ordem do roteiro, unidas por **linha em branco** (`\n\n`)

Exemplo de bloco final com 2 apontamentos:
```
[Leve] Ausência ou incorreção na data de lavratura — data por extenso divergente do numeral

[Grave] Regime de bens não informado no caso de parte casada (Vendedor) — não consta no ato
```

Centralize isso numa função única, ex.:
```ts
function formatApontamento(item, ocorrencia) {
  const parte = ocorrencia.parte ? ` (${ocorrencia.parte})` : "";
  const detalhe = (ocorrencia.detalhe ?? "").trim() || "…";
  return `[${GRAVIDADE[item.gravidade].label}] ${item.titulo}${parte} — ${detalhe}`;
}
```

---

## 1. Crítico

### 1a. Persistência (localStorage)
- Salvar o mapa de apontamentos em `localStorage` a cada alteração; recarregar no mount.
- Chave sugerida: `rct_apont_<roteiroId>` (uma por roteiro, pensando na expansão futura).
- Estrutura: `{ [itemId]: [{ parte: string, detalhe: string }, ...] }`.
- Nunca limpar sem confirmação (ver 1b).

### 1b. Confirmação + Desfazer
- **"Limpar tudo"** e **"Nova conferência"**: pedir confirmação antes de apagar.
- Após apagar/remover, mostrar toast com botão **"Desfazer"** por ~5s que restaura o snapshot anterior (guardar cópia profunda antes de mutar).

### 1c. Preview do texto final (por ocorrência)
- Abaixo de cada textarea de detalhamento, mostrar em tempo real o resultado de `formatApontamento(...)` ("Vai colar assim ↓"). Read-only.

---

## 2. Alto impacto

### 2a. Estado "apontado" visível na lista
- Assim que um item tem ≥1 ocorrência: destacar o card (fundo/borda esquerda colorida) e mostrar badge **"✓ apontado ×N"** (N = nº de ocorrências).
- Torna a leitura da lista rápida sem depender do filtro.

### 2b. Navegação entre seções
- Índice lateral (desktop) / acordeão (mobile) com as ~14 seções.
- Clicável (rola até a seção); no desktop, **destacar a seção atualmente visível** durante o scroll.
- Mostrar no índice quantos apontamentos cada seção já tem.

### 2c. Contadores com legenda
- Trocar "5/5" ambíguo por texto claro: **"3 apontados · 5 itens"**.
- Nas pills de gravidade, o número é a contagem daquela gravidade no roteiro.

### 2d. Layout largo (desktop)
- Sair da coluna estreita centralizada. Usar 3 colunas: **índice | roteiro | painel de apontamentos fixo à direita** (sticky), em vez de popup que cobre a tela.
- Mobile: coluna única + painel de apontamentos como **bottom sheet** acionado por botão fixo "Apontamentos (N)".

---

## 3. Refinamento

- **3a.** Rótulo do textarea: só **"Detalhamento (obrigatório)"**; o resto vira placeholder/hint discreto.
- **3b.** Separar contador de botão: badge "×N" no card **+** botão explícito **"+ adicionar ocorrência"**.
- **3c.** Toast de cópia padronizado: **"Copiado: 1 ocorrência"** / **"Copiado: 12 apontamentos"**.
- **3d.** Agrupar todos os filtros juntos (gravidade + "Somente apontados" na mesma linha).
- **3e.** Copy: "N itens de conferência" (não "N erros").
- **3f.** Campo **"Parte"** por ocorrência (Comprador / Vendedor / Doador / Donatário / Procurador / Outro) como chips selecionáveis, em vez de digitar — entra no texto entre parênteses.

---

## 4. Texto final consolidado — EDITÁVEL (última melhoria)

No painel de apontamentos (desktop) e no bottom sheet (mobile), acima de "Copiar todos":

- Bloco **"Texto final para a tela de observações"** = concatenação de todas as ocorrências (`\n\n`).
- É um **`<textarea>` editável**: o conferente pode ajustar o texto livremente antes de copiar.
- **"Copiar todos" copia o conteúdo editado**, não o gerado.
- Mostrar link **"Restaurar"** quando houver edição manual, que volta ao texto auto-gerado.
- Comportamento da edição vs. mudança de dados (escolha simples): guardar a edição junto com um "snapshot base" (o texto gerado no momento da edição). Se a base gerada mudar (novo apontamento adicionado/removido), a edição manual é descartada e o texto regenera. Isso evita texto "preso" desatualizado.

Estado sugerido:
```ts
const [editedFull, setEditedFull] = useState<string | null>(null);
const [editedBase, setEditedBase] = useState<string | null>(null);
const baseFull = useMemo(() => buildFullText(data), [data]);
const isEdited = editedFull !== null && editedBase === baseFull;
const fullText = isEdited ? editedFull : baseFull;
// onChange: setEditedFull(v); setEditedBase(baseFull);
// copiar: usa fullText
// restaurar: setEditedFull(null); setEditedBase(null);
```

---

## Prompt pronto para o Claude Code

> Estou melhorando a ferramenta de Roteiros de Conferência. Siga a especificação em `HANDOFF - Melhorias Roteiros.md`. Implemente por ordem de prioridade: primeiro os itens da seção 1 (persistência em localStorage, confirmação + desfazer, preview por ocorrência), depois a seção 2 (estado "apontado" no card, navegação por seções, contadores com legenda, layout de 3 colunas no desktop / bottom sheet no mobile), depois a 3 (refinamentos) e por fim a 4 (texto final consolidado editável). A regra do formato do texto (seção 0) deve ficar numa única função reutilizável. Reaproveite meus componentes e tokens Tailwind existentes; não introduza libs novas de UI. Mostre o diff de cada arquivo antes de aplicar.
