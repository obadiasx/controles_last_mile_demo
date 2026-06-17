export interface IAuth {
  token: string;
  setToken: (token: string) => void;
  clearToken: () => void;
}
export interface Permission {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name?: string;
  name_full?: string;
  username?: string;
  email: string;
  permissions: Permission[];
  /** Nome da role no backend (ex.: comprador) — enviado em GET /users/me */
  role_name?: string;
}
