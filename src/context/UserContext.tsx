import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TgUser {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  points: number;
  referral_code: string;
  referred_by: string | null;
  is_banned: boolean;
  last_daily_claim: string | null;
  last_ad_watch: string | null;
  created_at: string;
}

interface AppSettings {
  daily_reward_points: number;
  ad_reward_points: number;
  referral_reward_points: number;
  min_withdraw_ton: number;
  min_withdraw_stars: number;
  adsgram_block_id: string;
  ad_cooldown_seconds: number;
  interstitial_block_id: string;
}

interface UserContextType {
  user: TgUser | null;
  settings: AppSettings | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  telegramId: number | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
  settings: null,
  loading: true,
  refreshUser: async () => {},
  isAdmin: false,
  telegramId: null,
});

export const useUser = () => useContext(UserContext);

// Parse Telegram WebApp init data
function getTelegramUser() {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      return tg.initDataUnsafe.user;
    }
  } catch {}
  // Dev fallback
  const params = new URLSearchParams(window.location.search);
  const devId = params.get("tg_id");
  if (devId) {
    return { id: parseInt(devId), username: "dev_user", first_name: "Dev" };
  }
  return null;
}

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TgUser | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  const ADMIN_TG_ID = 2139807311;

  const fetchSettings = async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).single();
    if (data) setSettings(data as unknown as AppSettings);
  };

  const fetchOrCreateUser = async (tgUser: any) => {
    const tgId = tgUser.id;
    setTelegramId(tgId);

    // Try to find existing user
    const { data: existing } = await supabase
      .from("tg_users")
      .select("*")
      .eq("telegram_id", tgId)
      .single();

    if (existing) {
      setUser(existing as unknown as TgUser);
      return;
    }

    // Check referral
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    let referredById: string | null = null;

    if (refCode) {
      const { data: referrer } = await supabase
        .from("tg_users")
        .select("id")
        .eq("referral_code", refCode)
        .single();
      if (referrer) referredById = referrer.id;
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from("tg_users")
      .insert({
        telegram_id: tgId,
        username: tgUser.username || null,
        first_name: tgUser.first_name || null,
        last_name: tgUser.last_name || null,
        referral_code: generateReferralCode(),
        referred_by: referredById,
      })
      .select()
      .single();

    if (newUser) {
      setUser(newUser as unknown as TgUser);

      // Award referral points to referrer
      if (referredById) {
        const settings = await supabase.from("app_settings").select("referral_reward_points").limit(1).single();
        if (settings.data) {
          await supabase.rpc("increment_points" as any, {
            user_uuid: referredById,
            amount: (settings.data as any).referral_reward_points,
          });
        }
      }
    }
  };

  const refreshUser = async () => {
    if (!telegramId) return;
    const { data } = await supabase
      .from("tg_users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();
    if (data) setUser(data as unknown as TgUser);
  };

  useEffect(() => {
    const init = async () => {
      await fetchSettings();
      const tgUser = getTelegramUser();
      if (tgUser) {
        await fetchOrCreateUser(tgUser);
      }
      setLoading(false);
    };
    init();
  }, []);

  const isAdmin = telegramId === ADMIN_TG_ID;

  return (
    <UserContext.Provider value={{ user, settings, loading, refreshUser, isAdmin, telegramId }}>
      {children}
    </UserContext.Provider>
  );
}
