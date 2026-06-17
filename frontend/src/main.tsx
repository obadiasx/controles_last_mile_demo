import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "./index.css";
import AllRoutes from "./routes";

const client = new QueryClient();

const theme = createTheme({
  palette: {
    primary: { main: "#8542F9" },
  },
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AllRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
);
