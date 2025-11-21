/**
 * Google Fit API Integration for Web
 * Implements Google Fit REST API for activity data import
 */

import { ActivityData, ExerciseSession } from '@/hooks/useActivityData';

interface GoogleFitConfig {
  clientId: string;
  scopes: string[];
  redirectUri?: string;
}

interface GoogleFitDataPoint {
  startTimeNanos: string;
  endTimeNanos: string;
  dataTypeName: string;
  value: Array<{
    intVal?: number;
    fpVal?: number;
    stringVal?: string;
  }>;
}

interface GoogleFitDataSource {
  dataStreamId: string;
  dataType: {
    name: string;
  };
}

export class GoogleFitIntegration {
  private config: GoogleFitConfig;
  private isInitialized = false;
  private accessToken: string | null = null;

  constructor(config: GoogleFitConfig) {
    this.config = config;
    
    // Check if required configuration is present
    if (!config.clientId) {
      console.warn('Google Fit API: Missing clientId. Google Fit features will be unavailable.');
    } else {
      console.log('Google Fit API: Configuration loaded successfully');
      console.log('Client ID:', config.clientId.substring(0, 20) + '...');
      console.log('Scopes:', config.scopes);
    }
  }

  /**
   * Check if Google Fit API is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.clientId;
  }

  /**
   * Initialize Google Fit API
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if API is configured
      if (!this.isConfigured()) {
        console.warn('Google Fit API: Configuration missing. Cannot initialize.');
        return false;
      }

      // Load Google API client
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      await new Promise<void>((resolve) => {
        window.gapi.load('auth2', () => resolve());
      });

      await window.gapi.auth2.init({
        client_id: this.config.clientId,
        scope: this.config.scopes.join(' ')
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Fit API:', error);
      return false;
    }
  }

  /**
   * Load Google API script
   */
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  /**
   * Authenticate with Google Fit
   */
  async authenticate(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initSuccess = await this.initialize();
        if (!initSuccess) return false;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      
      this.accessToken = user.getAuthResponse().access_token;
      return true;
    } catch (error) {
      console.error('Google Fit authentication failed:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.isInitialized) return false;
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get() && !!this.accessToken;
  }

  /**
   * Fetch fitness data from Google Fit
   */
  async fetchFitnessData(startDate: Date, endDate: Date): Promise<Partial<ActivityData> | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Fit');
      }

      const startTimeNanos = (startDate.getTime() * 1000000).toString();
      const endTimeNanos = (endDate.getTime() * 1000000).toString();

      const [stepsData, caloriesData, distanceData, heartRateData, sleepData] = await Promise.all([
        this.fetchStepsData(startTimeNanos, endTimeNanos),
        this.fetchCaloriesData(startTimeNanos, endTimeNanos),
        this.fetchDistanceData(startTimeNanos, endTimeNanos),
        this.fetchHeartRateData(startTimeNanos, endTimeNanos),
        this.fetchSleepData(startTimeNanos, endTimeNanos)
      ]);

