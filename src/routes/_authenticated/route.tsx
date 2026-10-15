import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, LayoutDashboard, List, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reunioes", label: "Reuniões", icon: List },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/avisos", label: "Avisos", icon: Bell },
] as const;

function Shell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <Logo />
        <nav className="hidden gap-1 md:flex">
          {NAV.map(({ to, label, icon: I }) => (
            <Link key={to} to={to} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "bg-primary/15 text-foreground" }}>
              <I className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 size-4" />Sair</Button>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden">
        {NAV.map(({ to, label, icon: I }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground"
            activeProps={{ className: "text-lilac" }}>
            <I className="size-5" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
