import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { AuthStore } from "../../../stores/AuthStore";
import type { IModalConferenceOrder } from "../../../interfaces/IConference";
import type { IConferenceOrderModal } from "../../../interfaces/IConference";
import { useUpdateConferenceOrder } from "../../../hooks/update/useUpdateConferenceOrder";
import {
  labelFaseConferenciaPedido,
  labelStatusItemConferencia,
} from "../../../utils/conferenceUi";

const STATUS_CONFERENTE_OPCOES = [
  "PendenteConferencia",
  "RecebidoConforme",
  "Parcial",
  "NaoRecebido",
  "RejeitadoConferencia",
  "RecebidoComDivergencia",
  "PendenteDecisaoFinanceiro",
] as const;

function statusPermitidoParaConferente(status: string | undefined): boolean {
  if (!status) return false;
  return STATUS_CONFERENTE_OPCOES.includes(
    status as (typeof STATUS_CONFERENTE_OPCOES)[number],
  );
}

const ConferenceModal = ({
  pedido_id,
  item,
  fornecedor,
  produto,
  quantidade_esperada,
  observacoes,
  quantidade_fisica,
  status_conferencia,
  onClose,
  origem_compra,
  fase_conferencia,
  tem_pendencia_financeira,
  unidade: unidadeInicial,
}: IConferenceOrderModal) => {
  const { token } = AuthStore((state) => state);
  const [notes, setNotes] = useState<string>(
    typeof observacoes === "string" ? observacoes : "",
  );
  const [qtdPhysical, setQtdPhysical] = useState<number>(
    quantidade_fisica ?? 0,
  );
  const [conferenceStatus, setConferenceStatus] = useState<string>(
    statusPermitidoParaConferente(status_conferencia)
      ? (status_conferencia as string)
      : "PendenteConferencia",
  );
  const { mutateUpdate, errorMessage } = useUpdateConferenceOrder();

  const origemNormalizada = (origem_compra || "financeiro").toLowerCase();
  const origemEhComprador = origemNormalizada === "comprador";

  const [qtdEsperadaEdit, setQtdEsperadaEdit] = useState<number>(
    quantidade_esperada ?? 0,
  );
  const [unidadeEdit, setUnidadeEdit] = useState<string>(
    (unidadeInicial ?? "").trim(),
  );
  const observacaoObrigatoriaRejeicao =
    conferenceStatus === "RejeitadoConferencia" && notes.trim().length === 0;

  const handleEditPurchaseOrder = () => {
    const updateData: IModalConferenceOrder = {
      pedido_id,
      item,
      token: token ?? undefined,
      notes,
      conferenceStatus,
      qtdPhysical,
      origem_compra:
        origemNormalizada === "comprador" ? "comprador" : "financeiro",
      fornecedor,
      produto,
      quantidade_esperada: qtdEsperadaEdit,
      unidade: unidadeEdit.trim() || null,
      quantidade_fisica: qtdPhysical,
      status_conferencia: conferenceStatus,
      observacoes: notes,
      divergencia_id: undefined,
    };

    mutateUpdate.mutate(updateData, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          component: "form",
        },
      }}
      fullWidth
    >
      <DialogTitle sx={{ textAlign: "center" }}>
        Detalhe da conferência
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {errorMessage ? (
            <Alert severity="error">
              {errorMessage}
              {/Item de Conferência não encontrado/i.test(errorMessage) ? (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  O registro não existe mais na fila de conferência (por exemplo, foi
                  excluído no banco enquanto o card ainda aparecia). A lista foi
                  atualizada — feche o modal e confira. Se necessário, use{" "}
                  <strong>Sincronizar</strong> na tela de conferência para alinhar com
                  o app.
                </Typography>
              ) : null}
            </Alert>
          ) : null}
          {tem_pendencia_financeira ? (
            <Alert severity="warning">
              Este pedido possui linha(ns) aguardando decisão do financeiro. A
              fase do pedido pode refletir essa pendência.
            </Alert>
          ) : null}
          {!origemEhComprador ? (
            <Alert severity="info">
              Item de compra direta do financeiro: faça uma conferência minuciosa
              de quantidade, unidade e qualidade recebida.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">
              <strong>Fase do pedido:</strong>{" "}
              {labelFaseConferenciaPedido(fase_conferencia)}
            </Typography>
          </Stack>

          <Typography>
            <strong>Fornecedor:</strong> {fornecedor}
          </Typography>
          <Typography>
            <strong>Produto:</strong> {produto}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Origem: {origemEhComprador ? "Comprador (CEAGESP / app)" : "Compra direta — financeiro"}
          </Typography>

          {origemEhComprador ? (
            <>
              <TextField
                variant="outlined"
                type="number"
                value={qtdEsperadaEdit}
                label="Quantidade esperada"
                InputProps={{ readOnly: true }}
                helperText="Somente leitura — dados da compra."
              />
              <TextField
                variant="outlined"
                value={unidadeEdit || "—"}
                label="Unidade esperada"
                InputProps={{ readOnly: true }}
                helperText="Somente leitura para compra via comprador."
              />
            </>
          ) : (
            <>
              <TextField
                variant="outlined"
                type="number"
                value={qtdEsperadaEdit}
                onChange={(e) => {
                  const v = e.target.value;
                  setQtdEsperadaEdit(v === "" ? 0 : Number(v));
                }}
                label="Quantidade esperada"
                helperText="Editável na compra direta pelo financeiro."
              />
              <TextField
                variant="outlined"
                value={unidadeEdit}
                onChange={(e) => setUnidadeEdit(e.target.value.slice(0, 6))}
                label="Unidade esperada"
                placeholder="Ex.: KG, CX"
                helperText="Até 6 caracteres."
              />
            </>
          )}

          <TextField
            variant="outlined"
            type="number"
            value={qtdPhysical}
            onChange={(e) => {
              const val = e.target.value;
              setQtdPhysical(val === "" ? 0 : Number(val));
            }}
            label="Quantidade física recebida"
            helperText="Informe o que foi recebido na doca."
          />
          <TextField
            variant="outlined"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            label="Observações"
            required={conferenceStatus === "RejeitadoConferencia"}
            error={observacaoObrigatoriaRejeicao}
            helperText={
              observacaoObrigatoriaRejeicao
                ? "Obrigatório informar o motivo da rejeição."
                : undefined
            }
          />

          <FormControl fullWidth variant="outlined">
            <InputLabel id="status-item-label">Resultado da conferência</InputLabel>
            <Select
              labelId="status-item-label"
              id="status-select"
              value={conferenceStatus}
              onChange={(e) => setConferenceStatus(e.target.value)}
              label="Resultado da conferência"
            >
              {STATUS_CONFERENTE_OPCOES.map((status) => (
                <MenuItem key={status} value={status}>
                  {labelStatusItemConferencia(status)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button sx={{ color: "#8542F9" }} onClick={onClose}>
          Fechar
        </Button>
        <Button
          onClick={handleEditPurchaseOrder}
          variant="contained"
          disabled={mutateUpdate.isPending || observacaoObrigatoriaRejeicao}
          sx={{ bgcolor: "#8542F9" }}
        >
          {mutateUpdate.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConferenceModal;
