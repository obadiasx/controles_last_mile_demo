import { create } from "zustand";
import type { IAuth } from "../interfaces/IAuth";

export const AuthStore = create<IAuth>((set) => ({
  token: localStorage.getItem("token") || "",
  setToken: (token: string) => {
    localStorage.setItem("token", token); 
    set({ token });
  },
  clearToken: () => {
    localStorage.removeItem("token");
    set({ token: "" });
  },
}));
