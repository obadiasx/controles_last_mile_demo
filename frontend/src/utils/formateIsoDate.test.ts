import { describe, expect, it } from "vitest";
import { formatISOToBR } from "./formateIsoDate";

describe("formatISOToBR", () => {
  it("converte YYYY-MM-DD para DD/MM/YYYY", () => {
    expect(formatISOToBR("2026-04-11")).toBe("11/04/2026");
  });
});
