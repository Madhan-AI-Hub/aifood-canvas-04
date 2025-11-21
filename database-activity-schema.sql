-- Activity Data Tables for Smart Device Integration
-- Phase 7: Smart Device Integration Schema

-- 1. Device Connections Table
CREATE TABLE device_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_type TEXT NOT NULL CHECK (device_type IN ('google_fit', 'apple_health', 'fitbit', 'garmin', 'samsung_health')),
    device_name TEXT,
    connection_status TEXT DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    access_token_encrypted TEXT, -- Encrypted tokens for API access
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activity Data Table  
CREATE TABLE activity_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    distance_meters NUMERIC DEFAULT 0, -- Distance in meters
    active_minutes INTEGER DEFAULT 0, -- Active/exercise minutes
    calories_burned NUMERIC DEFAULT 0, -- Calories from activity
    heart_rate_avg NUMERIC, -- Average heart rate
    heart_rate_resting NUMERIC, -- Resting heart rate
    sleep_hours NUMERIC, -- Total sleep hours
    sleep_quality TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
    floors_climbed INTEGER DEFAULT 0,
    exercise_sessions JSONB DEFAULT '[]'::jsonb, -- Array of exercise session data
    data_source TEXT NOT NULL, -- 'google_fit', 'apple_health', 'manual', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date) -- One record per user per day
);

-- 3. Exercise Sessions Table (detailed workout data)
CREATE TABLE exercise_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_data_id UUID REFERENCES activity_data(id) ON DELETE CASCADE,
    exercise_type TEXT NOT NULL, -- 'running', 'cycling', 'weightlifting', etc.
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories_burned NUMERIC DEFAULT 0,
    heart_rate_avg NUMERIC,
    heart_rate_max NUMERIC,
    distance_meters NUMERIC,
    steps INTEGER,
    exercise_intensity TEXT CHECK (exercise_intensity IN ('light', 'moderate', 'vigorous')),
    data_source TEXT NOT NULL,
    raw_data JSONB, -- Store raw data from fitness APIs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Activity Goals Table
CREATE TABLE activity_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    daily_steps_goal INTEGER DEFAULT 10000,
    daily_active_minutes_goal INTEGER DEFAULT 60,
    daily_calories_goal NUMERIC DEFAULT 300,
    weekly_exercise_sessions_goal INTEGER DEFAULT 5,
    sleep_hours_goal NUMERIC DEFAULT 8.0,
    goal_start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enhanced Nutrition Goals Table (update existing)
-- Add activity_level_override to use real activity data instead of static levels
ALTER TABLE nutrition_goals ADD COLUMN IF NOT EXISTS activity_level_override NUMERIC; -- Calculated from real activity data
ALTER TABLE nutrition_goals ADD COLUMN IF NOT EXISTS activity_based_tdee NUMERIC; -- TDEE calculated from actual activity
ALTER TABLE nutrition_goals ADD COLUMN IF NOT EXISTS last_activity_sync TIMESTAMP WITH TIME ZONE; -- When activity was last factored in

-- Create indexes for performance
CREATE INDEX idx_device_connections_user_id ON device_connections(user_id);
CREATE INDEX idx_device_connections_status ON device_connections(connection_status);
CREATE INDEX idx_activity_data_user_date ON activity_data(user_id, date);
CREATE INDEX idx_activity_data_date ON activity_data(date);
CREATE INDEX idx_exercise_sessions_user_id ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_sessions_start_time ON exercise_sessions(start_time);
CREATE INDEX idx_activity_goals_user_id ON activity_goals(user_id);

-- Row Level Security Policies
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_data ENABLE ROW LEVEL SECURITY;  
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_connections
CREATE POLICY "Users can view their own device connections" ON device_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own device connections" ON device_connections
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for activity_data
CREATE POLICY "Users can view their own activity data" ON activity_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own activity data" ON activity_data
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for exercise_sessions
CREATE POLICY "Users can view their own exercise sessions" ON exercise_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own exercise sessions" ON exercise_sessions
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for activity_goals
CREATE POLICY "Users can view their own activity goals" ON activity_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own activity goals" ON activity_goals
    FOR ALL USING (auth.uid() = user_id);

