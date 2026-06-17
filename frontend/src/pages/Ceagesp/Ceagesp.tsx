import {
  Box,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks/auth/useAuth";
import { useDailyMission } from "../../hooks/fetch/dailyMission/useDailyMission";
import { useDailyMissionItens } from "../../hooks/fetch/dailyMission/useDailyMissionItens";
import type {
  IDailyMission,
  IShowDailyMissionItem,
} from "../../interfaces/IDailyMission";
import { hasPermission } from "../../utils/permissions";
import { usePermissions } from "../../hooks/auth/usePermissions";
import LoadingScreen from "../../components/Loading/LoadingScreen";
import ErrorMessage from "../../components/Error/ErrorMessage";
import CeagespItemsTable from "../../components/Ceagesp/CeagespItemsTable/CeagespItemsTable";
import CeagespModal, {
  type DadosCompraParaCorrecao,
} from "../../components/Modal/CeagespModal/CeagespModal";
import { formatISOToBR } from "../../utils/formateIsoDate";
import { sortCeagespItemsByPriority } from "../../utils/sortCeagespItems";

const ITEMS_PER_PAGE = 12;

function dadosCorrecaoParaModal(
  item: IShowDailyMissionItem,
): DadosCompraParaCorrecao | null {
  if (
    item.fornecedor_id == null ||
    item.quantidade_adquirida == null ||
    item.unidade_comprada == null ||
    item.valor_unitario == null
  ) {
    return null;
  }
  return {
    fornecedorId: item.fornecedor_id,
    nomeFornecedorFantasia: item.nome_fornecedor,
    quantidadeAdquirida: Number(item.quantidade_adquirida),
    unidadeComprada: item.unidade_comprada,
    valorUnitario: Number(item.valor_unitario),
    formaPagamentoId: item.forma_pagamento_ref_id ?? "",
    observacao: item.observacao,
  };
}

const Ceagesp = () => {
  const navigate = useNavigate();
  const todayISO = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const [selectedBuyer, setSelectedBuyer] = useState<string>("");
  const [verifyUser, setVerifyUser] = useState<string | undefined>(undefined);
  const { userId, isError, isLoading: loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [purchaseItem, setPurchaseItem] = useState<IShowDailyMissionItem | null>(
    null,
  );
  const [modoCorrecaoModal, setModoCorrecaoModal] = useState(false);

  const {
    user,
    isLoading: isLoadingPermissios,
    error: errorOnPermissions,
  } = usePermissions();

  useEffect(() => {
    if (isLoadingPermissios) return;
    if (!user) return;

    if (!hasPermission(user, "ceagesp:acessar")) {
      if (hasPermission(user, "solicitacoes_dia:ler")) {
        navigate("/dailymission", { replace: true });
      } else {
        navigate("/menuredirect", { replace: true });
      }
    }
  }, [user, isLoadingPermissios, navigate]);

  useEffect(() => {
    if (
      hasPermission(user, "conferencia:listar_divergencias") ||
      hasPermission(user, "produtos:atualiza_maximo_aceitavel")
    ) {
      setVerifyUser(undefined);
    } else {
      setVerifyUser(userId);
    }
  }, [user, userId]);

  const {
    data: dailyMission,
    isLoading: loadingDailyMission,
    error: errorDailyMission,
  } = useDailyMission(todayISO, verifyUser);

  const missionsByBuyer = useMemo(() => {
    if (!dailyMission) return {};

    return dailyMission.reduce(
      (acc: Record<string, IDailyMission[]>, mission: IDailyMission) => {
        const buyerName = mission.comprador.username;

        if (!acc[buyerName]) {
          acc[buyerName] = [];
        }

        acc[buyerName].push(mission);
        return acc;
      },
      {} as Record<string, IDailyMission[]>,
    );
  }, [dailyMission]);

  const selectedMission = useMemo(() => {
    if (!selectedBuyer || !missionsByBuyer[selectedBuyer]) return null;
    return missionsByBuyer[selectedBuyer][0] ?? null;
  }, [selectedBuyer, missionsByBuyer]);

  const selectedMissionId = selectedMission?.id ?? null;

  const {
    dailyMissionItens,
    isLoading: loadingItens,
    error: errorItens,
  } = useDailyMissionItens(selectedMissionId);

  const buyerNames = useMemo(
    () => Object.keys(missionsByBuyer).sort(),
    [missionsByBuyer],
  );

  const filteredItems = useMemo(() => {
    if (!dailyMissionItens?.length) return [];
    const q = filter.trim().toLowerCase();
    const base = !q
      ? dailyMissionItens
      : dailyMissionItens.filter((i) =>
          i.produto.descricao.toLowerCase().includes(q),
        );
    return sortCeagespItemsByPriority(base);
  }, [dailyMissionItens, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
  );

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (!buyerNames.length) return;

    setSelectedBuyer((current) =>
      current && buyerNames.includes(current) ? current : buyerNames[0],
    );
  }, [buyerNames]);

  useEffect(() => {
    setPage(1);
  }, [filter, selectedBuyer]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!loadingAuth && (isError || !userId)) {
      navigate("/login", { replace: true });
    }
  }, [loadingAuth, isError, userId, navigate]);

  if (loadingAuth || loadingDailyMission || loadingItens || isLoadingPermissios) {
    return <LoadingScreen />;
  }

  if (errorDailyMission || errorItens) {
    return <ErrorMessage message="Erro ao carregar os itens de compra." />;
  }

  if (errorOnPermissions) {
    return <ErrorMessage message="Usuário não autenticado" />;
  }

  const hasAnyItems = (dailyMissionItens?.length ?? 0) > 0;
  const emptyAfterFilter = hasAnyItems && filteredItems.length === 0;

  return (
    <>
      {purchaseItem ? (
        <CeagespModal
          key={`${purchaseItem.id}-${modoCorrecaoModal ? "corr" : "nova"}`}
          onClose={() => {
            setPurchaseItem(null);
            setModoCorrecaoModal(false);
          }}
          itemId={purchaseItem.id}
          itemCode={purchaseItem.produto.codigo}
          productDescription={purchaseItem.produto.descricao}
          requestedQuantity={purchaseItem.quantidade}
          requestedUnit={purchaseItem.unidade}
          modoCorrecao={modoCorrecaoModal}
          dadosCompraExistentes={
            modoCorrecaoModal ? dadosCorrecaoParaModal(purchaseItem) : null
          }
        />
      ) : null}

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, md: 3 },
          maxWidth: 1100,
          mx: "auto",
          width: "100%",
          mt: { xs: 6, md: 8 },
        }}
      >
        {buyerNames.length > 0 && verifyUser === undefined ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Box
              sx={{
                bgcolor: "white",
                borderRadius: 3,
                boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                px: 2,
              }}
            >
              <Tabs
                value={selectedBuyer}
                onChange={(_, value) => setSelectedBuyer(value)}
                variant="scrollable"
                scrollButtons="auto"
                TabIndicatorProps={{
                  sx: {
                    bgcolor: "#8542F9",
                    height: 4,
                    borderRadius: 2,
                  },
                }}
                sx={{
                  "& .MuiTab-root": {
                    fontSize: 15,
                    fontWeight: 600,
                    minHeight: 44,
                  },
                  "& .Mui-selected": {
                    color: "#8542F9",
                  },
                }}
              >
                {buyerNames.map((buyer) => (
                  <Tab key={buyer} value={buyer} label={buyer} />
                ))}
              </Tabs>
            </Box>
          </Box>
        ) : null}

        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Ordens de compra
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dia {formatISOToBR(todayISO)}
                {hasAnyItems
                  ? ` · ${filteredItems.length} ${
                      filteredItems.length === 1 ? "item" : "itens"
                    }`
                  : ""}
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Buscar produto…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={!hasAnyItems}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { sm: 280 }, maxWidth: { xs: "100%", sm: 360 } }}
            />
          </Stack>

          {!hasAnyItems ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                bgcolor: "#8542F9",
                borderRadius: 2,
                boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                minHeight: 120,
                p: 4,
              }}
            >
              <Typography fontWeight={600} color="white" textAlign="center">
                Nenhum pedido encontrado hoje.
              </Typography>
            </Box>
          ) : emptyAfterFilter ? (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography>
                Nenhum produto corresponde à busca. Limpe o filtro ou tente
                outro termo.
              </Typography>
            </Box>
          ) : (
            <>
              <CeagespItemsTable
                items={paginatedOrders}
                onPurchase={(item) => {
                  setModoCorrecaoModal(false);
                  setPurchaseItem(item);
                }}
                onCorrigirCompra={(item) => {
                  setModoCorrecaoModal(true);
                  setPurchaseItem(item);
                }}
                missionDate={selectedMission?.data ?? todayISO}
                missionCompradorId={selectedMission?.comprador_id ?? ""}
              />

              {totalPages > 1 ? (
                <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    shape="rounded"
                    color="primary"
                    sx={{
                      "& .Mui-selected": { bgcolor: "#8542F9 !important" },
                    }}
                  />
                </Stack>
              ) : null}
            </>
          )}
        </Stack>
      </Box>
    </>
  );
};

export default Ceagesp;
