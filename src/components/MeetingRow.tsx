import { statusLabel, statusTone, type Meeting } from "@/lib/meetings";
import { fmtDate, fmtTime } from "@/lib/tz";

export function MeetingRow({ m, onClick }: { m: Meeting; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border bg-background/40 p-3 text-left hover:border-primary/50">
      <div className="w-20 text-xs"><div className="font-semibold">{fmtTime(m.starts_at)}</div><div className="text-muted-foreground">{fmtDate(m.starts_at, { day: "2-digit", month: "2-digit" })}</div></div>
      <div className="min-w-0 flex-1 truncate text-sm font-medium">{m.lead_name}</div>
      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(m.status)}`}>{statusLabel(m.status)}</span>
    </button>
  );
}
