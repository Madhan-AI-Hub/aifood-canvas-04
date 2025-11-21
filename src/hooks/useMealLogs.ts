/**
 * Production-grade hook for managing meal logs
 * Provides CRUD operations for food logging with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MealLog {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  portion_size: number; // in grams
  calories: number;
  carbs: number; // in grams
  fats: number; // in grams
  proteins: number; // in grams
  image_url?: string;
  logged_at: string;
  created_at: string;
}

export interface NewMealLog {
  meal_type: MealLog['meal_type'];
  food_name: string;
  portion_size: number;
  calories: number;
  carbs: number;
  fats: number;
  proteins: number;
  image_url?: string;
  logged_at?: string; // Optional, defaults to current time
}

export interface UseMealLogsResult {
  meals: MealLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addMeal: (meal: NewMealLog) => Promise<boolean>;
  updateMeal: (id: string, updates: Partial<NewMealLog>) => Promise<boolean>;
  deleteMeal: (id: string) => Promise<boolean>;
  getMealsByType: (mealType: MealLog['meal_type']) => MealLog[];
  getTodaysTotals: () => {
    calories: number;
    carbs: number;
    fats: number;
    proteins: number;
    meals_count: number;
  };
}

export function useMealLogs(targetDate?: string, mealType?: MealLog['meal_type']): UseMealLogsResult {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Use target date or default to today
  const queryDate = targetDate || new Date().toISOString().split('T')[0];

  /**
   * Fetch meal logs for the specified date and meal type
   */
  const fetchMeals = useCallback(async () => {
    if (!user?.id) {
      setMeals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', `${queryDate}T00:00:00.000Z`)
        .lt('logged_at', `${queryDate}T23:59:59.999Z`)
        .order('logged_at', { ascending: false });

      // Filter by meal type if specified
      if (mealType) {
        query = query.eq('meal_type', mealType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching meal logs:', fetchError);
        setError(`Failed to fetch meal logs: ${fetchError.message}`);
        return;
      }

      setMeals(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Unexpected error fetching meal logs:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, queryDate, mealType]);

  /**
   * Add a new meal log
   */
  const addMeal = useCallback(async (meal: NewMealLog): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to log meals.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const mealData = {
        user_id: user.id,
        logged_at: meal.logged_at || new Date().toISOString(),
        ...meal
      };

      const { data, error: insertError } = await supabase
        .from('meal_logs')
        .insert([mealData])
        .select()
        .single();

      if (insertError) {
        console.error('Error adding meal log:', insertError);
        toast({
          title: "Add Failed",
          description: `Failed to log meal: ${insertError.message}`,
          variant: "destructive"
        });
        return false;
      }

      // Optimistically add to local state
      setMeals(prev => [data, ...prev]);
      
      toast({
        title: "Meal Logged",
        description: `${meal.food_name} has been added to your ${meal.meal_type}.`,
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Unexpected error adding meal log:', err);
      toast({
        title: "Add Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  /**
   * Update an existing meal log
   */
  const updateMeal = useCallback(async (id: string, updates: Partial<NewMealLog>): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to update meals.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('meal_logs')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own meals
        .select()
        .single();

      if (updateError) {
        console.error('Error updating meal log:', updateError);
        toast({
          title: "Update Failed",
          description: `Failed to update meal: ${updateError.message}`,
          variant: "destructive"
        });
        return false;
      }

      // Update local state
      setMeals(prev => prev.map(meal => meal.id === id ? data : meal));
      
      toast({
        title: "Meal Updated",
        description: "Your meal has been successfully updated.",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Unexpected error updating meal log:', err);
      toast({
        title: "Update Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  /**
   * Delete a meal log
   */
  const deleteMeal = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to delete meals.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own meals

      if (deleteError) {
        console.error('Error deleting meal log:', deleteError);
        toast({
          title: "Delete Failed",
          description: `Failed to delete meal: ${deleteError.message}`,
          variant: "destructive"
        });
        return false;
      }

      // Remove from local state
      setMeals(prev => prev.filter(meal => meal.id !== id));
      
      toast({
        title: "Meal Deleted",
        description: "The meal has been removed from your log.",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Unexpected error deleting meal log:', err);
      toast({
        title: "Delete Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id, toast]);

  /**
   * Get meals by type from current meals
   */
  const getMealsByType = useCallback((mealType: MealLog['meal_type']): MealLog[] => {
    return meals.filter(meal => meal.meal_type === mealType);
  }, [meals]);

  /**
   * Calculate today's nutrition totals
   */
  const getTodaysTotals = useCallback(() => {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.calories,
        carbs: totals.carbs + meal.carbs,
        fats: totals.fats + meal.fats,
        proteins: totals.proteins + meal.proteins,
        meals_count: totals.meals_count + 1
      }),
      { calories: 0, carbs: 0, fats: 0, proteins: 0, meals_count: 0 }
    );
  }, [meals]);

  /**
   * Refetch meals
   */
  const refetch = useCallback(async () => {
    await fetchMeals();
  }, [fetchMeals]);

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    fetchMeals();

    // Set up real-time subscription for meal logs changes
    if (user?.id) {
      const subscription = supabase
        .channel(`meal_logs_${user.id}_${queryDate}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meal_logs',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Meal logs updated:', payload);
            // Refetch to ensure data consistency
            fetchMeals();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, queryDate, fetchMeals]);

  return {
    meals,
    loading,
    error,
    refetch,
    addMeal,
    updateMeal,
    deleteMeal,
    getMealsByType,
    getTodaysTotals
  };
}