
-- Function to increment points atomically
CREATE OR REPLACE FUNCTION public.increment_points(user_uuid UUID, amount BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tg_users
  SET points = points + amount
  WHERE id = user_uuid;
END;
$$;
