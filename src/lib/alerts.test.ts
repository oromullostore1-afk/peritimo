import { describe, expect, it } from "vitest";
import { classifyAlerts } from "./alerts";

const now = new Date("2026-10-13T12:00:00Z");

describe("avisos", () => {
  it("reunião agendada no passado é atrasada", () => {
    expect(classifyAlerts([{ starts_at: "2026-10-13T10:00:00Z", status: "agendada" }], now).overdue).toHaveLength(1);
  });
  it("reunião realizada no passado não é atrasada", () => {
    expect(classifyAlerts([{ starts_at: "2026-10-13T10:00:00Z", status: "realizada" }], now).overdue).toHaveLength(0);
  });
  it("agendada em 30h aguarda confirmação mas não é próxima (24h)", () => {
    const r = classifyAlerts([{ starts_at: "2026-10-14T18:00:00Z", status: "agendada" }], now);
    expect(r.awaiting).toHaveLength(1);
    expect(r.upcoming).toHaveLength(0);
  });
});
