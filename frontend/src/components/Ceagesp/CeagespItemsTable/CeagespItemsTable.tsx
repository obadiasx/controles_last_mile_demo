import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { IShowDailyMissionItem } from "../../../interfaces/IDailyMission";
import CancelarCompraButton from "../../Itens/CancelarCompraButton";

interface CeagespItemsTableProps {
  items: IShowDailyMissionItem[];
  onPurchase: (item: IShowDailyMissionItem) => void;
  /** Substitui o lançamento (modal de correção com dados atuais). */
  onCorrigirCompra: (item: IShowDailyMissionItem) => void;
  missionDate: string;
  missionCompradorId: string;
}

const fmtBrl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const podeCorrigirCompra = (item: IShowDailyMissionItem) =>
  item.comprado &&
  item.fornecedor_id != null &&
  item.quantidade_adquirida != null &&
  item.unidade_comprada != null &&
  item.valor_unitario != null &&
  Boolean(item.forma_pagamento_ref_id);

const CeagespItemsTable = ({
  items,
  onPurchase,
  onCorrigirCompra,
  missionDate,
  missionCompradorId,
}: CeagespItemsTableProps) => {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflowX: "auto",
      }}
    >
      <Table size="medium" aria-label="Itens para compra">
        <TableHead>
          <TableRow
            sx={{
              bgcolor: "rgba(133, 66, 249, 0.08)",
              "& th": {
                fontWeight: 700,
                color: "text.primary",
                borderBottom: "2px solid",
                borderColor: "rgba(133, 66, 249, 0.35)",
              },
            }}
          >
            <TableCell>Produto</TableCell>
            <TableCell align="right" width={100}>
              Quantidade
            </TableCell>
            <TableCell align="center" width={88}>
              Unidade
            </TableCell>
            <TableCell align="center" width={150}>
              Limite máx.
            </TableCell>
            <TableCell align="center" width={130}>
              Status
            </TableCell>
            <TableCell align="right" width={120}>
              Ação
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const { descricao, codigo } = item.produto;
            const temTeto =
              item.valor_maximo_aceitavel != null &&
              Number(item.valor_maximo_aceitavel) > 0;

            const rowPending = !item.comprado;
            const rowLimiteAtivo = temTeto && !item.valor_liberado;

            return (
              <TableRow
                key={item.id}
                hover
                sx={{
                  "&:last-child td": { borderBottom: 0 },
                  ...(rowPending
                    ? {
                        bgcolor: "rgba(255, 243, 224, 0.75)",
                        boxShadow: rowLimiteAtivo
                          ? "inset 4px 0 0 #ed6c02"
                          : "inset 4px 0 0 rgba(133, 66, 249, 0.35)",
                      }
                    : {
                        bgcolor: "action.hover",
                        opacity: 0.92,
                      }),
                }}
              >
                <TableCell sx={{ maxWidth: { xs: 160, sm: 360 } }}>
                  <Typography fontWeight={600} noWrap title={descricao}>
                    {descricao}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cód. {codigo}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={500}>{item.quantidade}</Typography>
                </TableCell>
                <TableCell align="center">{item.unidade}</TableCell>
                <TableCell align="center">
                  {!temTeto ? (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          item.valor_liberado ? "success.main" : "warning.dark"
                        }
                      >
                        {fmtBrl(Number(item.valor_maximo_aceitavel))}
                      </Typography>
                      {item.valor_liberado ? (
                        <Chip
                          size="small"
                          label="Liberado"
                          color="success"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.7rem" }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Teto ativo"
                          color="warning"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.7rem" }}
                        />
                      )}
                    </Box>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={item.comprado ? "Comprado" : "Não comprado"}
                    color={item.comprado ? "success" : "error"}
                    variant={item.comprado ? "filled" : "outlined"}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.75,
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      disabled={item.comprado}
                      onClick={() => onPurchase(item)}
                      sx={{
                        bgcolor: "#8542F9",
                        "&:hover": { bgcolor: "#6b3dbc" },
                        "&.Mui-disabled": {
                          color: "rgba(255,255,255,0.8)",
                          bgcolor: "rgba(133, 66, 249, 0.35)",
                        },
                      }}
                    >
                      Comprar
                    </Button>
                    {podeCorrigirCompra(item) ? (
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        onClick={() => onCorrigirCompra(item)}
                        sx={{ minWidth: 120, fontSize: "0.75rem" }}
                      >
                        Corrigir compra
                      </Button>
                    ) : null}
                    <CancelarCompraButton
                      itemId={item.id}
                      comprado={item.comprado}
                      missionDate={missionDate}
                      missionCompradorId={missionCompradorId}
                      variant="table"
                    />
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CeagespItemsTable;
