import { useUser } from "@/context/UserContext";
import { Coins, Star, TrendingUp } from "lucide-react";

export default function HomeTab() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
        <Coins className="w-16 h-16 text-primary animate-float" />
        <h2 className="text-xl font-bold">Welcome to TonxStar Rewards</h2>
        <p className="text-muted-foreground text-sm">
          Open this app inside Telegram to start earning! Or add <code className="text-primary">?tg_id=12345</code> for dev mode.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 animate-slide-up">
      {/* Profile Header */}
      <div className="text-center space-y-2">
        <div className="w-20 h-20 rounded-full gradient-gold mx-auto flex items-center justify-center glow-gold">
          <span className="text-3xl font-bold text-primary-foreground">
            {(user.first_name || "U")[0].toUpperCase()}
          </span>
        </div>
        <h1 className="text-xl font-bold">
          {user.first_name} {user.last_name || ""}
        </h1>
        {user.username && (
          <p className="text-muted-foreground text-sm">@{user.username}</p>
        )}
      </div>

      {/* Points Card */}
      <div className="gradient-card rounded-2xl p-6 border border-border glow-card">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Your Balance</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-gradient-gold font-mono">
            {user.points.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">points</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="gradient-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Referral Code</span>
          </div>
          <p className="font-mono font-bold text-sm text-foreground">{user.referral_code}</p>
        </div>
        <div className="gradient-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Member Since</span>
          </div>
          <p className="font-medium text-sm text-foreground">
            {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
