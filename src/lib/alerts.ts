import type { Meeting } from "./meetings";

type A = Pick<Meeting, "starts_at" | "status">;

/** Internal alerts: upcoming (next 24h, open), overdue (past, still agendada/confirmada), awaiting confirmation (agendada, within 48h). */
export function classifyAlerts<T extends A>(list: T[], now = new Date()) {
  const t = now.getTime();
  const H = 3600_000;
  const open = (m: A) => m.status === "agendada" || m.status === "confirmada";
  const ts = (m: A) => new Date(m.starts_at).getTime();
  return {
    upcoming: list.filter((m) => open(m) && ts(m) >= t && ts(m) <= t + 24 * H),
    overdue: list.filter((m) => open(m) && ts(m) < t),
    awaiting: list.filter((m) => m.status === "agendada" && ts(m) >= t && ts(m) <= t + 48 * H),
  };
}
