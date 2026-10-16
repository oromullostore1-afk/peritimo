import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — PERITMO" },
      { name: "description", content: "Defina uma nova senha para sua conta PERITMO." },
      { property: "og:title", content: "Redefinir senha — PERITMO" },
      { property: "og:description", content: "Defina uma nova senha para sua conta PERITMO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => s.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    if (pw !== pw2) { toast.error("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo subtitle /></div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
          <h1 className="text-lg font-semibold">Nova senha</h1>
          {!ready && <p className="text-sm text-muted-foreground">Validando link… Se nada acontecer, solicite um novo link de recuperação.</p>}
          <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={!ready} /></div>
          <div className="space-y-1.5"><Label>Confirmar senha</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} disabled={!ready} /></div>
          <Button className="w-full" disabled={!ready || loading}>Salvar senha</Button>
        </form>
      </div>
    </div>
  );
}
