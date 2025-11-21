/**
 * Production-grade hook for fetching user nutrition goals
 * Handles caching, error states, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NutritionGoals {
  id: string;
  user_id: string;
  daily_calories: number;
  daily_carbs: number;
  daily_fats: number;
  daily_proteins: number;
  calculation_date: string;
  created_at: string;
}

export interface UseNutritionGoalsResult {
  goals: NutritionGoals | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateGoals: (updates: Partial<Omit<NutritionGoals, 'id' | 'user_id' | 'created_at'>>) => Promise<boolean>;
}

export function useNutritionGoals(): UseNutritionGoalsResult {
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * Fetch nutrition goals for the current user
   */
  const fetchGoals = useCallback(async () => {
    if (!user?.id) {
      setGoals(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('calculation_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching nutrition goals:', fetchError);
        setError(`Failed to fetch nutrition goals: ${fetchError.message}`);
        return;
      }

      setGoals(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Unexpected error fetching nutrition goals:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Update nutrition goals
   */
  const updateGoals = useCallback(async (
    updates: Partial<Omit<NutritionGoals, 'id' | 'user_id' | 'created_at'>>
  ): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to update nutrition goals.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const goalData = {
        user_id: user.id,
        calculation_date: new Date().toISOString().split('T')[0],
        ...updates
      };

      const { data, error: updateError } = await supabase
        .from('nutrition_goals')
        .upsert(goalData, {
          onConflict: 'user_id,calculation_date'
        })
        .select()
        .single();

      if (updateError) {
        console.error('Error updating nutrition goals:', updateError);
        toast({
          title: "Update Failed",
          description: `Failed to update nutrition goals: ${updateError.message}`,
          variant: "destructive"
        });
        return false;
      }

      setGoals(data);
      toast({
        title: "Goals Updated",
        description: "Your nutrition goals have been successfully updated.",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Unexpected error updating nutrition goals:', err);
      toast({
        title: "Update Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  /**
   * Refetch goals (useful for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchGoals();
  }, [fetchGoals]);

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    fetchGoals();

    // Set up real-time subscription for nutrition goals changes
    if (user?.id) {
      const subscription = supabase
        .channel(`nutrition_goals_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nutrition_goals',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Nutrition goals updated:', payload);
            fetchGoals(); // Refetch on any change
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, fetchGoals]);

  return {
    goals,
    loading,
    error,
    refetch,
    updateGoals
  };
}