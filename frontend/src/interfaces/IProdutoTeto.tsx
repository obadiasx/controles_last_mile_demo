export interface ITetoUnidadeLinha {
  unidade: string;
  qtde_kg: number | null;
  valor_maximo_aceitavel: number | null;
}

export interface ITetoEfetivoResponse {
  unidade: string;
  valor_maximo_aceitavel: number;
}
