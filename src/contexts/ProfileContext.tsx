import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id?: string;
  full_name?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  target_weight?: number;
  activity_level?: string;
  health_goals?: string;
  diet_preference?: string;
  activity_goals?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isProfileComplete: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider = ({ children }: ProfileProviderProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if profile is complete (has essential fields)
  const isProfileComplete = Boolean(
    profile?.full_name && 
    profile?.age && 
    profile?.height && 
    profile?.weight &&
    profile?.activity_level &&
    profile?.health_goals
  );

  const fetchProfile = async () => {
    if (!user) {
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
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile found - create empty profile
          console.log('No profile found for user, creating empty profile...');
          setProfile({});
        } else {
          console.error('Profile fetch error:', fetchError);
          setError(fetchError.message);
          toast({
            title: "Profile Error",
            description: `Failed to load profile: ${fetchError.message}`,
            variant: "destructive",
          });
        }
      } else {
        setProfile(data || {});
        console.log('Profile loaded:', data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Unexpected profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;

    try {
      const profileData = {
        ...data,
        id: user.id,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast({
          title: "Update Error",
          description: `Failed to update profile: ${updateError.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Update local profile state
      setProfile(prev => ({ ...prev, ...profileData }));
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected profile update error:', err);
      toast({
        title: "Update Error",
        description: `Unexpected error: ${errorMessage}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = {
    profile,
    loading,
    error,
    isProfileComplete,
    refreshProfile,
    updateProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};