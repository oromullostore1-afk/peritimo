import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MeetingDialog } from "@/components/MeetingDialog";
import { STATUSES, findConflicts, statusLabel, statusTone, waLink, type Meeting } from "@/lib/meetings";
import { fmtDate, fmtTime } from "@/lib/tz";
import { useTeam } from "@/lib/useMe";
import { useMeetings } from "@/lib/useMeetings";

export const Route = createFileRoute("/_authenticated/reunioes")({
  head: () => ({ meta: [{ title: "Reuniões — PERITMO" }, { name: "description", content: "Lista e cadastro de reuniões." }] }),
  component: Page,
});

function Page() {
  const { data, isLoading, error } = useMeetings();
  const { data: team } = useTeam();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Meeting | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const name = (id: string) => team?.find((p) => p.id === id)?.full_name ?? "—";
  const conflicts = useMemo(() => findConflicts(data ?? []), [data]);
  const list = (data ?? [])
    .filter((m) => (!status || m.status === status) && (!q || m.lead_name.toLowerCase().includes(q.toLowerCase())))
    .slice().reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Reuniões</h1>
        <Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="mr-1 size-4" />Nova reunião</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar lead…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {error && <p className="text-destructive">Erro ao carregar reuniões.</p>}
      {!isLoading && !list.length && <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Nenhuma reunião encontrada.</p>}
      <div className="space-y-2">
        {list.map((m) => (
          <div key={m.id} onClick={() => { setEdit(m); setOpen(true); }}
            className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-card hover:border-primary/50">
            <div className="w-24 text-sm"><div className="font-semibold">{fmtTime(m.starts_at)}</div><div className="text-muted-foreground">{fmtDate(m.starts_at, { day: "2-digit", month: "2-digit" })}</div></div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.lead_name}{conflicts.has(m.id) && <span className="ml-2 text-xs text-warning">⚠ conflito de horário</span>}</div>
              <div className="text-xs text-muted-foreground">Responsável: {name(m.responsible_id)} · Agendado por: {name(m.created_by)}</div>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(m.status)}`}>{statusLabel(m.status)}</span>
            {m.whatsapp && (
              <a href={waLink(m.whatsapp, `Olá ${m.lead_name}!`)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="text-success" aria-label="WhatsApp"><MessageCircle className="size-5" /></a>
            )}
          </div>
        ))}
      </div>
      <MeetingDialog open={open} onOpenChange={setOpen} meeting={edit} />
    </div>
  );
}
