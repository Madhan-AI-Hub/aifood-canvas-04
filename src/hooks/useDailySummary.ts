/**
 * Production-grade hook for fetching daily nutrition summaries
 * Provides current day consumption totals and trends
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_carbs: number;
  total_fats: number;
  total_proteins: number;
  meals_logged: number;
  updated_at: string;
}

export interface UseDailySummaryResult {
  summary: DailySummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getSummaryForDate: (date: string) => Promise<DailySummary | null>;
}

export function useDailySummary(targetDate?: string): UseDailySummaryResult {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Use target date or default to today
  const queryDate = targetDate || new Date().toISOString().split('T')[0];

  /**
   * Fetch daily summary for specific date
   */
  const fetchSummaryForDate = useCallback(async (date: string): Promise<DailySummary | null> => {
    if (!user?.id) {
      return null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_nutrition_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching daily summary:', fetchError);
        throw new Error(`Failed to fetch daily summary: ${fetchError.message}`);
      }

      return data;
    } catch (err) {
      console.error('Unexpected error fetching daily summary:', err);
      throw err;
    }
  }, [user?.id]);

  /**
   * Fetch summary for the query date
   */
  const fetchSummary = useCallback(async () => {
    if (!user?.id) {
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchSummaryForDate(queryDate);
      setSummary(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, queryDate, fetchSummaryForDate]);

  /**
   * Get summary for any specific date (utility function)
   */
  const getSummaryForDate = useCallback(async (date: string): Promise<DailySummary | null> => {
    try {
      return await fetchSummaryForDate(date);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Fetch Error",
        description: `Failed to fetch data for ${date}: ${errorMessage}`,
        variant: "destructive"
      });
      return null;
    }
  }, [fetchSummaryForDate, toast]);

  /**
   * Refetch current summary
   */
  const refetch = useCallback(async () => {
    await fetchSummary();
  }, [fetchSummary]);

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    fetchSummary();

    // Set up real-time subscription for daily summary changes
    if (user?.id) {
      const subscription = supabase
        .channel(`daily_summary_${user.id}_${queryDate}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_nutrition_summary',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Daily summary updated:', payload);
            // Only refetch if the change affects our query date
            const newRecord = payload.new as DailySummary | null;
            const oldRecord = payload.old as DailySummary | null;
            if (newRecord?.date === queryDate || oldRecord?.date === queryDate) {
              fetchSummary();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, queryDate, fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch,
    getSummaryForDate
  };
}