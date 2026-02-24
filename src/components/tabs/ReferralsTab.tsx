import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { Copy, Users, UserPlus } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Referral {
  id: string;
  first_name: string | null;
  username: string | null;
  created_at: string;
}

export default function ReferralsTab() {
  const { user, settings } = useUser();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tg_users")
      .select("id, first_name, username, created_at")
      .eq("referred_by", user.id);
    setReferrals((data || []) as unknown as Referral[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchReferrals();
  }, [fetchReferrals, user]);

  useRealtimeTable("tg_users", fetchReferrals);

  if (!user || !settings) return null;

  const referralLink = `https://t.me/TonxstarRewardsbot/app?startapp=ref_${user.referral_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareLink = () => {
    const text = `Join TonxStar Rewards and earn points! 🎁`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(tgShareUrl, "_blank");
  };

  return (
    <div className="px-4 py-6 space-y-5 animate-slide-up">
      <h2 className="text-xl font-bold">Invite Friends</h2>

      {/* Reward info */}
      <div className="gradient-card rounded-xl p-5 border border-border text-center">
        <UserPlus className="w-10 h-10 text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">Earn per referral</p>
        <p className="text-2xl font-black text-gradient-gold font-mono">
          +{settings.referral_reward_points}
        </p>
        <p className="text-xs text-muted-foreground mt-1">points</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={shareLink}
          className="gradient-gold rounded-xl p-3 font-bold text-sm text-primary-foreground active:scale-[0.97] transition-transform"
        >
          Share Link
        </button>
        <button
          onClick={copyLink}
          className="bg-secondary rounded-xl p-3 font-bold text-sm text-secondary-foreground active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" /> Copy
        </button>
      </div>

      {/* Referral code */}
      <div className="gradient-card rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground mb-1">Your referral code</p>
        <p className="font-mono font-bold text-primary">{user.referral_code}</p>
      </div>

      {/* Referrals list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">
            Your Referrals ({referrals.length})
          </h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No referrals yet. Share your link to get started!
          </p>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref) => (
              <div key={ref.id} className="gradient-card rounded-lg p-3 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                  {(ref.first_name || "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {ref.first_name || "User"}
                  </p>
                  {ref.username && (
                    <p className="text-xs text-muted-foreground">@{ref.username}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(ref.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
