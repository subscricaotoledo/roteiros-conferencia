export interface Roteiro {
  key: string;
  label: string;
  desc?: string;
  url: string | null;
  structure: "padrao" | "arquivamento";
  status: "pronto" | "em-producao";
}

export interface Item {
  erro: string;
  nota: string;
  tipo: string;
  classificador: string;
  gravidade: string;
  consequencia: string;
  gravidadeArquivamento: string;
  consequenciaArquivamento: string;
  visibilidade: string;
  mostrarPartes: boolean;
}

export interface Section {
  titulo: string;
  itens: Item[];
}

export interface LoadResult {
  sections: Section[];
  partes: string[];
  tiposErro: string[];
}

export interface Occurrence {
  erro: string;
  gravidade: string;
  consequencia: string;
  classificacaoArquivamento: boolean;
  secao: string;
  detalhe: string;
  parte: string;
  tipoErro: string;
}
