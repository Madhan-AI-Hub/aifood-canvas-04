import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { calculateNutritionGoals, type UserProfile as NutritionUserProfile, type NutritionGoals } from '@/lib/nutritionCalculations';

// Production-grade interface with strict typing
export interface UserProfile {
  id: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  height: number | null; // cm
  weight: number | null; // kg
  target_weight: number | null; // kg
  user_type: 'diabetes' | 'gym' | 'general' | null;
  created_at: string;
}

// Extended profile with computed properties
export interface ExtendedProfile extends UserProfile {
  bmi?: number;
  bmi_category?: string;
  nutrition_goals?: NutritionGoals;
  profile_completion_percentage: number;
  next_required_step?: string;
}

interface ProfileContextType {
  profile: ExtendedProfile | null;
  loading: boolean;
  error: string | null;
  isProfileComplete: boolean;
  needsOnboarding: boolean;
  profileCompletionPercentage: number;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  calculateUserNutritionGoals: (goalType?: string) => NutritionGoals | null;
  saveNutritionGoals: (goals: NutritionGoals) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Custom hook with production-grade error handling
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider. Ensure the component is wrapped in ProfileProvider.');
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider = ({ children }: ProfileProviderProps) => {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Production-grade profile completion logic
  const calculateProfileCompletion = useCallback((profileData: UserProfile | null): {
    percentage: number;
    isComplete: boolean;
    needsOnboarding: boolean;
    nextStep?: string;
  } => {
    if (!profileData) {
      return {
        percentage: 0,
        isComplete: false,
        needsOnboarding: true,
        nextStep: 'complete_signup'
      };
    }

    const requiredFields = [
      { field: 'full_name', weight: 15, step: 'add_name' },
      { field: 'age', weight: 15, step: 'add_age' },
      { field: 'gender', weight: 15, step: 'select_gender' },
      { field: 'height', weight: 15, step: 'add_height' },
      { field: 'weight', weight: 15, step: 'add_weight' },
      { field: 'target_weight', weight: 15, step: 'set_target_weight' },
      { field: 'user_type', weight: 10, step: 'select_user_type' }
    ];

    let completedWeight = 0;
    let nextStep = '';

    for (const { field, weight, step } of requiredFields) {
      const value = profileData[field as keyof UserProfile];
      const isComplete = value !== null && value !== undefined && value !== '';
      
      if (isComplete) {
        completedWeight += weight;
      } else if (!nextStep) {
        nextStep = step;
      }
    }

    const percentage = Math.round(completedWeight);
    const isComplete = percentage === 100;
    const needsOnboarding = !profileData.user_type || percentage < 70;

    return {
      percentage,
      isComplete,
      needsOnboarding,
      nextStep: nextStep || undefined
    };
  }, []);

  // Enhanced profile fetching with error recovery
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle missing records gracefully

      if (fetchError) {
        console.error('Profile fetch error:', fetchError);
        setError(`Failed to load profile: ${fetchError.message}`);
        toast({
          title: "Profile Loading Error",
          description: "We couldn't load your profile. Please try refreshing the page.",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        // No profile exists - this is normal for new users
        console.log('No profile found for user - user needs to complete onboarding');
        const emptyProfile: ExtendedProfile = {
          id: user.id,
          full_name: null,
          age: null,
          gender: null,
          height: null,
          weight: null,
          target_weight: null,
          user_type: null,
          created_at: new Date().toISOString(),
          profile_completion_percentage: 0,
          next_required_step: 'complete_signup'
        };
        setProfile(emptyProfile);
      } else {
        // Calculate completion and enhance profile
        const completion = calculateProfileCompletion(data);
        
        const enhancedProfile: ExtendedProfile = {
          ...data,
          profile_completion_percentage: completion.percentage,
          next_required_step: completion.nextStep
        };

        // Calculate BMI if height and weight are available
        if (data.height && data.weight) {
          const heightInMeters = data.height / 100;
          const bmi = data.weight / (heightInMeters * heightInMeters);
          enhancedProfile.bmi = Math.round(bmi * 10) / 10;
          
          if (bmi < 18.5) enhancedProfile.bmi_category = 'Underweight';
          else if (bmi < 25) enhancedProfile.bmi_category = 'Normal';
          else if (bmi < 30) enhancedProfile.bmi_category = 'Overweight';
          else enhancedProfile.bmi_category = 'Obese';
        }

        setProfile(enhancedProfile);
        console.log('Profile loaded successfully:', { completion });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Unexpected profile fetch error:', err);
      toast({
        title: "Unexpected Error",
        description: "Something went wrong while loading your profile. Please contact support if this persists.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, calculateProfileCompletion, toast]);

  // Production-grade profile update with optimistic updates and rollback
  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to update your profile.",
        variant: "destructive",
      });
      return false;
    }

    // Optimistic update
    const previousProfile = profile;
    if (profile) {
      const optimisticProfile = { ...profile, ...data };
      const completion = calculateProfileCompletion(optimisticProfile);
      setProfile({
        ...optimisticProfile,
        profile_completion_percentage: completion.percentage,
        next_required_step: completion.nextStep
      });
    }

    try {
      const profileData = {
        ...data,
        id: user.id,
      };

      // Try to update first
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (updateError) {
        // If update fails, try to insert (in case profile doesn't exist)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error('Profile insert error:', insertError);
          // Rollback optimistic update
          setProfile(previousProfile);
          
          toast({
            title: "Update Failed",
            description: `Failed to save changes: ${insertError.message}`,
            variant: "destructive",
          });
          return false;
        }
      }

      // Success - refresh to get latest data
      await fetchProfile();
      
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
      
      return true;
    } catch (err) {
      // Rollback optimistic update
      setProfile(previousProfile);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected profile update error:', err);
      toast({
        title: "Update Error",
        description: `An unexpected error occurred: ${errorMessage}`,
        variant: "destructive",
      });
      return false;
    }
  }, [user?.id, profile, calculateProfileCompletion, fetchProfile, toast]);

