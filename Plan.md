# AI Nutrition Analyzer - Implementation Plan

## Overview
Transform the app into a functional nutrition tracking system with personalized recommendations for Diabetes and Gym users, real-time progress tracking, and comprehensive food logging capabilities.

## Current State Analysis

### Issues Identified:
- ✗ No user motivation selection (Diabetes/Gym) after registration
- ✗ Profile data is not being saved to Supabase during signup
- ✗ No `profiles` table exists in Supabase
- ✗ All pages (Dashboard, FoodLog) use hardcoded mock data
- ✗ No database tables for nutrition tracking, food logs, or meal entries
- ✗ No calorie/macro calculation based on user data
- ✗ No image upload functionality for food logging

### What Exists:
- ✓ Authentication with Supabase (Login/Signup pages)
- ✓ ProfileContext with data fetching logic
- ✓ AuthContext for user management
- ✓ UI components for Dashboard, FoodLog, Profile, Chatbot
- ✓ Protected routes setup

---

## Phase 1: Database Schema Setup

### 1.1 Create User Profiles Table
Create a `profiles` table with a trigger to auto-populate on user signup:

**Fields:**
- `id` (uuid, primary key, references auth.users)
- `full_name` (text)
- `age` (integer)
- `gender` (text)
- `height` (numeric) - in cm
- `weight` (numeric) - in kg
- `target_weight` (numeric) - in kg
- `user_type` (text) - **NEW: 'diabetes', 'gym', or 'general'**
- `created_at` (timestamp)

**Trigger:** Auto-create profile when user signs up, extracting data from `raw_user_meta_data`

**RLS Policies:**
- Users can read their own profile
- Users can update their own profile

### 1.2 Create Nutrition Goals Table
Store calculated daily nutrition targets based on user profile:

**Fields:**
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles.id)
- `daily_calories` (numeric)
- `daily_carbs` (numeric) - in grams
- `daily_fats` (numeric) - in grams
- `daily_proteins` (numeric) - in grams
- `calculation_date` (date)
- `created_at` (timestamp)

**RLS Policies:**
- Users can read their own nutrition goals
- System can insert/update nutrition goals

### 1.3 Create Food Items Table
Store food database for quick lookups:

**Fields:**
- `id` (uuid, primary key)
- `name` (text)
- `calories_per_100g` (numeric)
- `carbs_per_100g` (numeric)
- `fats_per_100g` (numeric)
- `proteins_per_100g` (numeric)
- `is_custom` (boolean) - user-created vs system
- `created_by` (uuid, nullable, references profiles.id)
- `created_at` (timestamp)

**RLS Policies:**
- Anyone can read system foods (is_custom = false)
- Users can read/write their own custom foods

### 1.4 Create Meal Logs Table
Track user meals with nutrition data:

**Fields:**
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles.id)
- `meal_type` (text) - 'breakfast', 'lunch', 'dinner', 'snack'
- `food_name` (text)
- `portion_size` (numeric) - in grams
- `calories` (numeric)
- `carbs` (numeric)
- `fats` (numeric)
- `proteins` (numeric)
- `image_url` (text, nullable)
- `logged_at` (timestamp)
- `created_at` (timestamp)

**RLS Policies:**
- Users can read/write/delete their own meal logs

### 1.5 Create Daily Nutrition Summary Table
Cache daily totals for performance:

**Fields:**
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles.id)
- `date` (date)
- `total_calories` (numeric)
- `total_carbs` (numeric)
- `total_fats` (numeric)
- `total_proteins` (numeric)
- `meals_logged` (integer)
- `updated_at` (timestamp)

**RLS Policies:**
- Users can read their own daily summaries
- System can insert/update summaries

### 1.6 Create Storage Bucket
For food images:
- Bucket name: `meal-images`
- Public access: true
- File size limit: 10MB
- Allowed types: image/jpeg, image/png, image/webp

**RLS Policies:**
- Users can upload to their own folder
- Anyone can read public images

---

## Phase 2: Onboarding Flow Enhancement

### 2.1 Add User Type Selection After Signup
Create a new onboarding page (`/onboarding`) that appears after successful registration:

**Steps:**
1. Welcome screen
2. Select user type: "Managing Diabetes" / "Gym & Fitness" / "General Health"
3. Based on selection, show relevant questions:
   - **Diabetes users:** Medication details, blood sugar monitoring, dietary restrictions
   - **Gym users:** Workout frequency, fitness goals (bulk/cut/maintain), training style
   - **General users:** Overall health goals, dietary preferences
4. Set activity level and dietary preferences
5. Calculate initial nutrition goals

**Implementation:**
- Create `src/pages/Onboarding.tsx` component
- Add route in App.tsx
- Redirect to onboarding if `profile.user_type` is null
- Save all data to profiles table
- Calculate and save nutrition goals

