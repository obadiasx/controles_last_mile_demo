import { Box, Typography } from "@mui/material";
import RedirectCard from "../../components/Cards/RedirectCard/RedirectCard";
import { useMemo } from "react";
import { usePermissions } from "../../hooks/auth/usePermissions";
import ErrorMessage from "../../components/Error/ErrorMessage";
import { MENU_ITEMS } from "../../config/menuConfig";
import { shouldShowMenuItem } from "../../utils/permissions";
import { getMenuItemDisplayLabel } from "../../utils/menuItemLabel";

const MenuRedirect = () => {
  const {
    user,
    isLoading: isLoadingPermissios,
    error: errorOnPermissions,
  } = usePermissions();

  const showMenu = useMemo(() => {
    if (!user) return [];
    return MENU_ITEMS.filter((item) => shouldShowMenuItem(user, item)).map(
      (item) => ({
        id: item.id,
        name: getMenuItemDisplayLabel(item, user),
        link: item.path,
      }),
    );
  }, [user]);

  if (errorOnPermissions) {
    return <ErrorMessage message="Erro ao carregar permissões." />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Box
        aria-label="Distribuidora de Alimentos"
        sx={{
          width: 88,
          height: 88,
          mb: 1,
          borderRadius: "22px",
          bgcolor: "#8542F9",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Rhodium Libre",
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        DA
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography
          sx={{ fontFamily: "Rhodium Libre" }}
          variant="h5"
          gutterBottom
          textAlign="center"
        >
          Seja bem-vindo à Distribuidora de Alimentos!
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Use o menu lateral para navegar entre os módulos.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, auto)",
          },
          gap: 3,
          justifyContent: "center",
          justifyItems: "center",
          width: "100%",
          maxWidth: 900,
          px: 2,
          marginTop: 4,
        }}
      >
        {showMenu.map((item, index) => {
          const isLastSingle =
            showMenu.length % 2 === 1 && index === showMenu.length - 1;

          return (
            <Box
              key={item.id}
              sx={{
                gridColumn: {
                  xs: "auto",
                  sm: isLastSingle ? "1 / -1" : "auto",
                },
                display: "flex",
                justifyContent: "center",
              }}
            >
              <RedirectCard link={item.link} name={item.name} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MenuRedirect;
