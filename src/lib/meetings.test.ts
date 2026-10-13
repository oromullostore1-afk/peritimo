import { describe, expect, it } from "vitest";
import { computeMetrics, findConflicts, interpolate, waLink } from "./meetings";
import { fromLocal, toLocalParts } from "./tz";

const now = new Date("2026-10-13T12:00:00Z");
const base = { held_at: null, no_show_at: null, proposal_sent_at: null, closed_at: null };

describe("métricas", () => {
  it("reuniões futuras não entram na taxa de comparecimento", () => {
    const m = computeMetrics(
      [
        { ...base, starts_at: "2026-10-12T12:00:00Z", status: "realizada", held_at: "2026-10-12T12:30:00Z" },
        { ...base, starts_at: "2026-10-12T14:00:00Z", status: "nao_compareceu", no_show_at: "x" },
        { ...base, starts_at: "2026-10-20T12:00:00Z", status: "agendada" },
      ],
      now,
    );
    expect(m.attendanceRate).toBe(0.5);
  });
  it("conversão = fechados / realizadas", () => {
    const m = computeMetrics(
      [
        { ...base, starts_at: "2026-10-10T12:00:00Z", status: "fechado", held_at: "x" },
        { ...base, starts_at: "2026-10-11T12:00:00Z", status: "realizada", held_at: "x" },
      ],
      now,
    );
    expect(m.conversionRate).toBe(0.5);
  });
});

describe("conflitos", () => {
  it("sobreposição do mesmo responsável gera conflito; outro responsável não", () => {
    const c = findConflicts([
      { id: "a", starts_at: "2026-10-13T13:00:00Z", duration_min: 60, responsible_id: "u1", status: "agendada" },
      { id: "b", starts_at: "2026-10-13T13:30:00Z", duration_min: 30, responsible_id: "u1", status: "confirmada" },
      { id: "c", starts_at: "2026-10-13T13:30:00Z", duration_min: 30, responsible_id: "u2", status: "agendada" },
    ]);
    expect([...c].sort()).toEqual(["a", "b"]);
  });
  it("reunião perdida não gera conflito", () => {
    const c = findConflicts([
      { id: "a", starts_at: "2026-10-13T13:00:00Z", duration_min: 60, responsible_id: "u1", status: "agendada" },
      { id: "b", starts_at: "2026-10-13T13:30:00Z", duration_min: 30, responsible_id: "u1", status: "perdido" },
    ]);
    expect(c.size).toBe(0);
  });
});

describe("fuso America/Cuiaba", () => {
  it("09:00 em Cuiabá é 13:00 UTC", () => {
    expect(fromLocal("2026-10-13", "09:00").toISOString()).toBe("2026-10-13T13:00:00.000Z");
    expect(toLocalParts("2026-10-13T13:00:00Z")).toEqual({ date: "2026-10-13", time: "09:00" });
  });
});

describe("scripts", () => {
  it("interpola nome/data/hora e gera link wa.me com DDI 55", () => {
    expect(interpolate("Oi {nome}, {data} às {hora}", { nome: "Ana", data: "13/10", hora: "09:00" })).toBe("Oi Ana, 13/10 às 09:00");
    expect(waLink("(65) 99999-0000", "oi")).toBe("https://wa.me/5565999990000?text=oi");
  });
});
