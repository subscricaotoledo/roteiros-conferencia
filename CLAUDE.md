# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é isto

Uma SPA React usada pelos conferentes do Cartório Toledo para conferir escrituras/atos contra um checklist ("roteiro de conferência"), apontar erros por gravidade e gerar o texto pronto para colar na tela de "observações" do sistema do cartório. Os dados de cada roteiro vivem em uma planilha Google Sheets publicada como CSV e são buscados em tempo de execução via Axios — não existe arquivo local de dados para editar quando o conteúdo do checklist muda.

**As planilhas são a fonte de verdade dos dados, mas o layout de colunas delas é definido em código.** Renomear/adicionar uma coluna numa planilha real (ex.: a coluna que era "CONFERÊNCIA" virou "TIPO DE ERRO") não tem efeito nenhum sozinho — é preciso atualizar `CSV_STRUCTURES` em `src/lib/csv-loader.ts` (e normalmente também a renderização nos componentes) para o app passar a ler/exibir a coluna nova. Ao fazer uma mudança de estrutura de planilha, sempre pergunte/confirme se ela vale para todos os roteiros daquela `structure` ou só para o que foi mencionado — nem toda planilha "padrao" recebe a mesma edição ao mesmo tempo (colunas são checadas por nome de cabeçalho, então uma planilha que ainda não foi atualizada simplesmente não preenche aquele campo, sem quebrar).

## Stack

- **React 19** + **TypeScript 7** + **Vite 8**
- **Zustand 5** para state management (com `subscribeWithSelector`)
- **Axios** para fetch de CSVs
- **Tailwind CSS v4** com `@tailwindcss/vite` plugin (não usa CLI separado)

## Comandos

```bash
npm install           # instala dependências
npm run dev           # dev server com HMR (Vite)
npm run build         # tsc -b && vite build (output em dist/)
npm run preview       # serve dist/ localmente
npx tsc --noEmit      # checar tipos sem emitir
```

- Não há suíte de testes nem linter configurado. Para checar tipos, use `npx tsc --noEmit`.
- O app busca os CSVs via Axios no navegador, então é preciso usar o dev server (`npm run dev`); abrir o `index.html` direto como `file://` falha com CORS.

## Fluxo de git

Branch não é o padrão para toda tarefa — só crie uma quando o usuário disser explicitamente que está começando uma "feature", e só finalize/mergeie quando ele avisar que terminou. Para o resto (ajustes pontuais, correções de uma linha, scripts, docs) trabalhe direto na `main`, como antes.

Quando uma feature for aberta em branch: ao terminar, dê push e abra um PR (`gh pr create`). **Não** faça o merge do PR — o usuário revisa e mergeia no GitHub.

## Arquitetura

### Estrutura de pastas

```
src/
  App.tsx                  # Shell principal (grid 3 colunas)
  main.tsx                 # Entry point React
  types.ts                 # Tipos compartilhados (Item, Section, Occurrence, Roteiro, LoadResult)
  data/roteiros.ts         # Array ROTEIROS com key, label, desc, url, structure
  lib/
    csv-loader.ts          # Fetch + parse de CSV, discovery de aba "Partes" via pubhtml
    format.ts              # formatApontamento() e buildFullText() — regra de negócio do texto
    clipboard.ts           # copyToClipboard helper
  stores/
    useAppStore.ts         # Store Zustand com todo o state da aplicação
  components/
    SectionNav.tsx          # Sidebar esquerda — índice de seções com scroll spy
    FilterBar.tsx           # Card de filtros — seletor de roteiro, busca, gravidade, "somente apontados"
    RoteiroSelector.tsx     # Dropdown de seleção de roteiro
    SectionList.tsx         # Lista de seções com acordeão (uma seção aberta por vez)
    SectionItem.tsx         # Card de item individual com tags e botão apontar
    OccurrencePanel.tsx     # Panel de detalhe de cada ocorrência (parte, textarea, preview)
    ApontamentosPanel.tsx   # Coluna direita — lista de apontamentos + texto final editável
    Drawer.tsx              # Bottom sheet mobile (mesma funcionalidade do ApontamentosPanel)
    ConfirmModal.tsx        # Modal de confirmação (useConfirm hook, Promise-based)
    Toast.tsx               # Toast de feedback (useToast hook, com undo)
  styles/
    input.css              # Tokens de design + todos os estilos (processado pelo Tailwind v4)
```

### Fluxo de dados

O checklist de cada roteiro vive em uma planilha Google Sheets, publicada via *Arquivo → Compartilhar → Publicar na web* como CSV. O `csv-loader.ts` busca e faz o parse do CSV no navegador, sob demanda, sempre que um roteiro é selecionado.

Planilhas com a aba "Partes" são detectadas automaticamente: o loader busca o `/pubhtml` da planilha para descobrir os GIDs das abas, depois tenta cada aba não-principal como CSV até encontrar uma com header "PARTES". A coluna "MOSTRAR PARTES?" na aba principal controla se os chips de parte aparecem para cada item.

