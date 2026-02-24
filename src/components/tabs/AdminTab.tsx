import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Users, ListTodo, Wallet, Settings, BarChart3,
  CheckCircle2, XCircle, Trash2, Plus, Save,
} from "lucide-react";

type AdminSection = "dashboard" | "users" | "tasks" | "withdrawals" | "settings";

export default function AdminTab() {
  const [section, setSection] = useState<AdminSection>("dashboard");

  return (
    <div className="px-4 py-6 space-y-4 animate-slide-up">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> Admin Panel
      </h2>

      {/* Section tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {([
          { key: "dashboard", icon: BarChart3, label: "Stats" },
          { key: "users", icon: Users, label: "Users" },
          { key: "tasks", icon: ListTodo, label: "Tasks" },
          { key: "withdrawals", icon: Wallet, label: "Withdrawals" },
          { key: "settings", icon: Settings, label: "Settings" },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              section === s.key
                ? "gradient-gold text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" /> {s.label}
          </button>
        ))}
      </div>

      {section === "dashboard" && <DashboardSection />}
      {section === "users" && <UsersSection />}
      {section === "tasks" && <TasksSection />}
      {section === "withdrawals" && <WithdrawalsSection />}
      {section === "settings" && <SettingsSection />}
    </div>
  );
}

function DashboardSection() {
  const [stats, setStats] = useState({ users: 0, points: 0, pending: 0, tasks: 0 });

  useEffect(() => {
    const load = async () => {
      const [usersRes, withdrawRes, tasksRes] = await Promise.all([
        supabase.from("tg_users").select("points"),
        supabase.from("withdrawals").select("id").eq("status", "pending"),
        supabase.from("tasks").select("id"),
      ]);
      const users = usersRes.data || [];
      setStats({
        users: users.length,
        points: users.reduce((s: number, u: any) => s + (u.points || 0), 0),
        pending: (withdrawRes.data || []).length,
        tasks: (tasksRes.data || []).length,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, color: "text-accent" },
    { label: "Total Points", value: stats.points.toLocaleString(), color: "text-primary" },
    { label: "Pending Withdrawals", value: stats.pending, color: "text-destructive" },
    { label: "Active Tasks", value: stats.tasks, color: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="gradient-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className={`text-2xl font-black font-mono ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("tg_users").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setUsers(data || []);
      setLoading(false);
    });
  }, []);

  const toggleBan = async (userId: string, currentlyBanned: boolean) => {
    await supabase.from("tg_users").update({ is_banned: !currentlyBanned }).eq("id", userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: !currentlyBanned } : u));
    toast.success(currentlyBanned ? "User unbanned" : "User banned");
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{users.length} users</p>
      {users.map((u) => (
        <div key={u.id} className="gradient-card rounded-lg p-3 border border-border flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{u.first_name || "User"} {u.username ? `(@${u.username})` : ""}</p>
            <p className="text-xs text-muted-foreground">TG: {u.telegram_id} · {u.points} pts</p>
          </div>
          <button
            onClick={() => toggleBan(u.id, u.is_banned)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
              u.is_banned ? "bg-destructive/20 text-destructive" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {u.is_banned ? "Banned" : "Active"}
          </button>
        </div>
      ))}
    </div>
  );
}

function TasksSection() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [reward, setReward] = useState("50");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("tasks").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setTasks(data || []);
      setLoading(false);
    });
  }, []);

  const addTask = async () => {
    if (!title.trim()) return;
    const { data } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: desc.trim() || null,
      url: url.trim() || null,
      reward_points: parseInt(reward) || 50,
    }).select().single();
    if (data) {
      setTasks((prev) => [data, ...prev]);
      setTitle(""); setDesc(""); setUrl(""); setReward("50");
      toast.success("Task added");
    }
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Task deleted");
  };

  return (
    <div className="space-y-4">
      {/* Add task form */}
      <div className="gradient-card rounded-xl p-4 border border-border space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        <div className="flex gap-2">
          <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Reward" type="number" className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono" />
          <button onClick={addTask} className="gradient-gold rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="gradient-card rounded-lg p-3 border border-border flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.reward_points} pts</p>
              </div>
              <button onClick={() => deleteTask(t.id)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawalsSection() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("withdrawals").select("*, tg_users(first_name, username, telegram_id)")
      .order("created_at", { ascending: false }).then(({ data }) => {
        setWithdrawals(data || []);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("withdrawals").update({ status, processed_at: new Date().toISOString() }).eq("id", id);
    setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, status } : w));
    toast.success(`Withdrawal ${status}`);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {withdrawals.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-6">No withdrawal requests</p>
      ) : withdrawals.map((w) => (
        <div key={w.id} className="gradient-card rounded-lg p-3 border border-border space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{w.tg_users?.first_name || "User"} ({w.method})</p>
              <p className="text-xs text-muted-foreground">{w.amount} pts · {w.wallet_address || "Stars"}</p>
              <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
            </div>
            <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
              w.status === "approved" ? "bg-success/20 text-success" :
              w.status === "rejected" ? "bg-destructive/20 text-destructive" :
              "bg-primary/20 text-primary"
            }`}>{w.status}</span>
          </div>
          {w.status === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => updateStatus(w.id, "approved")} className="flex-1 bg-success/20 text-success rounded-lg py-1.5 text-xs font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => updateStatus(w.id, "rejected")} className="flex-1 bg-destructive/20 text-destructive rounded-lg py-1.5 text-xs font-medium flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsSection() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("*").limit(1).single().then(({ data }) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    await supabase.from("app_settings").update({
      daily_reward_points: settings.daily_reward_points,
      ad_reward_points: settings.ad_reward_points,
      referral_reward_points: settings.referral_reward_points,
      min_withdraw_ton: settings.min_withdraw_ton,
      min_withdraw_stars: settings.min_withdraw_stars,
      adsgram_block_id: settings.adsgram_block_id,
      interstitial_block_id: settings.interstitial_block_id,
      ad_cooldown_seconds: settings.ad_cooldown_seconds,
    }).eq("id", settings.id);
    toast.success("Settings saved!");
    setSaving(false);
  };

  if (loading || !settings) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const fields = [
    { key: "daily_reward_points", label: "Daily Reward Points", type: "number" },
    { key: "ad_reward_points", label: "Ad Reward Points", type: "number" },
    { key: "referral_reward_points", label: "Referral Reward Points", type: "number" },
    { key: "min_withdraw_ton", label: "Min Withdraw (TON)", type: "number" },
    { key: "min_withdraw_stars", label: "Min Withdraw (Stars)", type: "number" },
    { key: "adsgram_block_id", label: "Rewarded Ad Block ID", type: "text" },
    { key: "interstitial_block_id", label: "Interstitial Ad Block ID", type: "text" },
    { key: "ad_cooldown_seconds", label: "Ad Cooldown (seconds)", type: "number" },
  ];

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
          <input
            type={f.type}
            value={settings[f.key]}
            onChange={(e) => setSettings({ ...settings, [f.key]: f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value })}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />
        </div>
      ))}
      <button onClick={save} disabled={saving} className="w-full gradient-gold rounded-xl py-3 font-bold text-primary-foreground flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
