import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MeetingDialog } from "@/components/MeetingDialog";
import { MeetingRow } from "@/components/MeetingRow";
import { classifyAlerts } from "@/lib/alerts";
import type { Meeting } from "@/lib/meetings";
import { useMeetings } from "@/lib/useMeetings";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({ meta: [{ title: "Avisos — PERITMO" }, { name: "description", content: "Reuniões próximas, atrasadas e aguardando confirmação." }] }),
  component: Page,
});

function Page() {
  const { data, isLoading } = useMeetings();
  const [edit, setEdit] = useState<Meeting | null>(null);
  const a = classifyAlerts(data ?? []);
  const groups = [
    { title: "Atrasadas (sem atualização de status)", items: a.overdue, tone: "text-destructive" },
    { title: "Próximas 24 horas", items: a.upcoming, tone: "text-info" },
    { title: "Aguardando confirmação (48h)", items: a.awaiting, tone: "text-warning" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Avisos</h1>
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {groups.map((g) => (
        <section key={g.title} className="rounded-xl border bg-card p-4 shadow-card">
          <h2 className={`mb-3 font-medium ${g.tone}`}>{g.title} · {g.items.length}</h2>
          {g.items.length ? (
            <div className="space-y-2">{g.items.map((m) => <MeetingRow key={m.id} m={m} onClick={() => setEdit(m)} />)}</div>
          ) : <p className="text-sm text-muted-foreground">Nada por aqui.</p>}
        </section>
      ))}
      <MeetingDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} meeting={edit} />
    </div>
  );
}
