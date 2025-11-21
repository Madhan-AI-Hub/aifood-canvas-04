/**
 * Production-grade hook for fetching weekly nutrition summaries
 * Provides 7-day trends and analytics for dashboard charts
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WeeklySummaryData {
  date: string;
  total_calories: number;
  total_carbs: number;
  total_fats: number;
  total_proteins: number;
  meals_logged: number;
}

export interface WeeklyAnalytics {
  weekly_data: WeeklySummaryData[];
  averages: {
    avg_calories: number;
    avg_carbs: number;
    avg_fats: number;
    avg_proteins: number;
    avg_meals_per_day: number;
  };
  trends: {
    calories_trend: 'increasing' | 'decreasing' | 'stable';
    consistency_score: number; // 0-100, based on days with logged meals
    best_day: WeeklySummaryData | null;
    total_meals_logged: number;
  };
}

export interface UseWeeklySummaryResult {
  weeklyData: WeeklySummaryData[];
  analytics: WeeklyAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getWeekForDate: (date: string) => Promise<WeeklySummaryData[]>;
}

export function useWeeklySummary(endDate?: string): UseWeeklySummaryResult {
  const [weeklyData, setWeeklyData] = useState<WeeklySummaryData[]>([]);
  const [analytics, setAnalytics] = useState<WeeklyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Generate date range for the last 7 days
  const generateDateRange = useCallback((endDate: string): string[] => {
    const dates: string[] = [];
    const end = new Date(endDate);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(end.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }, []);

  /**
   * Calculate weekly analytics from raw data
   */
  const calculateAnalytics = useCallback((data: WeeklySummaryData[]): WeeklyAnalytics => {
    const totalDays = data.length;
    const daysWithData = data.filter(day => day.meals_logged > 0).length;
    
    // Calculate averages (only from days with data)
    const averages = data.reduce(
      (acc, day) => ({
        avg_calories: acc.avg_calories + day.total_calories,
        avg_carbs: acc.avg_carbs + day.total_carbs,
        avg_fats: acc.avg_fats + day.total_fats,
        avg_proteins: acc.avg_proteins + day.total_proteins,
        avg_meals_per_day: acc.avg_meals_per_day + day.meals_logged
      }),
      { avg_calories: 0, avg_carbs: 0, avg_fats: 0, avg_proteins: 0, avg_meals_per_day: 0 }
    );

    const divisor = Math.max(totalDays, 1);
    averages.avg_calories = Math.round(averages.avg_calories / divisor);
    averages.avg_carbs = Math.round(averages.avg_carbs / divisor);
    averages.avg_fats = Math.round(averages.avg_fats / divisor);
    averages.avg_proteins = Math.round(averages.avg_proteins / divisor);
    averages.avg_meals_per_day = Math.round(averages.avg_meals_per_day / divisor);

    // Calculate trend (compare first half vs second half)
    const firstHalf = data.slice(0, Math.floor(totalDays / 2));
    const secondHalf = data.slice(Math.floor(totalDays / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.total_calories, 0) / Math.max(firstHalf.length, 1);
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.total_calories, 0) / Math.max(secondHalf.length, 1);
    
    let calories_trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const difference = secondHalfAvg - firstHalfAvg;
    
    if (Math.abs(difference) > 100) { // Threshold for significant change
      calories_trend = difference > 0 ? 'increasing' : 'decreasing';
    }

    // Find best day (highest calories with most balanced macros)
    const best_day = data.reduce((best, current) => {
      if (current.meals_logged === 0) return best;
      if (!best || current.total_calories > best.total_calories) {
        return current;
      }
      return best;
    }, null as WeeklySummaryData | null);

    // Calculate consistency score
    const consistency_score = Math.round((daysWithData / totalDays) * 100);
    
    const total_meals_logged = data.reduce((sum, day) => sum + day.meals_logged, 0);

    return {
      weekly_data: data,
      averages,
      trends: {
        calories_trend,
        consistency_score,
        best_day,
        total_meals_logged
      }
    };
  }, []);

  /**
   * Fetch weekly summary data for date range
   */
  const fetchWeeklySummaryForDateRange = useCallback(async (dates: string[]): Promise<WeeklySummaryData[]> => {
    if (!user?.id || dates.length === 0) {
      return [];
    }

    try {
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const { data, error: fetchError } = await supabase
        .from('daily_nutrition_summary')
        .select('date, total_calories, total_carbs, total_fats, total_proteins, meals_logged')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (fetchError) {
        console.error('Error fetching weekly summary:', fetchError);
        throw new Error(`Failed to fetch weekly summary: ${fetchError.message}`);
      }

      // Fill in missing dates with zero values
      const summaryMap = new Map(data?.map(item => [item.date, item]) || []);
      
      return dates.map(date => 
        summaryMap.get(date) || {
          date,
          total_calories: 0,
          total_carbs: 0,
          total_fats: 0,
          total_proteins: 0,
          meals_logged: 0
        }
      );
    } catch (err) {
      console.error('Unexpected error fetching weekly summary:', err);
      throw err;
    }
  }, [user?.id]);

  /**
   * Fetch and process weekly data
   */
  const fetchWeeklyData = useCallback(async () => {
    if (!user?.id) {
      setWeeklyData([]);
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const targetEndDate = endDate || new Date().toISOString().split('T')[0];
      const dateRange = generateDateRange(targetEndDate);
      
      const data = await fetchWeeklySummaryForDateRange(dateRange);
      const analyticsData = calculateAnalytics(data);
      
      setWeeklyData(data);
      setAnalytics(analyticsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error in fetchWeeklyData:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, endDate, generateDateRange, fetchWeeklySummaryForDateRange, calculateAnalytics]);

  /**
   * Get weekly data for any specific week ending on given date
   */
  const getWeekForDate = useCallback(async (date: string): Promise<WeeklySummaryData[]> => {
    try {
      const dateRange = generateDateRange(date);
      return await fetchWeeklySummaryForDateRange(dateRange);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Fetch Error",
        description: `Failed to fetch weekly data for ${date}: ${errorMessage}`,
        variant: "destructive"
      });
      return [];
    }
  }, [generateDateRange, fetchWeeklySummaryForDateRange, toast]);

  /**
   * Refetch current weekly data
   */
  const refetch = useCallback(async () => {
    await fetchWeeklyData();
  }, [fetchWeeklyData]);

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    fetchWeeklyData();

    // Set up real-time subscription for daily summary changes (affects weekly data)
    if (user?.id) {
      const subscription = supabase
        .channel(`weekly_summary_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_nutrition_summary',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Daily summary updated (affecting weekly data):', payload);
            // Debounced refetch to avoid excessive API calls
            setTimeout(() => {
              fetchWeeklyData();
            }, 1000);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, fetchWeeklyData]);

  return {
    weeklyData,
    analytics,
    loading,
    error,
    refetch,
    getWeekForDate
  };
}