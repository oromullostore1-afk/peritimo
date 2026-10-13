import { CalendarDays } from "lucide-react";

export function Logo({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-brand shadow-glow">
        <CalendarDays className="size-5 text-primary-foreground" strokeWidth={2.2} />
      </span>
      <div className="leading-tight">
        <div className="text-base font-bold tracking-[0.18em] text-foreground">PERITMO</div>
        {subtitle && <div className="text-xs text-muted-foreground">Gestão inteligente de reuniões</div>}
      </div>
    </div>
  );
}
