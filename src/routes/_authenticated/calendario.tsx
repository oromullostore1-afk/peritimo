import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingDialog } from "@/components/MeetingDialog";
import { statusTone, type Meeting } from "@/lib/meetings";
import { addDays, addMonths, fmtDay, fmtTime, startOfMonth, startOfWeek, toLocalParts, todayLocal } from "@/lib/tz";
import { useMeetings } from "@/lib/useMeetings";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — PERITMO" }, { name: "description", content: "Calendário semanal e mensal de reuniões." }] }),
  component: Page,
});

function Page() {
  const { data } = useMeetings();
  const [view, setView] = useState<"semana" | "mes">("semana");
  const [anchor, setAnchor] = useState(todayLocal());
  const [dlg, setDlg] = useState<{ open: boolean; meeting?: Meeting | null; date?: string; time?: string }>({ open: false });
  const today = todayLocal();
  const byDay = new Map<string, Meeting[]>();
  for (const m of data ?? []) {
    const d = toLocalParts(m.starts_at).date;
    byDay.set(d, [...(byDay.get(d) ?? []), m]);
  }
  const start = view === "semana" ? startOfWeek(anchor) : startOfWeek(startOfMonth(anchor));
  const days = Array.from({ length: view === "semana" ? 7 : 42 }, (_, i) => addDays(start, i));
  const month = anchor.slice(0, 7);
  const move = (n: number) => setAnchor(view === "semana" ? addDays(anchor, 7 * n) : addMonths(anchor, n));
  const title = view === "semana"
    ? `${fmtDay(days[0]!, { day: "2-digit", month: "short" })} – ${fmtDay(days[6]!, { day: "2-digit", month: "short" })}`
    : fmtDay(startOfMonth(anchor), { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendário</h1>
        <Button onClick={() => setDlg({ open: true, date: anchor })}><Plus className="mr-1 size-4" />Nova reunião</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>Hoje</Button>
        <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Próximo"><ChevronRight className="size-4" /></Button>
        <span className="font-medium capitalize">{title}</span>
        <div className="ml-auto flex rounded-md border p-0.5">
          {(["semana", "mes"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1 text-sm ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {v === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid gap-2 ${view === "semana" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-7"}`}>
        {view === "mes" && ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="text-center text-xs text-muted-foreground">{d}</div>)}
        {days.map((d) => {
          const items = (byDay.get(d) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const dim = view === "mes" && d.slice(0, 7) !== month;
          return (
            <div key={d} onClick={() => setDlg({ open: true, date: d })}
              className={`cursor-pointer rounded-lg border bg-card p-2 hover:border-primary/50 ${view === "semana" ? "min-h-40" : "min-h-20 md:min-h-28"} ${dim ? "opacity-40" : ""} ${d === today ? "border-primary" : ""}`}>
              <div className="mb-1 text-xs text-muted-foreground">
                {view === "semana" ? fmtDay(d, { weekday: "short", day: "2-digit" }) : Number(d.slice(8))}
              </div>
              <div className="space-y-1">
                {items.slice(0, view === "mes" ? 3 : 20).map((m) => (
                  <button key={m.id} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, meeting: m }); }}
                    className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${statusTone(m.status)}`}>
                    {fmtTime(m.starts_at)} <span className="hidden sm:inline">{m.lead_name}</span>
                  </button>
                ))}
                {view === "mes" && items.length > 3 && <div className="text-[11px] text-muted-foreground">+{items.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <MeetingDialog open={dlg.open} onOpenChange={(o) => setDlg((s) => ({ ...s, open: o }))} meeting={dlg.meeting ?? null} defaultDate={dlg.date} defaultTime={dlg.time} />
    </div>
  );
}
