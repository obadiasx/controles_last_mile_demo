export const MENU_RULES = [
  {
    name: "Conferência",
    link: "/conference",
    permissions: [
      "conferencia:atualizacao",
      "conferencia:listar_pedidos",
      "conferencia:visualizar_detalhes",
      "conferencia:listar_divergencias",
      "solicitacoes_dia:atualizar",
    ],
  },
  {
    name: "Solicitações do Dia",
    link: "/dailymission",
    permissions: [
      "solicitacoes_dia:criar",
      "solicitacoes_dia:ler",
      "solicitacoes_dia:excluir",
      "comprador:listarAtivos",
      "comprador:listarCompradores",
      "solicitacoes_dia:atualizar",
      "usuarios:redefinirSenha",
      "produtos:atualiza_maximo_aceitavel",
      "fornecedores:atualizar",
      "produtos:atualiza_maximo_aceitavel",
    ],
  },
  {
    name: "CEAGESP",
    link: "/ceagesp",
    permissions: [
      "ceagesp:acessar",
      "solicitacoes_dia:atualizar",
      "solicitacoes_dia:excluir",
      "solicitacoes_dia:ler",
      "fornecedores:atualizar",
    ],
  },
];
