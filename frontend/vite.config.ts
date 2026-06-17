import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@api": path.resolve(__dirname, "src/services/urlAxios.tsx"),
    },
  },
  server: {
    // Evita abrir o browser no CI / Playwright (pode travar o webServer).
    open: process.env.CI !== "true",
    port: 3000,
    host: true,
  },
});
