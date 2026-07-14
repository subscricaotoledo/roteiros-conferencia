# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é isto

Um site estático (sem framework, sem bundler para o código do app) usado pelos conferentes do Cartório Toledo para conferir escrituras/atos contra um checklist ("roteiro de conferência"), apontar erros e gerar o texto pronto para colar na tela de "observações" do sistema do cartório. Os dados de cada roteiro vivem em uma planilha Google Sheets publicada como CSV e são buscados em tempo de execução — não existe arquivo local de dados para editar quando o conteúdo do checklist muda.

## Comandos

```bash
npm install       # instala @tailwindcss/cli (única dependência)
npm run build     # compila css/input.css -> css/output.css (minificado)
npm run dev       # o mesmo, em modo watch
```

- `css/output.css` está no `.gitignore` e é gerado — **sempre rode `npm run build` depois de editar `css/input.css`**, senão o site continua usando o CSS compilado anterior.
- Não há suíte de testes nem linter configurado. Para checar sintaxe de mudanças em JS, use `node --check js/app.js` e `node --check js/csv-loader.js`.
- O app busca os CSVs via `fetch()`, então abrir o `index.html` direto como URL `file://` falha com erro de CORS (`Origin: null` é bloqueado pela resposta do Google). Para testar localmente, sirva por HTTP, ex.: `npx serve .`, e abra a URL `http://localhost:...` impressa.

## Fluxo de git

Branch não é o padrão para toda tarefa — só crie uma quando o usuário disser explicitamente que está começando uma "feature", e só finalize/mergeie quando ele avisar que terminou. Para o resto (ajustes pontuais, correções de uma linha, scripts, docs) trabalhe direto na `main`, como antes.

Quando uma feature for aberta em branch: ao terminar, dê push e abra um PR (`gh pr create` — instale/autentique o `gh` se necessário, ou passe o link de criação de PR que o `git push` imprime). **Não** faça o merge do PR — o usuário revisa e mergeia no GitHub.

## Arquitetura

**Fluxo de dados:** o checklist de cada roteiro vive em uma planilha Google Sheets, publicada via *Arquivo → Compartilhar → Publicar na web* como CSV. Nada é buscado em tempo de build — o `js/csv-loader.js` busca e faz o parse do CSV no navegador, sob demanda, sempre que um roteiro é selecionado.

**Adicionar um novo roteiro** é uma mudança única: adicionar uma entrada no array `ROTEIROS` no topo do `js/app.js` (`key`, `label`, `desc`, `url`, `structure`). O menu suspenso é *gerado* a partir desse array por `renderRoteiroDropdown()` — o `index.html` só tem um container vazio `#roteiroDropdown`, não há HTML por item para editar manualmente. Um roteiro com `url: null` aparece como item desabilitado "Em breve".

**O parsing do CSV (`js/csv-loader.js`) é orientado por estrutura, não por posição de coluna.** `CSV_STRUCTURES` mapeia uma chave `structure` (declarada por roteiro em `ROTEIROS`) para o conjunto de *nomes de cabeçalho* de coluna que aquela estrutura usa — as colunas são localizadas pelo texto do cabeçalho, não por índice fixo, porque planilhas diferentes inserem colunas extras que deslocam as demais:
- `padrao`: `erro`, `nota`, `gravidade`, `consequencia`, `visibilidade`.
- `arquivamento`: só `erro`, `nota`, `classificador`. Essas planilhas ainda têm as colunas GRAVIDADE/CONSEQUÊNCIA/PODE-DEVE-SER-VISTO preenchidas (herdadas do template compartilhado), mas esse dado é deliberadamente ignorado nessa estrutura — roteiros de arquivamento só mostram a descrição do documento e a tag de classificador.

**A detecção de linha de título de seção é propositalmente estrita.** Uma linha do CSV só é tratada como título de seção se a coluna A estiver preenchida, todas as demais colunas estiverem vazias, **e** o texto estiver em CAIXA ALTA. Só checar "demais colunas vazias" não basta: roteiros de estrutura `arquivamento` têm itens de checklist sem gravidade/consequência preenchida também, que seriam incorretamente lidos como títulos de seção (isso aconteceu em produção — ver o histórico do git em torno dos roteiros de Arquivamento para a correção).

**Gravidade é opcional, não garantida.** Itens de roteiros `arquivamento` não têm `gravidade`/`consequencia`/`visibilidade`. Qualquer código que renderiza esses campos (tags em `render()`, `formatOne()` para o texto copiado, o título do item no drawer) precisa tratá-los como possivelmente vazios — isso já está tratado, mas vale lembrar ao mexer nesse código. O `item-bar` cai para um `bg-line` neutro quando não há gravidade para colorir.

**Copiar para a área de transferência (`formatOne` em `js/app.js`)** monta o bloco de texto simples que o conferente cola no sistema do cartório. O campo `detalhe` (anotação do próprio conferente) é obrigatório antes de poder copiar — `copyOccurrence`/`copyAll` bloqueiam, expandem e focam o primeiro campo vazio em vez de copiar um apontamento incompleto.

**Os tokens de design** vivem em `css/input.css` dentro de `@theme`. O Tailwind v4 gera automaticamente classes utilitárias a partir dessas custom properties (ex.: `--color-azul` → `bg-azul`/`text-azul`/`border-azul`), então renomear ou trocar a cor de um token em um único lugar repinta todos os usos — não precisa caçar nomes de classe individuais no markup.

**Deploy:** o Netlify faz build automático a partir de pushes na `main` (`npm run build`, publish `.`). O `netlify.toml` define `Cache-Control: no-cache` em HTML/JS/CSS — adicionado depois de um incidente de cache desatualizado em que atualizações não apareciam para visitantes que já tinham acessado o site antes. Se uma mudança publicada não aparecer, confira antes a aba "Deploys" do painel do Netlify — os deploys já travaram silenciosamente antes, sem ser um problema de cache.