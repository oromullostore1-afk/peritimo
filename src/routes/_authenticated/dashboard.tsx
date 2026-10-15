import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingDialog } from "@/components/MeetingDialog";
import { MeetingRow } from "@/components/MeetingRow";
import { classifyAlerts } from "@/lib/alerts";
import { computeMetrics, pct, type Meeting } from "@/lib/meetings";
import { useMe } from "@/lib/useMe";
import { useMeetings } from "@/lib/useMeetings";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PERITMO" }, { name: "description", content: "Métricas e próximas reuniões." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const { data, isLoading } = useMeetings();
  const [dlg, setDlg] = useState<{ open: boolean; meeting?: Meeting | null }>({ open: false });
  const m = computeMetrics(data ?? []);
  const a = classifyAlerts(data ?? []);
  const now = Date.now();
  const next = (data ?? []).filter((x) => new Date(x.starts_at).getTime() >= now && x.status !== "perdido").slice(0, 6);
  const cards = [
    ["Reuniões", m.total], ["Confirmadas", m.confirmed], ["Realizadas", m.held], ["Não compareceu", m.noShow],
    ["Propostas", m.proposals], ["Fechadas", m.closed], ["Comparecimento", pct(m.attendanceRate)], ["Conversão", pct(m.conversionRate)],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Olá{me?.profile?.full_name ? `, ${me.profile.full_name}` : ""}</h1>
        <Button onClick={() => setDlg({ open: true, meeting: null })}><Plus className="mr-1 size-4" />Nova reunião</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Carregando…</p> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map(([l, v]) => (
            <div key={l} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-bold">{v}</div>
            </div>
          ))}
        </div>
      )}
      {(a.overdue.length + a.awaiting.length > 0) && (
        <Link to="/avisos" className="block rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          {a.overdue.length} atrasada(s) e {a.awaiting.length} aguardando confirmação — ver avisos
        </Link>
      )}
      <section className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="mb-3 font-medium">Próximas reuniões</h2>
        {next.length ? <div className="space-y-2">{next.map((x) => <MeetingRow key={x.id} m={x} onClick={() => setDlg({ open: true, meeting: x })} />)}</div>
          : <p className="text-sm text-muted-foreground">Nenhuma reunião futura cadastrada.</p>}
      </section>
      <MeetingDialog open={dlg.open} onOpenChange={(o) => setDlg((s) => ({ ...s, open: o }))} meeting={dlg.meeting ?? null} />
    </div>
  );
}
