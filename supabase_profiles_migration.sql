-- User Profiles Table for Additional User Information
-- Run this SQL in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  full_name TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
  height DECIMAL(5,2), -- in cm
  weight DECIMAL(5,2), -- in kg
  target_weight DECIMAL(5,2), -- in kg
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extra-active')),
  health_goals TEXT CHECK (health_goals IN ('weight-loss', 'weight-gain', 'muscle-building', 'maintenance', 'general-health', 'athletic-performance')),
  diet_preference TEXT CHECK (diet_preference IN ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean', 'low-carb', 'other')),
  activity_goals TEXT CHECK (activity_goals IN ('increase-cardio', 'build-strength', 'improve-flexibility', 'lose-fat', 'gain-muscle', 'sports-performance', 'general-fitness', 'injury-recovery'))
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    age, 
    gender, 
    height, 
    weight, 
    target_weight, 
    activity_level, 
    health_goals, 
    diet_preference, 
    activity_goals
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    CASE 
      WHEN NEW.raw_user_meta_data->>'age' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'age')::INTEGER 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'gender',
    CASE 
      WHEN NEW.raw_user_meta_data->>'height' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'height')::DECIMAL 
      ELSE NULL 
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'weight' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'weight')::DECIMAL 
      ELSE NULL 
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'target_weight' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'target_weight')::DECIMAL 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'activity_level',
    NEW.raw_user_meta_data->>'health_goals',
    NEW.raw_user_meta_data->>'diet_preference',
    NEW.raw_user_meta_data->>'activity_goals'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on profile changes
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();