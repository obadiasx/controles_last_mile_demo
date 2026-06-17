import axios from "axios";

// Em produção/Docker: usa /api (proxy reverso). Em dev local: usa URL direta do backend.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});