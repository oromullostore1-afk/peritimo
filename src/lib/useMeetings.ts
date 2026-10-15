import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];

// RLS restricts rows: SDR sees only meetings where they are responsible; admin sees all.
export function useMeetings() {
  return useQuery({
    queryKey: ["meetings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meetings").select("*").order("starts_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: MeetingInsert }) => {
      if (id) {
        const { error } = await supabase.from("meetings").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("meetings").insert({ ...values, created_by: u.user!.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Reunião atualizada" : "Reunião criada");
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (e: Error) => toast.error("Não foi possível salvar: " + e.message),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reunião excluída");
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir: " + e.message),
  });
}
