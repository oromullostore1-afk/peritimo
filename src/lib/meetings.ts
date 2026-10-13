import type { Database } from "@/integrations/supabase/types";

export type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Segment = Database["public"]["Tables"]["segments"]["Row"];

export const STATUSES: { value: MeetingStatus; label: string; tone: string }[] = [
  { value: "agendada", label: "Agendada", tone: "bg-info/15 text-info border-info/30" },
  { value: "confirmada", label: "Confirmada", tone: "bg-lilac/15 text-lilac border-lilac/30" },
  { value: "realizada", label: "Realizada", tone: "bg-success/15 text-success border-success/30" },
  { value: "nao_compareceu", label: "Não compareceu", tone: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "reagendar", label: "Reagendar", tone: "bg-warning/15 text-warning border-warning/30" },
  { value: "proposta_enviada", label: "Proposta enviada", tone: "bg-primary/15 text-lilac border-primary/40" },
  { value: "fechado", label: "Fechado", tone: "bg-success/25 text-success border-success/50" },
  { value: "perdido", label: "Perdido", tone: "bg-muted text-muted-foreground border-border" },
];

export const statusLabel = (s: MeetingStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;
export const statusTone = (s: MeetingStatus) => STATUSES.find((x) => x.value === s)?.tone ?? "";

/** Statuses that don't occupy the calendar slot for conflict detection. */
const NON_BLOCKING: MeetingStatus[] = ["reagendar", "perdido"];

type Slot = Pick<Meeting, "id" | "starts_at" | "duration_min" | "responsible_id" | "status">;

/** Returns ids of meetings that overlap another meeting of the same responsible. */
export function findConflicts(list: Slot[]): Set<string> {
  const out = new Set<string>();
  const active = list.filter((m) => !NON_BLOCKING.includes(m.status));
  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    const aS = new Date(a.starts_at).getTime();
    const aE = aS + a.duration_min * 60000;
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      if (a.responsible_id !== b.responsible_id) continue;
      const bS = new Date(b.starts_at).getTime();
      const bE = bS + b.duration_min * 60000;
      if (aS < bE && bS < aE) {
        out.add(a.id);
        out.add(b.id);
      }
    }
  }
  return out;
}

type MetricInput = Pick<Meeting, "starts_at" | "status" | "held_at" | "no_show_at" | "proposal_sent_at" | "closed_at">;

export function computeMetrics(list: MetricInput[], now = new Date()) {
  const past = list.filter((m) => new Date(m.starts_at) < now);
  const held = past.filter((m) => m.held_at).length;
  const noShow = past.filter((m) => m.status === "nao_compareceu" || (m.no_show_at && !m.held_at)).length;
  const proposals = list.filter((m) => m.proposal_sent_at || m.status === "proposta_enviada").length;
  const closed = list.filter((m) => m.status === "fechado").length;
  const confirmed = list.filter((m) => m.status === "confirmada").length;
  const attendanceBase = held + noShow;
  return {
    total: list.length,
    confirmed,
    held,
    noShow,
    proposals,
    closed,
    attendanceRate: attendanceBase ? held / attendanceBase : null,
    conversionRate: held ? closed / held : null,
  };
}

export function pct(v: number | null) {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export function interpolate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

export function waLink(phone: string | null | undefined, text: string) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits && digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
