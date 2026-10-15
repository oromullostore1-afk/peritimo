import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, type Meeting, type MeetingStatus } from "@/lib/meetings";
import { fromLocal, toLocalParts, todayLocal } from "@/lib/tz";
import { useMe, useSegments, useTeam } from "@/lib/useMe";
import { useDeleteMeeting, useSaveMeeting } from "@/lib/useMeetings";

type F = { lead_name: string; date: string; time: string; whatsapp: string; responsible_id: string; status: string; segment_id: string; origin: string; notes: string; next_action: string; company: string; duration_min: string };
const EMPTY: F = { lead_name: "", date: "", time: "", whatsapp: "", responsible_id: "", status: "agendada", segment_id: "", origin: "", notes: "", next_action: "", company: "", duration_min: "30" };
const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meeting?: Meeting | null;
  defaultDate?: string | undefined;
  defaultTime?: string | undefined;
};

export function MeetingDialog({ open, onOpenChange, meeting, defaultDate, defaultTime }: Props) {
  const { data: me } = useMe();
  const { data: team } = useTeam();
  const { data: segments } = useSegments();
  const save = useSaveMeeting();
  const del = useDeleteMeeting();
  const [f, setF] = useState<F>(EMPTY);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (meeting) {
      const p = toLocalParts(meeting.starts_at);
      setF({
        lead_name: meeting.lead_name, date: p.date, time: p.time, whatsapp: meeting.whatsapp ?? "",
        responsible_id: meeting.responsible_id, status: meeting.status, segment_id: meeting.segment_id ?? "",
        origin: meeting.origin ?? "", notes: meeting.notes ?? "", next_action: meeting.next_action ?? "",
        company: meeting.company ?? "", duration_min: String(meeting.duration_min),
      });
    } else {
      setF({
        lead_name: "", date: defaultDate ?? todayLocal(), time: defaultTime ?? "09:00", whatsapp: "",
        responsible_id: me?.id ?? "", status: "agendada", segment_id: "", origin: "", notes: "",
        next_action: "", company: "", duration_min: "30",
      });
    }
  }, [open, meeting, defaultDate, defaultTime, me?.id]);

  const set = (k: keyof F) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const people = (team ?? []).filter((p) => p.active || p.id === f.responsible_id);
  const canPickResponsible = !!me?.isAdmin;
  const creator = meeting ? team?.find((p) => p.id === meeting.created_by)?.full_name : me?.profile?.full_name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.lead_name?.trim()) return setErr("Informe o nome do lead.");
    if (!f.date || !f.time) return setErr("Informe data e hora.");
    if ((f.whatsapp ?? "").replace(/\D/g, "").length < 10) return setErr("Informe um WhatsApp válido com DDD.");
    if (!f.responsible_id) return setErr("Selecione o responsável.");
    await save.mutateAsync({
      ...(meeting ? { id: meeting.id } : {}),
      values: {
        lead_name: f.lead_name.trim(), starts_at: fromLocal(f.date, f.time).toISOString(),
        whatsapp: f.whatsapp.trim(), responsible_id: f.responsible_id, status: f.status as MeetingStatus,
        segment_id: f.segment_id || null, origin: f.origin.trim() || null, notes: f.notes.trim() || null,
        next_action: f.next_action.trim() || null, company: f.company.trim() || null,
        duration_min: Math.max(5, Number(f.duration_min) || 30),
      },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{meeting ? "Editar reunião" : "Nova reunião"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nome do lead *</Label><Input value={f.lead_name ?? ""} onChange={set("lead_name")} maxLength={120} /></div>
          <div><Label>Data *</Label><Input type="date" value={f.date ?? ""} onChange={set("date")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Hora *</Label><Input type="time" value={f.time ?? ""} onChange={set("time")} /></div>
            <div><Label>Duração (min)</Label><Input type="number" min={5} value={f.duration_min ?? ""} onChange={set("duration_min")} /></div>
          </div>
          <div><Label>WhatsApp *</Label><Input value={f.whatsapp ?? ""} onChange={set("whatsapp")} placeholder="(65) 99999-0000" maxLength={20} /></div>
          <div><Label>Status *</Label>
            <select className={sel} value={f.status ?? "agendada"} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><Label>Agendado por</Label><Input value={creator ?? "—"} disabled /></div>
          <div><Label>Responsável pela reunião *</Label>
            <select className={sel} value={f.responsible_id ?? ""} onChange={set("responsible_id")} disabled={!canPickResponsible}>
              <option value="">Selecione…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>
          <div><Label>Segmento</Label>
            <select className={sel} value={f.segment_id ?? ""} onChange={set("segment_id")}>
              <option value="">—</option>
              {(segments ?? []).filter((s) => s.active || s.id === f.segment_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><Label>Origem</Label><Input value={f.origin ?? ""} onChange={set("origin")} placeholder="Instagram, indicação…" maxLength={80} /></div>
          <div className="sm:col-span-2"><Label>Empresa</Label><Input value={f.company ?? ""} onChange={set("company")} maxLength={120} /></div>
          <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={f.notes ?? ""} onChange={set("notes")} maxLength={2000} /></div>
          <div className="sm:col-span-2"><Label>Próxima ação</Label><Input value={f.next_action ?? ""} onChange={set("next_action")} maxLength={200} /></div>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <DialogFooter className="gap-2 sm:col-span-2">
            {meeting && me?.isAdmin && (
              <Button type="button" variant="destructive" className="mr-auto" disabled={del.isPending}
                onClick={async () => { if (confirm("Excluir esta reunião?")) { await del.mutateAsync(meeting.id); onOpenChange(false); } }}>
                Excluir
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