      return {
        steps: stepsData || 0,
        calories_burned: caloriesData || 0,
        distance_meters: distanceData || 0,
        heart_rate_avg: heartRateData?.avg,
        heart_rate_resting: heartRateData?.resting,
        sleep_hours: sleepData?.hours,
        sleep_quality: sleepData?.quality,
        data_source: 'google_fit'
      };
    } catch (error) {
      console.error('Failed to fetch Google Fit data:', error);
      return null;
    }
  }

  /**
   * Fetch steps data
   */
  private async fetchStepsData(startTimeNanos: string, endTimeNanos: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset/derived:com.google.step_count.delta:com.google.android.gms:estimated_steps/${startTimeNanos}-${endTimeNanos}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (!data.point || data.point.length === 0) return null;

      // Sum all step count values
      const totalSteps = data.point.reduce((total: number, point: GoogleFitDataPoint) => {
        const stepValue = point.value?.[0]?.intVal || 0;
        return total + stepValue;
      }, 0);

      return totalSteps;
    } catch (error) {
      console.error('Failed to fetch steps data:', error);
      return null;
    }
  }

  /**
   * Fetch calories data
   */
  private async fetchCaloriesData(startTimeNanos: string, endTimeNanos: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset/derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended/${startTimeNanos}-${endTimeNanos}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (!data.point || data.point.length === 0) return null;

      // Sum all calorie values
      const totalCalories = data.point.reduce((total: number, point: GoogleFitDataPoint) => {
        const calorieValue = point.value?.[0]?.fpVal || 0;
        return total + calorieValue;
      }, 0);

      return totalCalories;
    } catch (error) {
      console.error('Failed to fetch calories data:', error);
      return null;
    }
  }

  /**
   * Fetch distance data
   */
  private async fetchDistanceData(startTimeNanos: string, endTimeNanos: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset/derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta/${startTimeNanos}-${endTimeNanos}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (!data.point || data.point.length === 0) return null;

      // Sum all distance values
      const totalDistance = data.point.reduce((total: number, point: GoogleFitDataPoint) => {
        const distanceValue = point.value?.[0]?.fpVal || 0;
        return total + distanceValue;
      }, 0);

      return totalDistance;
    } catch (error) {
      console.error('Failed to fetch distance data:', error);
      return null;
    }
  }

  /**
   * Fetch heart rate data
   */
  private async fetchHeartRateData(startTimeNanos: string, endTimeNanos: string): Promise<{avg?: number, resting?: number} | null> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/${startTimeNanos}-${endTimeNanos}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (!data.point || data.point.length === 0) return null;

      // Calculate average heart rate
      const heartRates = data.point.map((point: GoogleFitDataPoint) => point.value?.[0]?.fpVal || 0);
      const avgHeartRate = heartRates.reduce((sum: number, rate: number) => sum + rate, 0) / heartRates.length;

      return {
        avg: Math.round(avgHeartRate),
        resting: Math.round(Math.min(...heartRates))
      };
    } catch (error) {
      console.error('Failed to fetch heart rate data:', error);
      return null;
    }
  }

  /**
   * Fetch sleep data (Google Fit doesn't have native sleep data, this is a placeholder)
   */
  private async fetchSleepData(startTimeNanos: string, endTimeNanos: string): Promise<{hours?: number, quality?: 'poor' | 'fair' | 'good' | 'excellent'} | null> {
    try {
      // Google Fit doesn't have standardized sleep data
      // This would need integration with sleep tracking apps
      // For now, return null or simulated data
      return null;
    } catch (error) {
      console.error('Failed to fetch sleep data:', error);
      return null;
    }
  }

  /**
   * Fetch exercise sessions
   */
  async fetchExerciseSessions(startDate: Date, endDate: Date): Promise<ExerciseSession[]> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Fit');
      }

      const startTimeNanos = (startDate.getTime() * 1000000).toString();
      const endTimeNanos = (endDate.getTime() * 1000000).toString();

      const response = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/sessions',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data: GoogleFitSessionResponse = await response.json();
      
      if (!data.session || data.session.length === 0) return [];

      // Convert Google Fit sessions to our format
      const sessions: ExerciseSession[] = data.session.map((session: GoogleFitSession) => ({
        exercise_type: this.mapActivityType(session.activityType),
        start_time: new Date(parseInt(session.startTimeMillis)).toISOString(),
        end_time: new Date(parseInt(session.endTimeMillis)).toISOString(),
        duration_minutes: Math.round((parseInt(session.endTimeMillis) - parseInt(session.startTimeMillis)) / 60000),
        calories_burned: 0, // Would need additional API call
        exercise_intensity: this.determineIntensity(session.activityType)
      }));

      return sessions;
    } catch (error) {
      console.error('Failed to fetch exercise sessions:', error);
      return [];
    }
  }

  /**
   * Map Google Fit activity types to our exercise types
   */
  private mapActivityType(activityType: number): string {
    const activityMap: { [key: number]: string } = {
      7: 'walking',
      8: 'running',
      1: 'cycling',
      76: 'yoga',
      96: 'swimming',
      113: 'weightlifting',
      // Add more mappings as needed
    };

    return activityMap[activityType] || 'unknown';
  }

  /**
   * Determine exercise intensity based on activity type
   */
  private determineIntensity(activityType: number): 'light' | 'moderate' | 'vigorous' {
    const vigorousActivities = [8, 96]; // Running, swimming
    const moderateActivities = [7, 1, 113]; // Walking, cycling, weightlifting
    
    if (vigorousActivities.includes(activityType)) return 'vigorous';
    if (moderateActivities.includes(activityType)) return 'moderate';
    return 'light';
  }

  /**
   * Disconnect from Google Fit
   */
  async disconnect(): Promise<boolean> {
    try {
      if (!this.isInitialized) return true;

      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      
      this.accessToken = null;
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Google Fit:', error);
      return false;
    }
  }
}

// Default configuration - should be moved to environment variables
export const defaultGoogleFitConfig: GoogleFitConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  redirectUri: window.location.origin,
  scopes: [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.location.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read'
  ]
};

// Singleton instance
export const googleFitAPI = new GoogleFitIntegration(defaultGoogleFitConfig);

interface GoogleFitSession {
  activityType: number;
  startTimeMillis: string;
  endTimeMillis: string;
  name?: string;
}

interface GoogleFitSessionResponse {
  session: GoogleFitSession[];
}

// Type declarations for Google API
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      auth2: {
        init: (config: { client_id: string; scope: string }) => Promise<void>;
        getAuthInstance: () => {
          signIn: () => Promise<{
            getAuthResponse: () => { access_token: string };
          }>;
          signOut: () => Promise<void>;
          isSignedIn: {
            get: () => boolean;
          };
        };
      };
    };
  }
}