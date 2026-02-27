-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  bio TEXT,
  profile_picture_url TEXT,
  balance NUMERIC DEFAULT 0,
  role TEXT DEFAULT 'user',
  active_plan TEXT DEFAULT 'None',
  daily_claim_amount NUMERIC DEFAULT 0,
  last_claim_time TIMESTAMP WITH TIME ZONE,
  currency_preference TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PUBLIC PROFILES TABLE
CREATE TABLE public.public_profiles (
  username TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PORTFOLIOS TABLE
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ASSETS TABLE
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  average_cost NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  purchase_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_display_name TEXT,
  user_email TEXT,
  type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'investment'
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  description TEXT,
  transaction_hash TEXT,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ADMIN ROLES TABLE
CREATE TABLE public.roles_admin (
  user_id UUID REFERENCES public.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DRAFT POSTS TABLE
CREATE TABLE public.draft_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content_html TEXT,
  status TEXT DEFAULT 'draft',
  published_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PUBLISHED POSTS TABLE
CREATE TABLE public.published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content_html TEXT,
  status TEXT DEFAULT 'published',
  published_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RPC FUNCTION TO INCREMENT BALANCE
CREATE OR REPLACE FUNCTION increment_balance(user_id UUID, amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.users
  SET balance = balance + amount
  WHERE id = user_id
  RETURNING balance INTO new_balance;
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC FUNCTION TO PROCESS DAILY CLAIM
CREATE OR REPLACE FUNCTION process_daily_claim(user_id UUID, user_timezone TEXT DEFAULT 'Asia/Dhaka')
RETURNS json AS $$
DECLARE
  user_record record;
  current_local_time TIMESTAMP;
  most_recent_reset TIMESTAMP;
  claim_amount NUMERIC;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  claim_amount := user_record.daily_claim_amount;
  
  IF claim_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'No active plan or claim amount is zero');
  END IF;

  current_local_time := now() AT TIME ZONE user_timezone;
  
  -- The reset time is 9 AM today local time
  most_recent_reset := date_trunc('day', current_local_time) + interval '9 hours';
  
  -- If current time is before 9 AM, then the most recent reset was yesterday at 9 AM
  IF current_local_time < most_recent_reset THEN
    most_recent_reset := most_recent_reset - interval '1 day';
  END IF;

  -- Check if they already claimed since the most recent reset
  IF user_record.last_claim_time IS NOT NULL AND 
     (user_record.last_claim_time AT TIME ZONE user_timezone) >= most_recent_reset THEN
    RETURN json_build_object('success', false, 'message', 'Already claimed for today. Next claim available after 9 AM tomorrow.');
  END IF;

  -- Process claim
  UPDATE public.users
  SET 
    balance = balance + claim_amount,
    last_claim_time = now()
  WHERE id = user_id;

  -- Also record the transaction
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (user_id, 'investment', claim_amount, 'completed', 'Daily Investment Claim');

  RETURN json_build_object('success', true, 'message', 'Successfully claimed ' || claim_amount, 'amount', claim_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;

-- 1. Users can only see and update their own user profile, but everyone can see public profiles
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Public Profiles are readable by everyone
CREATE POLICY "Public profiles are readable by everyone" ON public.public_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own public profile" ON public.public_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own public profile" ON public.public_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own public profile" ON public.public_profiles FOR DELETE USING (auth.uid() = user_id);

-- 3. Portfolios, Assets, Transactions restricted to their owner
CREATE POLICY "Users can access their own portfolios" ON public.portfolios USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own assets" ON public.assets USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Drafts owner only, published posts public
CREATE POLICY "Users can access their own drafts" ON public.draft_posts USING (auth.uid() = author_id);
CREATE POLICY "Everyone can view published posts" ON public.published_posts FOR SELECT USING (true);

-- Storage bucket definition and policies:
-- You will need to create a storage bucket called 'receipts' manually in the Supabase Dashboard,
-- and set it to public if you want the proof URLs to be publicly accessible.
-- Example SQL for Storage (make sure "storage" schema is available)
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true);
-- create policy "Authenticated users can upload receipts" on storage.objects for insert to authenticated with check ( bucket_id = 'receipts' );
-- create policy "Receipts are publicly accessible" on storage.objects for select to public using ( bucket_id = 'receipts' );
