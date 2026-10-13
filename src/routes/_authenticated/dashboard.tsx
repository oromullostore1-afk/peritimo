import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeMetrics, pct } from "@/lib/meetings";
import { useMe } from "@/lib/useMe";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PERITMO" }, { name: "description", content: "Métricas de reuniões." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["meetings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meetings").select("*").order("starts_at");
      if (error) throw error;
      return data;
    },
  });
  const m = computeMetrics(data ?? []);
  const cards = [
    ["Reuniões", m.total], ["Confirmadas", m.confirmed], ["Realizadas", m.held], ["Não compareceu", m.noShow],
    ["Propostas", m.proposals], ["Fechadas", m.closed], ["Comparecimento", pct(m.attendanceRate)], ["Conversão", pct(m.conversionRate)],
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Olá{me?.profile?.full_name ? `, ${me.profile.full_name}` : ""}</h1>
      {isLoading ? <p className="text-muted-foreground">Carregando…</p> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map(([l, v]) => (
            <div key={l} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-bold">{v}</div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && !data?.length && <p className="text-sm text-muted-foreground">Nenhuma reunião cadastrada ainda.</p>}
    </div>
  );
}
