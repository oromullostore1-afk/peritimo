import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PERITMO — Gestão inteligente de reuniões" },
      { name: "description", content: "Agenda, kanban e CRM leve para a equipe comercial organizar reuniões." },
      { property: "og:title", content: "PERITMO — Gestão inteligente de reuniões" },
      { property: "og:description", content: "Agenda, kanban e CRM leve para a equipe comercial organizar reuniões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="relative">
        <div className="mb-10 flex justify-center"><Logo /></div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
          Gestão inteligente <span className="text-brand">de reuniões</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Agenda, kanban, métricas e scripts de WhatsApp em um só lugar para sua equipe comercial.
        </p>
        <Button asChild size="lg" className="mt-8 shadow-glow">
          <Link to="/auth">Entrar <ArrowRight className="ml-1 size-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