### Adicionar um novo roteiro

Adicionar uma entrada no array `ROTEIROS` em `src/data/roteiros.ts` (`key`, `label`, `desc`, `url`, `structure`). O dropdown é gerado a partir desse array — não há HTML por item.

### Parsing do CSV

`CSV_STRUCTURES` em `src/lib/csv-loader.ts` mapeia uma chave `structure` para nomes de cabeçalho:
- `padrao`: `erro`, `nota`, `tipo` (TIPO DE ERRO), `gravidade`, `consequencia`, `visibilidade`, `mostrarPartes` (MOSTRAR PARTES?)
- `arquivamento`: só `erro`, `nota`, `classificador`. Gravidade/consequência existem na planilha mas são deliberadamente ignorados nessa estrutura.

Colunas são localizadas pelo texto do cabeçalho, não por índice fixo.

### Detecção de título de seção

Uma linha do CSV só é tratada como título de seção se a coluna A estiver preenchida, todas as demais colunas estiverem vazias, **e** o texto estiver em CAIXA ALTA. Só checar "demais colunas vazias" não basta — roteiros `arquivamento` têm itens sem gravidade/consequência que seriam incorretamente lidos como títulos (bug que já aconteceu em produção).

### Regra de negócio — formato do texto gerado

Centralizado em `src/lib/format.ts`:

```
[<Gravidade>] <Título do item><parte?> [<Consequência>] — <detalhamento>
```

- `<Gravidade>` e `<Consequência>` são opcionais (itens de arquivamento não têm)
- `<parte?>` = ` (Comprador)` etc., só se selecionada
- **Copiar todos** = todas as ocorrências unidas por `\n\n`
- O texto final é editável pelo conferente antes de copiar; edição manual é descartada automaticamente se a base mudar (novo apontamento adicionado/removido)

### Persistência (localStorage)

- **Marks (apontamentos)**: salvos automaticamente a cada mudança via subscriber do Zustand. Chave: `rct_apont_<roteiroId>` (uma por roteiro).
- **Roteiro selecionado**: salvo como `rct_current_roteiro`. Restaurado automaticamente no mount do App.
- **Undo**: snapshot profundo antes de cada operação destrutiva (remover, limpar tudo, nova conferência). Toast com botão "Desfazer" por ~5s.
- Nunca limpar sem confirmação — todas as ações destrutivas passam pelo `useConfirm()` modal.

### Seções em acordeão

`toggleSection` e `focusSection` no store garantem que apenas uma seção fique aberta por vez. Ao selecionar um roteiro, nenhuma seção vem aberta. Clicar no SectionNav abre a seção clicada e fecha as demais.

### Gravidade é opcional

Itens de roteiros `arquivamento` não têm `gravidade`/`consequencia`. Qualquer código que renderiza esses campos precisa tratá-los como possivelmente vazios. A cor do card quando apontado segue a gravidade: verde para leve, amarelo para moderado, vermelho para grave, neutro para sem gravidade.

### A coluna "PODE/DEVE SER VISTO PELO CONFERENTE"

É lida do CSV mas **não é exibida** no sistema — faz sentido apenas na planilha. O campo `visibilidade` existe no tipo `Item` mas não é renderizado.

### Tokens de design

Vivem em `src/styles/input.css` dentro de `@theme`. O Tailwind v4 gera automaticamente classes utilitárias a partir dessas custom properties (ex.: `--color-azul` → `bg-azul`/`text-azul`/`border-azul`). Cores principais: `ink` (texto), `azul` (primária), `leve`/`moderado`/`grave` (gravidades), `paper` (fundo). Fontes: `IBM Plex Sans` (sans) + `Newsreader` (serif, só no título).

### Layout

Grid de 3 colunas responsivo:
- Mobile: 1 coluna + bottom sheet (Drawer) para apontamentos
- ≥1080px: 2 colunas (sidebar + main)
- ≥1380px: 3 colunas (sidebar 232px + main + painel direito 372px)

O Drawer é oculto no desktop (≥1380px) via CSS.

### Modal de confirmação

`useConfirm()` hook retorna uma função Promise-based. Opções: `title`, `message`, `confirmLabel`, `cancelLabel`, `destructive` (botão vermelho). Substituiu todos os `confirm()` nativos.

### Modal de texto expandido

Botão de expandir (ícone ↗) no textarea do texto final editável abre um modal grande para edição confortável de textos longos. Funciona tanto no ApontamentosPanel (desktop) quanto no Drawer (mobile).

## Deploy

Netlify e Vercel fazem build automático a partir de pushes na `main` (`npm run build`, publish `dist/`). Ambos `netlify.toml` e `vercel.json` definem `Cache-Control: no-cache` em HTML/JS/CSS — adicionado depois de um incidente de cache desatualizado. Se uma mudança publicada não aparecer, confira a aba "Deploys" do painel antes de assumir problema de cache.