-- Function to calculate dynamic activity level from actual data
CREATE OR REPLACE FUNCTION calculate_activity_level(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS NUMERIC AS $$
DECLARE
    avg_steps NUMERIC;
    avg_active_minutes NUMERIC;
    avg_exercise_sessions NUMERIC;
    activity_multiplier NUMERIC;
BEGIN
    -- Get average activity data for the last N days
    SELECT 
        AVG(steps),
        AVG(active_minutes),
        AVG(COALESCE(jsonb_array_length(exercise_sessions), 0))
    INTO avg_steps, avg_active_minutes, avg_exercise_sessions
    FROM activity_data 
    WHERE user_id = p_user_id 
    AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days;

    -- Calculate activity multiplier based on real data
    -- Base sedentary: 1.2
    -- Add for steps: +0.0001 per step above 2000
    -- Add for active minutes: +0.005 per minute above 30
    -- Add for exercise sessions: +0.05 per session per day
    
    activity_multiplier := 1.2; -- Base sedentary
    
    IF avg_steps IS NOT NULL AND avg_steps > 2000 THEN
        activity_multiplier := activity_multiplier + ((avg_steps - 2000) * 0.0001);
    END IF;
    
    IF avg_active_minutes IS NOT NULL AND avg_active_minutes > 30 THEN
        activity_multiplier := activity_multiplier + ((avg_active_minutes - 30) * 0.005);
    END IF;
    
    IF avg_exercise_sessions IS NOT NULL AND avg_exercise_sessions > 0 THEN
        activity_multiplier := activity_multiplier + (avg_exercise_sessions * 0.05);
    END IF;
    
    -- Cap the multiplier to reasonable bounds (1.2 to 2.0)
    activity_multiplier := LEAST(GREATEST(activity_multiplier, 1.2), 2.0);
    
    RETURN activity_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update nutrition goals based on activity data
CREATE OR REPLACE FUNCTION update_nutrition_goals_with_activity(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile RECORD;
    activity_level NUMERIC;
    bmr NUMERIC;
    new_tdee NUMERIC;
    macro_ratios RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate activity level from real data
    activity_level := calculate_activity_level(p_user_id);
    
    -- Calculate BMR using Mifflin-St Jeor equation
    IF user_profile.gender = 'male' THEN
        bmr := (10 * user_profile.weight) + (6.25 * user_profile.height) - (5 * user_profile.age) + 5;
    ELSE
        bmr := (10 * user_profile.weight) + (6.25 * user_profile.height) - (5 * user_profile.age) - 161;
    END IF;
    
    -- Calculate new TDEE with real activity data
    new_tdee := bmr * activity_level;
    
    -- Get macro ratios based on user type
    IF user_profile.user_type = 'diabetes' THEN
        macro_ratios := ROW(0.40, 0.30, 0.30); -- carbs, protein, fat
    ELSIF user_profile.user_type = 'gym' THEN
        macro_ratios := ROW(0.40, 0.35, 0.25);
    ELSE
        macro_ratios := ROW(0.45, 0.25, 0.30);
    END IF;
    
    -- Update nutrition goals with activity-based calculations
    INSERT INTO nutrition_goals (
        user_id, 
        daily_calories, 
        daily_carbs, 
        daily_proteins, 
        daily_fats,
        activity_level_override,
        activity_based_tdee,
        last_activity_sync,
        calculation_date
    ) VALUES (
        p_user_id,
        new_tdee,
        (new_tdee * macro_ratios.f1) / 4, -- carbs: 4 cal/g
        (new_tdee * macro_ratios.f2) / 4, -- protein: 4 cal/g  
        (new_tdee * macro_ratios.f3) / 9, -- fat: 9 cal/g
        activity_level,
        new_tdee,
        NOW(),
        CURRENT_DATE
    ) ON CONFLICT (user_id, calculation_date) 
    DO UPDATE SET
        daily_calories = EXCLUDED.daily_calories,
        daily_carbs = EXCLUDED.daily_carbs,
        daily_proteins = EXCLUDED.daily_proteins,
        daily_fats = EXCLUDED.daily_fats,
        activity_level_override = EXCLUDED.activity_level_override,
        activity_based_tdee = EXCLUDED.activity_based_tdee,
        last_activity_sync = EXCLUDED.last_activity_sync;
        
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update nutrition goals when activity data changes
CREATE OR REPLACE FUNCTION trigger_update_nutrition_goals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update nutrition goals when activity data is inserted/updated
    PERFORM update_nutrition_goals_with_activity(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_data_nutrition_update
    AFTER INSERT OR UPDATE ON activity_data
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_nutrition_goals();

-- Insert default activity goals for existing users
INSERT INTO activity_goals (user_id, daily_steps_goal, daily_active_minutes_goal, daily_calories_goal)
SELECT id, 10000, 60, 300
FROM profiles 
WHERE id NOT IN (SELECT user_id FROM activity_goals WHERE is_active = true)
ON CONFLICT DO NOTHING;