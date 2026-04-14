-- =============================================
-- MANPOWER Sports Management System
-- Supabase Database Schema Setup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/merpbfceascuopcgqwiw/sql/new)
-- =============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  game_name text NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(user_email, game_name)
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  venue text NOT NULL,
  sport text DEFAULT 'General',
  image text,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  price numeric NOT NULL,
  image text,
  description text
);

-- Enable RLS but allow all operations (auth handled in backend)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON products FOR ALL USING (true) WITH CHECK (true);
