import { Edit } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { IConferenceOrder } from "../../../interfaces/IConference";
import { useState, type ReactNode } from "react";
import ConferenceModal from "../../Modal/ConferenceModal/ConferenceModal";
import { formattedDate } from "../../../utils/formatDate";
import { formattedTime } from "../../../utils/formatTime";
import {
  corChipFasePedido,
  corChipStatusConferencia,
} from "../../../utils/conferenceStatus";
import {
  conferentePodeEditarItem,
  labelFaseConferenciaPedido,
  labelStatusItemConferencia,
} from "../../../utils/conferenceUi";

const ConferenceCard = ({
  fornecedor,
  divergencia_id,
  item,
  produto,
  quantidade_esperada,
  observacoes,
  quantidade_fisica,
  status_conferencia,
  pedido_id,
  data_criacao,
  cancelado,
  origem_compra,
  pedido_concluido,
  fase_conferencia,
  tem_pendencia_financeira,
  unidade,
}: IConferenceOrder) => {
  const [modal, setModal] = useState<ReactNode>();

  const date = new Date(data_criacao || "");

  const statusColor = corChipStatusConferencia(status_conferencia);
  const faseColor = corChipFasePedido(fase_conferencia);

  const origemNormalizada = (origem_compra || "financeiro").toLowerCase();
  const origemEhComprador = origemNormalizada === "comprador";
  const origemLabel = origemEhComprador
    ? "Origem: Comprador"
    : "Origem: Financeiro";
  const origemStyles = origemEhComprador
    ? { bg: "#E8F5E9", color: "#1B5E20", side: "#2E7D32" }
    : { bg: "#E3F2FD", color: "#0D47A1", side: "#1565C0" };
  const pedidoExibicao = (() => {
    if (pedido_id >= 0) return String(pedido_id);
    const sufixo = String(Math.abs(pedido_id)).slice(-5);
    return `PD-${sufixo}`;
  })();

  const podeEditar = conferentePodeEditarItem(cancelado, status_conferencia);

  return (
    <>
      {modal}
      <Grid container justifyContent="center">
        <Card
          sx={{
            position: "relative",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            overflow: "hidden",
            width: "100%",
            maxWidth: 640,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: 18,
              bgcolor: origemStyles.side,
            }}
          />
          <CardContent sx={{ pl: { xs: 3, sm: 4 } }}>
            <Stack
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 1,
                pb: 2,
                mb: 3,
                borderBottom: "1px solid #eee",
              }}
            >
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  {fornecedor}
                </Typography>
                {cancelado ? (
                  <Chip
                    label="Cancelado"
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                ) : null}
                <Chip
                  label={origemLabel}
                  size="small"
                  sx={{
                    bgcolor: origemStyles.bg,
                    color: origemStyles.color,
                    fontWeight: 700,
                  }}
                />
                {fase_conferencia ? (
                  <Chip
                    label={labelFaseConferenciaPedido(fase_conferencia)}
                    size="small"
                    sx={{
                      bgcolor: faseColor.bg,
                      color: faseColor.color,
                      fontWeight: 700,
                    }}
                  />
                ) : null}
                {tem_pendencia_financeira ? (
                  <Chip
                    label="Pendência financeira"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
                {pedido_concluido ? (
                  <Chip
                    label="Pedido concluído"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
              </Box>

              <Box textAlign={{ xs: "left", sm: "right" }}>
                <Typography fontWeight={800} fontSize={14}>
                  Pedido {pedidoExibicao} · Item {item}
                </Typography>
              </Box>
            </Stack>

            <Box
              display="grid"
              sx={{
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Box>
                <Typography fontWeight={700} fontSize={13}>Produto</Typography>
                <Typography>{produto}</Typography>
              </Box>

              <Box>
                <Typography fontWeight={700} fontSize={13}>Qtd esperada</Typography>
                <Typography component="div">
                  {quantidade_esperada}{" "}
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    {unidade?.trim() ? unidade.trim() : "un"}
                  </Box>
                </Typography>
              </Box>

              <Box>
                <Typography fontWeight={700} fontSize={13}>Qtd física</Typography>
                <Typography>{quantidade_fisica}</Typography>
              </Box>

              <Box>
                <Typography fontWeight={700} fontSize={13}>Status da linha</Typography>
                <Box
                  sx={{
                    display: "inline-block",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: statusColor.bg,
                    color: statusColor.color,
                    fontWeight: 600,
                    mt: 0.5,
                  }}
                >
                  {labelStatusItemConferencia(status_conferencia)}
                </Box>
              </Box>

              <Box gridColumn="1 / -1">
                <Typography fontWeight={700} fontSize={13}>Observações</Typography>
                <Typography color="text.secondary">
                  {observacoes || "—"}
                </Typography>
              </Box>

              <Box gridColumn="1 / -1">
                <Typography fontWeight={700} fontSize={13}>Data de criação</Typography>
                <Typography>
                  {formattedDate(date)} às {formattedTime(date)}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" justifyContent="flex-end" mt={4}>
              <Tooltip
                title={
                  podeEditar
                    ? "Editar conferência"
                    : "Item encerrado ou cancelado — edição indisponível."
                }
              >
                <span>
                  <IconButton
                    disabled={!podeEditar}
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: "#f5f5f5",
                      "&:hover": {
                        bgcolor: "#8542F9",
                        color: "white",
                      },
                    }}
                    onClick={() =>
                      setModal(
                        <ConferenceModal
                          item={item}
                          fornecedor={fornecedor}
                          observacoes={observacoes}
                          produto={produto}
                          divergencia_id={divergencia_id}
                          quantidade_esperada={quantidade_esperada}
                          quantidade_fisica={quantidade_fisica}
                          status_conferencia={status_conferencia}
                          pedido_id={pedido_id}
                          origem_compra={origem_compra}
                          fase_conferencia={fase_conferencia}
                          tem_pendencia_financeira={tem_pendencia_financeira}
                          unidade={unidade}
                          onClose={() => setModal(undefined)}
                        />,
                      )
                    }
                  >
                    <Edit />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </>
  );
};

export default ConferenceCard;
