
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Telegram users table (main users table for the mini app)
CREATE TABLE public.tg_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  points BIGINT NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.tg_users(id),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  last_daily_claim TIMESTAMP WITH TIME ZONE,
  last_ad_watch TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tg_users ENABLE ROW LEVEL SECURITY;

-- Public read for edge functions (service role), users can read own
CREATE POLICY "Anyone can read tg_users" ON public.tg_users FOR SELECT USING (true);
CREATE POLICY "Service can insert tg_users" ON public.tg_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update tg_users" ON public.tg_users FOR UPDATE USING (true);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  reward_points BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Task completions
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.tg_users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read task_completions" ON public.task_completions FOR SELECT USING (true);
CREATE POLICY "Service can insert task_completions" ON public.task_completions FOR INSERT WITH CHECK (true);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.tg_users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('TON', 'Stars')),
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read withdrawals" ON public.withdrawals FOR SELECT USING (true);
CREATE POLICY "Service can insert withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update withdrawals" ON public.withdrawals FOR UPDATE USING (true);

-- App settings (singleton config)
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_reward_points BIGINT NOT NULL DEFAULT 100,
  ad_reward_points BIGINT NOT NULL DEFAULT 50,
  referral_reward_points BIGINT NOT NULL DEFAULT 200,
  min_withdraw_ton BIGINT NOT NULL DEFAULT 1000,
  min_withdraw_stars BIGINT NOT NULL DEFAULT 500,
  adsgram_block_id TEXT DEFAULT '',
  ad_cooldown_seconds INT NOT NULL DEFAULT 60,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.app_settings (daily_reward_points, ad_reward_points, referral_reward_points, min_withdraw_ton, min_withdraw_stars, adsgram_block_id)
VALUES (100, 50, 200, 1000, 500, '');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tg_users_updated_at
  BEFORE UPDATE ON public.tg_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
