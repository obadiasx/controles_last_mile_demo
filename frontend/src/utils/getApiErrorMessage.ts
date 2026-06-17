import axios from "axios";

type FastApiDetail =
  | string
  | Array<{ msg?: string } | string>
  | Record<string, unknown>;

/**
 * Extrai mensagem legível de respostas de erro (FastAPI usa `detail`, não `message`).
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Não foi possível concluir a operação.",
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; detail?: FastApiDetail }
      | undefined;

    if (data?.message && typeof data.message === "string") {
      return data.message;
    }

    const detail = data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg?: string }).msg ?? "");
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length > 0) {
        return parts.join(" ");
      }
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}