### 2.2 Update Signup Flow
Modify `Signup.tsx` to:
- Store user metadata in auth signup
- Add `emailRedirectTo` option
- Redirect to `/onboarding` instead of `/login` after successful signup
- Handle profile creation via database trigger

---

## Phase 3: Nutrition Calculation Engine

### 3.1 Create Calculation Functions
Build edge functions or client-side utilities:

**Calculate Basal Metabolic Rate (BMR):**
- Mifflin-St Jeor Equation
- Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
- Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161

**Calculate Total Daily Energy Expenditure (TDEE):**
- BMR × activity multiplier:
  - Sedentary: 1.2
  - Lightly active: 1.375
  - Moderately active: 1.55
  - Very active: 1.725
  - Extra active: 1.9

**Calculate Macros:**
Based on user type and goals:
- **Diabetes:** Lower carbs (40% carbs, 30% protein, 30% fat)
- **Gym (bulk):** Higher protein/carbs (40% carbs, 35% protein, 25% fat)
- **Gym (cut):** High protein, moderate carbs (35% carbs, 40% protein, 25% fat)
- **General:** Balanced (45% carbs, 25% protein, 30% fat)

**Implementation:**
- Create `src/lib/nutritionCalculations.ts`
- Function: `calculateNutritionGoals(profile: UserProfile)`
- Store results in `nutrition_goals` table

---

## Phase 4: Dashboard Real Data Integration

### 4.1 Update Dashboard Component
Replace mock data with real Supabase queries:

**Data to fetch:**
1. Today's nutrition goals (from `nutrition_goals` table)
2. Today's consumed nutrition (from `daily_nutrition_summary` table)
3. Weekly progress (last 7 days from `daily_nutrition_summary`)
4. Risk level calculation based on completion percentage

**Features to implement:**
- Real-time progress bars
- Weekly chart with actual data
- Dynamic risk level (good: >80%, warning: 50-80%, danger: <50%)
- Food suggestions based on user type (diabetes/gym/general)
- Refresh data on mount and when food is logged

### 4.2 Add Data Fetching Hooks
Create custom hooks:
- `useNutritionGoals()` - Fetch daily targets
- `useDailySummary(date)` - Fetch day's consumption
- `useWeeklySummary()` - Fetch 7-day history

---

## Phase 5: Food Log Real Functionality

### 5.1 Add Food by Name
**Features:**
1. Search food database (local foods table)
2. Manual entry with nutrition values
3. Select portion size
4. Select meal type (breakfast/lunch/dinner)
5. Calculate nutrition based on portion
6. Save to `meal_logs` table
7. Update `daily_nutrition_summary` table

**Implementation:**
- Create `src/components/FoodSearch.tsx` component
- Add autocomplete search
- Add manual nutrition entry form
- Use Supabase insert for meal logs
- Trigger summary recalculation

### 5.2 Upload Food Image
**Features:**
1. Image upload to Supabase Storage
2. Optional: AI image analysis for food recognition (future enhancement)
3. Manual nutrition entry
4. Save image URL with meal log

**Implementation:**
- Create file upload component
- Upload to `meal-images` bucket
- Store URL in `meal_logs.image_url`
- Display images in meal cards

### 5.3 Meal Display and Management
**Features:**
1. Display meals by type (breakfast/lunch/dinner)
2. Show total calories per meal
3. Delete meal entries
4. Edit meal entries
5. Real-time summary updates

**Implementation:**
- Create `useMealLogs(date, mealType)` hook
- Add delete functionality
- Add edit dialog
- Recalculate summary on changes

---

## Phase 6: Profile Page Data Integration

### 6.1 Update Profile Display
Replace mock display with real data from `profiles` table:
- Show actual profile data from Supabase
- Display user type badge (Diabetes/Gym/General)
- Show calculated BMI
- Show current nutrition goals

### 6.2 Update Profile Editing
Ensure profile updates work correctly:
- Validate all inputs
- Save to `profiles` table
- Recalculate nutrition goals if weight/activity/goals change
- Update `nutrition_goals` table with new calculations

---

## Phase 7: Smart Device Integration (Future)

Placeholder for fitness tracker integration:
- Connect to Google Fit / Apple Health
- Import activity data
- Adjust TDEE based on actual activity
- Display steps, workouts, heart rate

---

## Phase 8: AI Chatbot Enhancement ✅ COMPLETED

