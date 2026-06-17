import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "../../hooks/auth/usePermissions";
import { AuthStore } from "../../stores/AuthStore";
import { hasPermission, isAdmin } from "../../utils/permissions";
import type { IProduct } from "../../interfaces/IProduct";
import { FetchProductsFn } from "../../services/fetch/products/FetchProducts";
import { fetchProdutoTetosPrecoFn } from "../../services/fetch/products/FetchProdutoTetosPreco";
import { putProdutoTetosPrecoFn } from "../../services/update/produto/PutProdutoTetosPreco";
import ErrorMessage from "../../components/Error/ErrorMessage";
import LoadingScreen from "../../components/Loading/LoadingScreen";

const BRAND = "#8542F9";

const podeAcessar = (user: Parameters<typeof hasPermission>[0]) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const r = user.role_name?.toLowerCase();
  return (
    hasPermission(user, "produtos:atualiza_maximo_aceitavel") &&
    (r === "financeiro" || r === "administrador")
  );
};

const ProdutoTetoPreco = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = AuthStore((state) => state);
  const { user, isLoading: loadingUser } = usePermissions();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [productInput, setProductInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<IProduct | null>(null);

  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loadingUser || !user) return;
    if (!podeAcessar(user)) {
      navigate("/menuredirect", { replace: true });
    }
  }, [user, navigate, loadingUser]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected) return;
    debounceRef.current = setTimeout(() => {
      const q = productInput.trim();
      setSearch(q.length >= 2 ? q : "");
    }, 380);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [productInput, selected]);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["produtosSearch", search],
    queryFn: () => FetchProductsFn(token!, search),
    enabled: Boolean(token && search.length >= 2),
  });

  const codigo = selected?.codigo;

  const {
    data: linhas = [],
    isLoading: loadingTetos,
    error: errorTetos,
    isFetching: fetchingTetos,
  } = useQuery({
    queryKey: ["produtoTetos", codigo],
    queryFn: () => fetchProdutoTetosPrecoFn(token!, codigo!),
    enabled: Boolean(token && codigo != null),
  });

  useEffect(() => {
    if (!linhas.length) {
      setDraft({});
      return;
    }
    const next: Record<string, string> = {};
    for (const l of linhas) {
      const v = l.valor_maximo_aceitavel;
      next[l.unidade] =
        v != null && Number(v) > 0 ? String(Number(v)) : "";
    }
    setDraft(next);
  }, [linhas]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const tetos = linhas.map((l) => {
        const raw = (draft[l.unidade] ?? "").trim().replace(",", ".");
        const n = parseFloat(raw);
        return {
          unidade: l.unidade,
          valor_maximo_aceitavel:
            Number.isFinite(n) && n > 0 ? n : null,
        };
      });
      return putProdutoTetosPrecoFn(token!, codigo!, tetos);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["produtoTetos", codigo], data);
    },
  });

  const tituloProduto = useMemo(
    () =>
      selected
        ? `${selected.descricao ?? "Produto"} (cód. ${selected.codigo})`
        : "",
    [selected],
  );

  if (loadingUser) {
    return <LoadingScreen />;
  }

  if (!user || !podeAcessar(user)) {
    return null;
  }

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: { xs: 2, md: 3 },
        maxWidth: 960,
        mx: "auto",
        width: "100%",
        mt: { xs: 6, md: 8 },
      }}
    >
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tetos de preço por unidade
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Defina o valor máximo aceitável por unidade de compra (caixa, kg, etc.).
        Não é obrigatório preencher todas as unidades. Se a unidade da compra
        tiver teto aqui, vale só ele. Se não tiver: com <strong>uma</strong>{" "}
        outra unidade com teto, o sistema converte por essa regra; com{" "}
        <strong>duas ou mais</strong> outras, usa o maior R$/kg entre elas (e
        converte para a unidade da compra).
      </Typography>

      <Paper elevation={0} sx={{ p: 2, mb: 2, border: 1, borderColor: "divider" }}>
        <Autocomplete
          options={selected ? [selected] : products}
          loading={loadingProducts && search.length >= 2}
          filterOptions={(o) => o}
          getOptionLabel={(o) => `${o.descricao} (${o.codigo})`}
          isOptionEqualToValue={(a, b) => a.codigo === b.codigo}
          value={selected}
          onChange={(_, v) => {
            setSelected(v);
            if (v) setProductInput(v.descricao ?? "");
            else setProductInput("");
          }}
          inputValue={selected ? selected.descricao ?? "" : productInput}
          onInputChange={(_, v, reason) => {
            if (reason === "reset") return;
            if (!selected) setProductInput(v);
          }}
          noOptionsText={
            productInput.trim().length < 2
              ? "Digite pelo menos 2 caracteres"
              : loadingProducts
                ? "Buscando…"
                : "Nenhum produto"
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Produto"
              placeholder="Buscar por nome"
              helperText="Selecione um produto para editar os tetos por unidade."
            />
          )}
        />
      </Paper>

      {selected && errorTetos ? (
        <ErrorMessage message={(errorTetos as Error).message} />
      ) : null}

      {selected && (loadingTetos || fetchingTetos) ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: BRAND }} />
        </Box>
      ) : null}

      {selected && !loadingTetos && !errorTetos && linhas.length === 0 ? (
        <Alert severity="warning">
          Nenhuma unidade sincronizada para este produto. Sincronize unidades antes
          de cadastrar tetos.
        </Alert>
      ) : null}

      {selected && linhas.length > 0 ? (
        <Paper elevation={0} sx={{ border: 1, borderColor: "divider", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {tituloProduto}
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Unidade</TableCell>
                <TableCell align="right">Fator kg (cadastro)</TableCell>
                <TableCell align="right">Valor máx. aceitável (R$ / unidade)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {linhas.map((row) => (
                <TableRow key={row.unidade}>
                  <TableCell>{row.unidade}</TableCell>
                  <TableCell align="right">
                    {row.qtde_kg != null
                      ? row.qtde_kg.toLocaleString("pt-BR", {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ maxWidth: 220 }}>
                    <TextField
                      size="small"
                      type="text"
                      placeholder="Em branco = sem teto"
                      value={draft[row.unidade] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [row.unidade]: e.target.value }))
                      }
                      fullWidth
                      inputProps={{ inputMode: "decimal" }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack direction="row" spacing={2} sx={{ p: 2, justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              sx={{ bgcolor: BRAND, "&:hover": { bgcolor: "#6b35cc" } }}
              startIcon={
                saveMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
            >
              Salvar tetos
            </Button>
          </Stack>
          {saveMutation.isError ? (
            <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
              {(saveMutation.error as Error).message}
            </Alert>
          ) : null}
          {saveMutation.isSuccess ? (
            <Alert severity="success" sx={{ mx: 2, mb: 2 }} onClose={() => saveMutation.reset()}>
              Tetos salvos com sucesso.
            </Alert>
          ) : null}
        </Paper>
      ) : null}

    </Box>
  );
};

export default ProdutoTetoPreco;
