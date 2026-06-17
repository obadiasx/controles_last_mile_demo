import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { useFetchSuppliers } from "../../hooks/fetch/suppliers/useFetchSuppliers";
import { useFetchFormasPagamento } from "../../hooks/fetch/formasPagamento/useFetchFormasPagamento";
import { patchFornecedorFormaPadraoFn } from "../../services/update/fornecedor/PatchFornecedorFormaPadrao";
import { patchFornecedorEmailEnvioFn } from "../../services/update/fornecedor/PatchFornecedorEmailEnvio";
import { AuthStore } from "../../stores/AuthStore";
import { hasPermission, isAdmin } from "../../utils/permissions";
import type { ISupplier } from "../../interfaces/ISupplier";

const podeAcessarFinanceiro = (user: Parameters<typeof hasPermission>[0]) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const r = user.role_name?.toLowerCase();
  return r === "financeiro" || r === "administrador";
};

const FornecedorFormaPagamento = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);
  const { user, isLoading: loadingUser } = usePermissions();

  const supplierDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supplierInput, setSupplierInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(null);
  const [formaId, setFormaId] = useState<string>("");
  const [emailEnvio, setEmailEnvio] = useState("");

  const {
    suppliers = [],
    isLoading: loadingSuppliers,
    error: errorSuppliers,
  } = useFetchSuppliers(search);

  const { formas, isLoading: loadingFormas, error: errorFormas } =
    useFetchFormasPagamento(Boolean(token));

  useEffect(() => {
    if (loadingUser || !user) return;
    if (!hasPermission(user, "fornecedores:atualizar") && !isAdmin(user)) {
      navigate("/menuredirect", { replace: true });
      return;
    }
    if (!podeAcessarFinanceiro(user)) {
      navigate("/menuredirect", { replace: true });
    }
  }, [user, navigate, loadingUser]);

  useEffect(() => {
    if (supplierDebounceRef.current) clearTimeout(supplierDebounceRef.current);
    if (selectedSupplier) return;

    supplierDebounceRef.current = setTimeout(() => {
      const q = supplierInput.trim();
      setSearch(q.length >= 2 ? q : "");
    }, 380);

    return () => {
      if (supplierDebounceRef.current) {
        clearTimeout(supplierDebounceRef.current);
      }
    };
  }, [supplierInput, selectedSupplier]);

  useEffect(() => {
    if (!selectedSupplier) {
      setFormaId("");
      setEmailEnvio("");
      return;
    }
    setFormaId(selectedSupplier.forma_pagamento_padrao?.id ?? "");
    setEmailEnvio(selectedSupplier.email?.trim() ?? "");
  }, [selectedSupplier]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const sid = selectedSupplier!.id;
      await patchFornecedorFormaPadraoFn(
        token!,
        sid,
        formaId === "" ? null : formaId,
      );
      const atualizado = await patchFornecedorEmailEnvioFn(
        token!,
        sid,
        emailEnvio.trim() === "" ? null : emailEnvio.trim(),
      );
      return atualizado;
    },
    onSuccess: (data) => {
      setSelectedSupplier(data);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  if (loadingUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !podeAcessarFinanceiro(user)) {
    return null;
  }

  const supplierOptions = errorSuppliers ? [] : suppliers;

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Fornecedor — pagamento e e-mail de pedido
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Defina a forma de pagamento padrão e o e-mail usado para enviar pedidos diretos ao
        fornecedor. No CEAGESP, o comprador não poderá alterar a forma quando já houver padrão
        cadastrado.
      </Typography>

      {errorFormas ? (
        <Alert severity="error">Erro ao carregar o catálogo de formas de pagamento.</Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Autocomplete
            options={supplierOptions}
            loading={loadingSuppliers && search.length >= 2}
            filterOptions={(opts) => opts}
            getOptionLabel={(o) => o.fantasia}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedSupplier}
            onChange={(_, v) => {
              setSelectedSupplier(v);
              if (v) setSupplierInput(v.fantasia);
              else {
                setSupplierInput("");
                setSearch("");
              }
            }}
            inputValue={selectedSupplier ? selectedSupplier.fantasia : supplierInput}
            onInputChange={(_, newInput, reason) => {
              if (reason === "reset") return;
              if (!selectedSupplier) {
                setSupplierInput(newInput);
              }
            }}
            noOptionsText={
              supplierInput.trim().length < 2
                ? "Digite pelo menos 2 caracteres"
                : loadingSuppliers
                  ? "Buscando…"
                  : "Nenhum fornecedor encontrado"
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Fornecedor"
                placeholder="Buscar por fantasia"
              />
            )}
          />

          <FormControl fullWidth disabled={!selectedSupplier || loadingFormas}>
            <InputLabel id="forma-label">Forma de pagamento padrão</InputLabel>
            <Select
              labelId="forma-label"
              label="Forma de pagamento padrão"
              value={formaId}
              onChange={(e) => setFormaId(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Sem padrão (comprador escolhe na compra)</em>
              </MenuItem>
              {formas.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.descricao}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="E-mail para envio do pedido"
            type="email"
            fullWidth
            disabled={!selectedSupplier}
            value={emailEnvio}
            onChange={(e) => setEmailEnvio(e.target.value)}
            helperText="Usado em Pedido ao fornecedor (e-mail). Deixe em branco se não houver contato eletrônico."
          />

          <Button
            variant="contained"
            disabled={
              !selectedSupplier || saveMutation.isPending || loadingFormas
            }
            onClick={() => saveMutation.mutate()}
            startIcon={
              saveMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
          >
            Salvar
          </Button>

          {saveMutation.isError ? (
            <Alert severity="error">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Falha ao salvar."}
            </Alert>
          ) : null}
          {saveMutation.isSuccess ? (
            <Alert severity="success" onClose={() => saveMutation.reset()}>
              Dados do fornecedor atualizados.
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
};

export default FornecedorFormaPagamento;
