# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - Name: "aifood-canvas-04" (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose the closest to your location
6. Click "Create new project"

## Step 2: Get Your Project Credentials

After your project is created:

1. Go to your project dashboard
2. Click on "Settings" in the left sidebar
3. Click on "API" 
4. You'll see:
   - **Project URL**: Copy this (looks like: https://xyzabcdefgh.supabase.co)
   - **anon public key**: Copy this (long JWT token)

## Step 3: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Enable Authentication in Supabase

1. In your Supabase dashboard, go to "Authentication"
2. Click on "Settings"
3. Make sure these are enabled:
   - Enable email confirmations (optional, can disable for testing)
   - Enable secure password requirements

## Step 5: Restart Your Development Server

After updating the .env file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 6: Set Up User Profiles Table

1. In your Supabase dashboard, go to "SQL Editor"
2. Open the file `supabase_profiles_migration.sql` in your project
3. Copy all the SQL code and paste it into the SQL Editor
4. Click "Run" to execute the migration
5. This will create:
   - A `profiles` table to store user information
   - Row Level Security policies
   - Automatic trigger to create profiles when users sign up

## Step 7: Test Authentication

1. Go to your website (http://localhost:8083)
2. Try to sign up with a new account (fill in all the new fields)
3. Check the Supabase dashboard > Authentication > Users to see if the user was created
4. Check the "Table Editor" > "profiles" table to see if the profile data was saved
5. Try logging in with the created account

## Troubleshooting

- Make sure the .env file is in the project root (same level as package.json)
- Restart the development server after changing environment variables
- Check the browser console for any error messages
- Verify your Supabase URL and key are correct

## What's Already Configured

Your app already has:
✅ Supabase client setup in `src/lib/supabase.ts`
✅ Login functionality in `src/pages/Login.tsx`
✅ Signup functionality in `src/pages/Signup.tsx`
✅ Password reset functionality
✅ OAuth authentication support (Google)

You just need to provide the actual Supabase credentials!