Enhanced chatbot with:
- ✅ Nutrition advice based on user type (diabetes, gym, general)
- ✅ AI-powered meal suggestions with personalized recommendations
- ✅ Progress analysis combining nutrition and activity data
- ✅ Motivation and tips tailored to user goals
- ✅ **GEMINI API INTEGRATION**: Food image analysis with nutrition extraction
- ✅ **FOOD PHOTO ANALYSIS**: Upload food images → Get calories, carbs, proteins, fats
- ✅ **SMART MEAL LOGGING**: Direct integration from AI analysis to meal logs
- ✅ **USER TYPE OPTIMIZATION**: Specialized advice for each user category
- ✅ **REAL-TIME AI CONVERSATIONS**: Interactive nutrition coaching
- ✅ **PRODUCTION-READY**: Full error handling, security, and performance optimization

**Implementation Details:**
- Complete Gemini AI service integration (`src/lib/geminiAI.ts`)
- Enhanced Chatbot component with image upload and analysis (`src/pages/Chatbot.tsx`)
- User type-specific prompt templates and smart suggestions
- Real-time progress analysis with activity data integration
- One-click meal logging from AI food analysis
- Comprehensive error handling and graceful degradation

---

## Technical Implementation Order

### Week 1: Database & Backend
1. ✓ Create all Supabase tables with migrations
2. ✓ Set up RLS policies
3. ✓ Create storage bucket
4. ✓ Set up database triggers
5. ✓ Create nutrition calculation functions

### Week 2: Onboarding & Profile
1. Create onboarding flow
2. Update signup process
3. Fix profile data storage
4. Implement nutrition goal calculations
5. Test profile CRUD operations

### Week 3: Dashboard Integration
1. Create data fetching hooks
2. Replace mock data in Dashboard
3. Implement real-time calculations
4. Add weekly progress charts
5. Implement risk level logic

### Week 4: Food Log Functionality
1. Implement food search/manual entry
2. Add image upload
3. Create meal logging system
4. Build daily summary calculations
5. Add edit/delete functionality

### Week 5: Testing & Polish
1. End-to-end testing
2. Performance optimization
3. Error handling
4. UI/UX improvements
5. Documentation

---

## Files to Create/Modify

### New Files:
1. `src/pages/Onboarding.tsx` - User type selection and initial setup
2. `src/lib/nutritionCalculations.ts` - BMR, TDEE, macro calculations
3. `src/hooks/useNutritionGoals.ts` - Fetch nutrition targets
4. `src/hooks/useDailySummary.ts` - Fetch daily consumption
5. `src/hooks/useMealLogs.ts` - Fetch/manage meal logs
6. `src/hooks/useWeeklySummary.ts` - Fetch weekly data
7. `src/components/FoodSearch.tsx` - Food search/entry component
8. `src/components/ImageUpload.tsx` - Image upload component
9. `src/components/MealCard.tsx` - Individual meal display

### Files to Modify:
1. `src/pages/Signup.tsx` - Add emailRedirectTo, update metadata
2. `src/pages/Dashboard.tsx` - Replace mock data with real queries
3. `src/pages/FoodLog.tsx` - Add real food logging functionality
4. `src/pages/Profile.tsx` - Already mostly working, minor fixes needed
5. `src/contexts/ProfileContext.tsx` - Add user type handling
6. `src/App.tsx` - Add onboarding route and redirect logic
7. `src/lib/supabase.ts` - Already configured

---

## Expected Behavior After Implementation

### Registration Flow:
1. User signs up on `/signup` with personal info
2. Profile created automatically via trigger
3. Redirected to `/onboarding`
4. Selects user type (Diabetes/Gym/General)
5. Answers type-specific questions
6. System calculates nutrition goals
7. Redirected to `/dashboard`

### Dashboard Experience:
1. Shows today's nutrition targets (calories, carbs, fats, proteins)
2. Shows current progress (consumed vs target)
3. Progress bars update in real-time
4. Weekly chart shows last 7 days
5. Risk level indicator (green/yellow/red)
6. Food suggestions based on user type

### Food Logging:
1. User can search foods or enter manually
2. Upload food image (optional)
3. Select meal type (breakfast/lunch/dinner)
4. Specify portion size
5. Nutrition auto-calculated
6. Saved to database
7. Dashboard updates automatically

### Profile Management:
1. View complete profile with all data
2. Edit any field
3. System recalculates goals if needed
4. Changes saved to database
5. UI reflects changes immediately

---

## Security Considerations

1. ✓ RLS policies ensure users only access their own data
2. ✓ Input validation on all forms
3. ✓ Email verification required for signup
4. ✓ Secure file uploads with size/type restrictions
5. ✓ No sensitive data in client-side code
6. ✓ Proper error handling without exposing internals

---

## Performance Optimizations

1. Use daily summary cache instead of recalculating totals
2. Index frequently queried fields (user_id, date)
3. Lazy load meal images
4. Debounce search inputs
5. Use React Query for caching
6. Batch database updates where possible
