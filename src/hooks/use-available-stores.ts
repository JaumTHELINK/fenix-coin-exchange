import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAvailableStores() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["available-partner-stores", user?.id],
    enabled: !!user,
    refetchOnMount: "always",
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_partner_store_ids");
      if (error) throw error;
      return data ?? [];
    },
  });
}