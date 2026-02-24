import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Play, Gift, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function EarnTab() {
  const { user, settings, refreshUser } = useUser();
  const [adLoading, setAdLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);

  if (!user || !settings) return null;

  const canClaimDaily = () => {
    if (!user.last_daily_claim) return true;
    const last = new Date(user.last_daily_claim);
    const now = new Date();
    return now.getTime() - last.getTime() > 24 * 60 * 60 * 1000;
  };

  const canWatchAd = () => {
    if (!user.last_ad_watch) return true;
    const last = new Date(user.last_ad_watch);
    const now = new Date();
    return now.getTime() - last.getTime() > settings.ad_cooldown_seconds * 1000;
  };

  const claimDaily = async () => {
    if (!canClaimDaily()) {
      toast.error("Already claimed today! Come back tomorrow.");
      return;
    }
    setDailyLoading(true);
    try {
      await supabase
        .from("tg_users")
        .update({
          points: user.points + settings.daily_reward_points,
          last_daily_claim: new Date().toISOString(),
        })
        .eq("id", user.id);
      toast.success(`+${settings.daily_reward_points} points claimed!`);
      await refreshUser();
    } catch {
      toast.error("Failed to claim reward");
    }
    setDailyLoading(false);
  };

  const watchAd = async () => {
    if (!canWatchAd()) {
      toast.error("Please wait before watching another ad.");
      return;
    }
    setAdLoading(true);
    try {
      // Adsgram rewarded ad
      const blockId = settings.adsgram_block_id || "23615";
      try {
        const AdController = (window as any).Adsgram?.init?.({
          blockId,
        });
        if (AdController) {
          await AdController.show();
        }
      } catch {
        // Ad not available, still reward in dev
      }

      await supabase
        .from("tg_users")
        .update({
          points: user.points + settings.ad_reward_points,
          last_ad_watch: new Date().toISOString(),
        })
        .eq("id", user.id);
      toast.success(`+${settings.ad_reward_points} points earned!`);
      await refreshUser();
    } catch {
      toast.error("Failed to process ad reward");
    }
    setAdLoading(false);
  };

  const dailyAvailable = canClaimDaily();
  const adAvailable = canWatchAd();

  return (
    <div className="px-4 py-6 space-y-4 animate-slide-up">
      <h2 className="text-xl font-bold">Earn Points</h2>

      {/* Daily Reward */}
      <button
        onClick={claimDaily}
        disabled={!dailyAvailable || dailyLoading}
        className={`w-full gradient-card rounded-xl p-5 border border-border text-left transition-all duration-200 ${
          dailyAvailable ? "hover:border-primary/50 active:scale-[0.98]" : "opacity-60"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dailyAvailable ? "gradient-gold glow-gold" : "bg-secondary"}`}>
            <Gift className={`w-6 h-6 ${dailyAvailable ? "text-primary-foreground" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Daily Reward</h3>
            <p className="text-sm text-muted-foreground">
              {dailyAvailable ? "Ready to claim!" : "Come back tomorrow"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-primary font-bold font-mono">+{settings.daily_reward_points}</span>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
      </button>

      {/* Watch Ad */}
      <button
        onClick={watchAd}
        disabled={!adAvailable || adLoading}
        className={`w-full gradient-card rounded-xl p-5 border border-border text-left transition-all duration-200 ${
          adAvailable ? "hover:border-accent/50 active:scale-[0.98]" : "opacity-60"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${adAvailable ? "bg-accent glow-card" : "bg-secondary"}`}>
            <Play className={`w-6 h-6 ${adAvailable ? "text-accent-foreground" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Watch Ad</h3>
            <p className="text-sm text-muted-foreground">
              {adAvailable ? "Watch & earn points" : "Cooldown active"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-accent font-bold font-mono">+{settings.ad_reward_points}</span>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
      </button>

      {/* Cooldown info */}
      {!adAvailable && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <Clock className="w-3 h-3" />
          <span>Ad cooldown: {settings.ad_cooldown_seconds}s between watches</span>
        </div>
      )}
    </div>
  );
}
