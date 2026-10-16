import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFirstAdmin } from "@/lib/team.functions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — PERITMO" },
      { name: "description", content: "Crie a primeira conta de administrador do PERITMO." },
      { property: "og:title", content: "Configuração inicial — PERITMO" },
      { property: "og:description", content: "Crie a primeira conta de administrador do PERITMO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { data: adminExists, isLoading } = useQuery({
    queryKey: ["admin_exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    setLoading(true);
    try {
      await bootstrap({ data: form });
      await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      toast.success("Administrador criado!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na configuração");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo subtitle /></div>
        {isLoading ? (
          <Loader2 className="mx-auto size-6 animate-spin text-lilac" />
        ) : adminExists ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            A configuração inicial já foi concluída. Peça acesso ao administrador.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
            <div>
              <h1 className="text-lg font-semibold">Criar administrador</h1>
              <p className="text-sm text-muted-foreground">Disponível apenas uma vez, enquanto não existir administrador.</p>
            </div>
            <div className="space-y-1.5"><Label>Nome completo</Label><Input required minLength={2} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Senha (mín. 8)</Label><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <Button className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 size-4 animate-spin" />}Criar e entrar</Button>
          </form>
        )}
      </div>
    </div>
  );
}