  // Calculate nutrition goals for current profile
  const calculateUserNutritionGoals = useCallback((
    goalType: string = 'maintain'
  ): NutritionGoals | null => {
    if (!profile || !profile.age || !profile.gender || !profile.height || !profile.weight || !profile.target_weight || !profile.user_type) {
      return null;
    }

    try {
      return calculateNutritionGoals(profile as NutritionUserProfile, goalType);
    } catch (error) {
      console.error('Nutrition calculation error:', error);
      toast({
        title: "Calculation Error",
        description: "Unable to calculate nutrition goals. Please check your profile data.",
        variant: "destructive",
      });
      return null;
    }
  }, [profile, toast]);

  // Save nutrition goals to database
  const saveNutritionGoals = useCallback(async (goals: NutritionGoals): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('nutrition_goals')
        .upsert({
          user_id: user.id,
          daily_calories: goals.daily_calories,
          daily_carbs: goals.daily_carbs,
          daily_fats: goals.daily_fats,
          daily_proteins: goals.daily_proteins,
          calculation_date: new Date().toISOString().split('T')[0]
        }, {
          onConflict: 'user_id,calculation_date'
        });

      if (error) {
        console.error('Nutrition goals save error:', error);
        toast({
          title: "Save Failed",
          description: `Failed to save nutrition goals: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Goals Saved",
        description: "Your nutrition goals have been calculated and saved.",
      });
      return true;
    } catch (err) {
      console.error('Unexpected nutrition goals save error:', err);
      toast({
        title: "Save Error",
        description: "An unexpected error occurred while saving your nutrition goals.",
        variant: "destructive",
      });
      return false;
    }
  }, [user?.id, toast]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Computed properties
  const profileCompletion = profile ? calculateProfileCompletion(profile) : { percentage: 0, isComplete: false, needsOnboarding: true };
  const isProfileComplete = profileCompletion.isComplete;
  const needsOnboarding = profileCompletion.needsOnboarding;
  const profileCompletionPercentage = profileCompletion.percentage;

  // Effect to fetch profile when user changes
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [user?.id, fetchProfile]);

  const value: ProfileContextType = {
    profile,
    loading,
    error,
    isProfileComplete,
    needsOnboarding,
    profileCompletionPercentage,
    refreshProfile,
    updateProfile,
    calculateUserNutritionGoals,
    saveNutritionGoals,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};