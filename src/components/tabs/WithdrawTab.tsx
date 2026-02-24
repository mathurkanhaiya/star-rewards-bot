import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { Wallet, ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  wallet_address: string | null;
  status: string;
  created_at: string;
}

export default function WithdrawTab() {
  const { user, settings, refreshUser } = useUser();
  const [method, setMethod] = useState<"TON" | "Stars">("TON");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchWithdrawals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWithdrawals((data || []) as unknown as Withdrawal[]);
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchWithdrawals();
  }, [fetchWithdrawals, user]);

  useRealtimeTable("withdrawals", fetchWithdrawals);

  if (!user || !settings) return null;

  const minAmount = method === "TON" ? settings.min_withdraw_ton : settings.min_withdraw_stars;

  const submit = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < minAmount) {
      toast.error(`Minimum withdrawal: ${minAmount} points`);
      return;
    }
    if (amt > user.points) {
      toast.error("Insufficient points");
      return;
    }
    if (method === "TON" && !wallet.trim()) {
      toast.error("Please enter your TON wallet address");
      return;
    }

    setLoading(true);
    try {
      await supabase.from("withdrawals").insert({
        user_id: user.id,
        amount: amt,
        method,
        wallet_address: method === "TON" ? wallet.trim() : null,
      });

      await supabase
        .from("tg_users")
        .update({ points: user.points - amt })
        .eq("id", user.id);

      toast.success("Withdrawal request submitted!");
      setAmount("");
      setWallet("");
      await refreshUser();
      await fetchWithdrawals();
    } catch {
      toast.error("Failed to submit withdrawal");
    }
    setLoading(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "rejected": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="px-4 py-6 space-y-5 animate-slide-up">
      <h2 className="text-xl font-bold">Withdraw</h2>

      {/* Balance */}
      <div className="gradient-card rounded-xl p-4 border border-border flex items-center gap-3">
        <Wallet className="w-6 h-6 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="font-mono font-bold text-lg text-gradient-gold">{user.points.toLocaleString()} pts</p>
        </div>
      </div>

      {/* Method selector */}
      <div className="flex gap-2">
        {(["TON", "Stars"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 rounded-xl py-3 font-bold text-sm transition-all ${
              method === m
                ? "gradient-gold text-primary-foreground glow-gold"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Amount (min: {minAmount})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min ${minAmount} points`}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />
        </div>

        {method === "TON" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">TON Wallet Address</label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="UQ..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            />
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full gradient-gold rounded-xl py-3.5 font-bold text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ArrowUpRight className="w-4 h-4" />
          {loading ? "Processing..." : "Request Withdrawal"}
        </button>
      </div>

      {/* History */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Withdrawal History</h3>
        {historyLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">No withdrawals yet</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="gradient-card rounded-lg p-3 border border-border flex items-center gap-3">
                {statusIcon(w.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{w.amount} pts → {w.method}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium capitalize ${
                  w.status === "approved" ? "text-success" :
                  w.status === "rejected" ? "text-destructive" : "text-primary"
                }`}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
