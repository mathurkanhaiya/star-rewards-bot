import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  reward_points: number;
  is_active: boolean;
}

export default function TasksTab() {
  const { user, refreshUser } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true);
    
    const { data: completions } = await supabase
      .from("task_completions")
      .select("task_id")
      .eq("user_id", user.id);

    setTasks((tasksData || []) as unknown as Task[]);
    setCompletedIds(new Set((completions || []).map((c: any) => c.task_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useRealtimeTable("tasks", fetchTasks);
  useRealtimeTable("task_completions", fetchTasks);

  const completeTask = async (task: Task) => {
    if (completedIds.has(task.id) || completing) return;
    setCompleting(task.id);

    // Open URL if exists
    if (task.url) {
      window.open(task.url, "_blank");
    }

    // Wait a bit for user to visit the link
    await new Promise((r) => setTimeout(r, 2000));

    try {
      await supabase.from("task_completions").insert({
        user_id: user!.id,
        task_id: task.id,
      });

      await supabase
        .from("tg_users")
        .update({ points: user!.points + task.reward_points })
        .eq("id", user!.id);

      toast.success(`+${task.reward_points} points earned!`);
      setCompletedIds((prev) => new Set([...prev, task.id]));
      await refreshUser();
    } catch {
      toast.error("Failed to complete task");
    }
    setCompleting(null);
  };

  if (!user) return null;

  return (
    <div className="px-4 py-6 space-y-4 animate-slide-up">
      <h2 className="text-xl font-bold">Complete Tasks</h2>
      <p className="text-sm text-muted-foreground">Complete tasks to earn bonus points</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No tasks available right now. Check back later!
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = completedIds.has(task.id);
            const isCompleting = completing === task.id;
            return (
              <button
                key={task.id}
                onClick={() => completeTask(task)}
                disabled={done || isCompleting}
                className={`w-full gradient-card rounded-xl p-4 border text-left transition-all duration-200 ${
                  done
                    ? "border-success/30 opacity-70"
                    : "border-border hover:border-primary/50 active:scale-[0.98]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    done ? "bg-success/20" : "bg-secondary"
                  }`}>
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <ExternalLink className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-bold font-mono text-sm ${done ? "text-success" : "text-primary"}`}>
                      {done ? "✓" : `+${task.reward_points}`}
                    </span>
                  </div>
                </div>
                {isCompleting && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-accent">
                    <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
