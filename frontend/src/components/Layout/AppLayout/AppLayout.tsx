import { useState, useEffect } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
} from "@mui/material";
import { Menu as MenuIcon, Logout, Person } from "@mui/icons-material";
import { Link, useLocation, useNavigate, Outlet } from "react-router";
import { AuthStore } from "../../../stores/AuthStore";
import { usePermissions } from "../../../hooks/auth/usePermissions";
import { MENU_ITEMS, MENU_SECTIONS } from "../../../config/menuConfig";
import { shouldShowMenuItem } from "../../../utils/permissions";
import { getMenuItemDisplayLabel } from "../../../utils/menuItemLabel";
import type { MenuSection } from "../../../config/menuConfig";

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { token, clearToken } = AuthStore((state) => state);
  const { user } = usePermissions();

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    setUserMenuAnchor(null);
    clearToken();
    navigate("/login", { replace: true });
  };

  const visibleItems = MENU_ITEMS.filter((item) =>
    shouldShowMenuItem(user, item),
  );

  const operacionalItems = visibleItems.filter(
    (item) => item.section === "operacional",
  );
  const adminItems = visibleItems.filter((item) => item.section === "admin");

  const renderMenuSection = (items: typeof visibleItems, section: MenuSection) => {
    if (items.length === 0) return null;
    return (
      <Box key={section} sx={{ mb: 1 }}>
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 1,
              display: "block",
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {MENU_SECTIONS[section]}
          </Typography>
        )}
        <List disablePadding>
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.id} disablePadding sx={{ display: "block" }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  onClick={() => isMobile && setDrawerOpen(false)}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    justifyContent: collapsed ? "center" : "flex-start",
                    "&.Mui-selected": {
                      bgcolor: "#8542F920",
                      color: "#8542F9",
                      "&:hover": { bgcolor: "#8542F930" },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 40,
                      color: isActive ? "#8542F9" : "inherit",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={getMenuItemDisplayLabel(item, user)}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar
        sx={{
          justifyContent: collapsed ? "center" : "flex-start",
          minHeight: 64,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {!collapsed && (
          <Typography
            sx={{
              color: "#8542F9",
              fontFamily: "Rhodium Libre, serif",
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            Distribuidora
          </Typography>
        )}
      </Toolbar>
      <Box sx={{ flex: 1, overflow: "auto", py: 2 }}>
        {renderMenuSection(operacionalItems, "operacional")}
        {renderMenuSection(adminItems, "admin")}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH}px)` },
          ml: { md: collapsed ? `${DRAWER_WIDTH_COLLAPSED}px` : `${DRAWER_WIDTH}px` },
          bgcolor: "#8542F9",
          boxShadow: "0 2px 8px rgba(133, 66, 249, 0.3)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontFamily: "Rhodium Libre, serif",
              fontWeight: 600,
            }}
          >
            Distribuidora de Alimentos
          </Typography>
          <IconButton
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "rgba(255,255,255,0.3)",
              }}
            >
              {(user?.name_full || user?.name || user?.username || "U").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.name_full || user?.name || user?.username || "Usuário"}
              </Typography>
            </MenuItem>
            <MenuItem component={Link} to="/perfil" onClick={() => setUserMenuAnchor(null)}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Meu perfil
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              top: 64,
              height: "calc(100% - 64px)",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
              top: 64,
              height: "calc(100% - 64px)",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: "hidden",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          mt: "64px",
          width: "100%",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
