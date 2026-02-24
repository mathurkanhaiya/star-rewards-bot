import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = "tg_users" | "tasks" | "withdrawals" | "app_settings" | "task_completions";

/**
 * Subscribe to realtime changes on a Supabase table.
 * Calls `onUpdate` whenever an INSERT, UPDATE, or DELETE occurs.
 */
export function useRealtimeTable(table: TableName, onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate]);
}
