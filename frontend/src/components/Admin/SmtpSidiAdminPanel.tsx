import {
  Alert,
  Button,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ISidiDestinatario, ISidiSmtpConfig } from "../../interfaces/IConference";
import {
  createSidiDestinatarioFn,
  getSidiSmtpConfigFn,
  listSidiDestinatariosFn,
  saveSidiSmtpConfigFn,
  toggleSidiDestinatarioFn,
} from "../../services/admin/sidiNotificationAdmin";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

type Props = {
  token: string | undefined;
  /** Quando false, não dispara leituras na API (ex.: diálogo fechado). */
  active: boolean;
  /** Texto introdutório opcional */
  intro?: string;
};

/**
 * Painel de SMTP e destinatários da contingência SIDI.
 * Mesma configuração usada pelo envio de e-mail ao fornecedor (pedido direto).
 */
export default function SmtpSidiAdminPanel({ token, active, intro }: Props) {
  const queryClient = useQueryClient();
  const [smtpForm, setSmtpForm] = useState<ISidiSmtpConfig>({
    host: "",
    port: 465,
    username: "",
    password: "",
    use_tls: true,
    remetente_email: "",
    ativo: true,
    modo_contingencia_email_automatico: false,
  });
  const [novoDestinatario, setNovoDestinatario] = useState({
    nome: "",
    email: "",
    ativo: true,
  });
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const {
    data: destinatariosSidi = [],
    refetch: refetchDestinatariosSidi,
  } = useQuery<ISidiDestinatario[]>({
    queryKey: ["sidiDestinatarios", token],
    queryFn: () => listSidiDestinatariosFn(token!),
    enabled: !!token && active,
  });

  const { data: smtpCarregado, refetch: refetchSmtpConfig } = useQuery<ISidiSmtpConfig>({
    queryKey: ["sidiSmtpConfig", token],
    queryFn: () => getSidiSmtpConfigFn(token!),
    enabled: !!token && active,
    retry: false,
  });

  useEffect(() => {
    if (smtpCarregado) {
      setSmtpForm({
        ...smtpCarregado,
        modo_contingencia_email_automatico:
          smtpCarregado.modo_contingencia_email_automatico ?? false,
      });
    }
  }, [smtpCarregado]);

  useEffect(() => {
    if (!active) setErroLocal(null);
  }, [active]);

  const mutacaoSalvarSmtp = useMutation({
    mutationFn: (payload: ISidiSmtpConfig) => saveSidiSmtpConfigFn(token!, payload),
    onSuccess: async () => {
      setErroLocal(null);
      await refetchSmtpConfig();
      await queryClient.invalidateQueries({ queryKey: ["conferenceSidiSmtpConfig"] });
    },
    onError: (error: unknown) => {
      setErroLocal(getApiErrorMessage(error, "Falha ao salvar SMTP."));
    },
  });

  const mutacaoCriarDestinatario = useMutation({
    mutationFn: (payload: { nome: string; email: string; ativo: boolean }) =>
      createSidiDestinatarioFn(token!, payload),
    onSuccess: async () => {
      setNovoDestinatario({ nome: "", email: "", ativo: true });
      setErroLocal(null);
      await refetchDestinatariosSidi();
      await queryClient.invalidateQueries({ queryKey: ["conferenceSidiDestinatarios"] });
    },
    onError: (error: unknown) => {
      setErroLocal(getApiErrorMessage(error, "Falha ao criar destinatário."));
    },
  });

  const mutacaoAlternarDestinatario = useMutation({
    mutationFn: (payload: { id: number; ativo: boolean }) =>
      toggleSidiDestinatarioFn(token!, payload.id, payload.ativo),
    onSuccess: async () => {
      setErroLocal(null);
      await refetchDestinatariosSidi();
      await queryClient.invalidateQueries({ queryKey: ["conferenceSidiDestinatarios"] });
    },
    onError: (error: unknown) => {
      setErroLocal(getApiErrorMessage(error, "Falha ao atualizar destinatário."));
    },
  });

  if (!token) {
    return <Alert severity="warning">Sessão inválida.</Alert>;
  }

  const portaSslImplicito = smtpForm.port === 465;

  return (
    <Stack spacing={2}>
      <Alert severity="info" variant="outlined">
        <Typography variant="body2" component="span" display="block" fontWeight={600} gutterBottom>
          Parâmetros do provedor de e-mail
        </Typography>
        <Typography variant="body2" component="span" display="block">
          <strong>Saída (SMTP — este formulário):</strong> servidor{" "}
          <code>server9110.cloud.srv.br</code>, porta <strong>465</strong>, SSL implícito (o sistema
          usa conexão segura automática nesta porta).
        </Typography>
        <Typography variant="body2" component="span" display="block" sx={{ mt: 1 }}>
          <strong>Entrada (recebimento):</strong> mesmo host, porta <strong>995</strong> (POP3 com
          SSL) — serve apenas para configurar Outlook, celular etc. O ERP <strong>não</strong> usa
          servidor de entrada para enviar pedidos.
        </Typography>
      </Alert>
      {intro ? (
        <Typography variant="body2" color="text.secondary">
          {intro}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Esta configuração de SMTP é usada para o envio operacional (contingência SIDI e pedidos
          ao fornecedor por e-mail).
        </Typography>
      )}
      {erroLocal ? <Alert severity="error">{erroLocal}</Alert> : null}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Servidor SMTP (saída)"
            fullWidth
            placeholder="server9110.cloud.srv.br"
            value={smtpForm.host}
            onChange={(e) => setSmtpForm((s) => ({ ...s, host: e.target.value }))}
            helperText="Apenas envio; não confundir com POP/IMAP de entrada."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="Porta"
            type="number"
            fullWidth
            value={smtpForm.port}
            onChange={(e) =>
              setSmtpForm((s) => ({ ...s, port: Number(e.target.value) || 465 }))
            }
            helperText={
              portaSslImplicito
                ? "465 = SSL implícito (recomendado pelo provedor)."
                : "587 costuma usar STARTTLS (ative abaixo)."
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={smtpForm.use_tls}
                disabled={portaSslImplicito}
                onChange={(_, checked) =>
                  setSmtpForm((s) => ({ ...s, use_tls: checked }))
                }
              />
            }
            label="STARTTLS"
            sx={{ alignItems: "flex-start", ml: 0 }}
          />
          {portaSslImplicito ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.5 }}>
              Na porta 465 o TLS já é negociado na conexão (SSL implícito); não use STARTTLS.
            </Typography>
          ) : null}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Usuário SMTP"
            fullWidth
            value={smtpForm.username}
            onChange={(e) =>
              setSmtpForm((s) => ({ ...s, username: e.target.value }))
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Senha SMTP"
            type="password"
            fullWidth
            value={smtpForm.password}
            onChange={(e) =>
              setSmtpForm((s) => ({ ...s, password: e.target.value }))
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField
            label="E-mail remetente"
            fullWidth
            value={smtpForm.remetente_email}
            onChange={(e) =>
              setSmtpForm((s) => ({ ...s, remetente_email: e.target.value }))
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={smtpForm.ativo}
                onChange={(_, checked) =>
                  setSmtpForm((s) => ({ ...s, ativo: checked }))
                }
              />
            }
            label="SMTP ativo"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(smtpForm.modo_contingencia_email_automatico)}
                onChange={(_, checked) =>
                  setSmtpForm((s) => ({
                    ...s,
                    modo_contingencia_email_automatico: checked,
                  }))
                }
              />
            }
            label="Modo contingência SIDI (e-mail automático)"
            sx={{ alignItems: "flex-start", ml: 0 }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4 }}>
            Com esta opção ligada, ao concluir a conferência de todos os itens (pedido em
            &quot;Pronto para integração&quot;), o sistema envia o e-mail de contingência sem
            depender da liberação global do financeiro. Desligue quando a integração normal
            com o SIDI voltar a operar.
          </Typography>
        </Grid>
      </Grid>
      <Button
        variant="contained"
        onClick={() => mutacaoSalvarSmtp.mutate(smtpForm)}
        disabled={mutacaoSalvarSmtp.isPending}
      >
        Salvar SMTP
      </Button>
      <Divider />
      <Typography fontWeight={700}>Destinatários da contingência SIDI</Typography>
      <Typography variant="body2" color="text.secondary">
        Lista interna para digitação manual no SIDI (diferente do e-mail cadastrado por fornecedor).
      </Typography>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label="Nome"
            fullWidth
            value={novoDestinatario.nome}
            onChange={(e) =>
              setNovoDestinatario((s) => ({ ...s, nome: e.target.value }))
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            label="E-mail"
            fullWidth
            value={novoDestinatario.email}
            onChange={(e) =>
              setNovoDestinatario((s) => ({ ...s, email: e.target.value }))
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => mutacaoCriarDestinatario.mutate(novoDestinatario)}
            disabled={mutacaoCriarDestinatario.isPending}
          >
            Adicionar
          </Button>
        </Grid>
      </Grid>
      <List dense sx={{ maxHeight: 220, overflowY: "auto" }}>
        {destinatariosSidi.map((d) => (
          <ListItem
            key={d.id}
            secondaryAction={
              <Switch
                checked={d.ativo}
                onChange={(_, checked) =>
                  mutacaoAlternarDestinatario.mutate({ id: d.id, ativo: checked })
                }
              />
            }
          >
            <ListItemText
              primary={d.nome}
              secondary={`${d.email} ${d.ativo ? "(ativo)" : "(inativo)"}`}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
