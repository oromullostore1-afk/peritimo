import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — PERITMO" },
      { name: "description", content: "Acesse sua conta PERITMO." },
      { property: "og:title", content: "Entrar — PERITMO" },
      { property: "og:description", content: "Acesse sua conta PERITMO." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: adminExists } = useQuery({
    queryKey: ["admin_exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) return toast.error("E-mail ou senha inválidos.");
      navigate({ to: "/dashboard", replace: true });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) return toast.error("Não foi possível enviar o e-mail. Tente novamente em instantes.");
      toast.success("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      setMode("login");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo subtitle /></div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
          <h1 className="text-lg font-semibold">{mode === "login" ? "Entrar" : "Recuperar senha"}</h1>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode === "login" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Enviar link"}
          </Button>
          <button type="button" className="w-full text-center text-sm text-lilac hover:underline" onClick={() => setMode(mode === "login" ? "forgot" : "login")}>
            {mode === "login" ? "Esqueci minha senha" : "Voltar ao login"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Novos acessos são criados pelo administrador.
        </p>
        {adminExists === false && (
          <p className="mt-2 text-center text-sm">
            <Link to="/setup" className="text-lilac hover:underline">Configuração inicial: criar administrador</Link>
          </p>
        )}
      </div>
    </div>
  );
}
