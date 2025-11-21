/**
 * Apple Health Simulation for Web
 * Since Apple Health is iOS-only, this provides a web-compatible simulation
 * for development and testing purposes
 */

import { ActivityData, ExerciseSession } from '@/hooks/useActivityData';

interface AppleHealthData {
  steps: number;
  distance: number;
  activeEnergy: number;
  heartRate: {
    average: number;
    resting: number;
  };
  sleep: {
    hours: number;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  workouts: Array<{
    type: string;
    startDate: string;
    endDate: string;
    duration: number;
    calories: number;
    heartRate?: {
      average: number;
      max: number;
    };
  }>;
}

export class AppleHealthSimulation {
  private isConnected = false;
  private simulatedData: Map<string, AppleHealthData> = new Map();

  /**
   * Simulate connection to Apple Health
   */
  async connect(): Promise<boolean> {
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we're on iOS (for real implementation)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (!isIOS) {
        console.log('Apple Health simulation enabled for web development');
      }
      
      this.isConnected = true;
      this.generateSimulatedData();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Apple Health:', error);
      return false;
    }
  }

  /**
   * Check if connected to Apple Health
   */
  isHealthConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Generate simulated health data for the past week
   */
  private generateSimulatedData(): void {
    const today = new Date();
    
    // Generate data for the past 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      // Generate realistic but random data
      const baseSteps = 8000;
      const stepVariation = Math.random() * 4000; // 0-4000 variation
      const steps = Math.floor(baseSteps + stepVariation);
      
      const baseDistance = 6000; // meters
      const distance = Math.floor(baseDistance + (stepVariation * 0.8));
      
      const baseCalories = 300;
      const calories = Math.floor(baseCalories + Math.random() * 200);
      
      const heartRateBase = 70;
      const heartRateVariation = Math.random() * 20 - 10;
      const avgHeartRate = Math.floor(heartRateBase + heartRateVariation);
      const restingHeartRate = Math.floor(avgHeartRate - 10 - Math.random() * 10);
      
      const sleepHours = 6 + Math.random() * 3; // 6-9 hours
      const sleepQuality = this.determineSleepQuality(sleepHours);
      
      // Generate 0-2 workouts per day
      const workoutCount = Math.random() < 0.7 ? (Math.random() < 0.3 ? 2 : 1) : 0;
      const workouts = this.generateWorkouts(date, workoutCount);
      
      this.simulatedData.set(dateKey, {
        steps,
        distance,
        activeEnergy: calories,
        heartRate: {
          average: avgHeartRate,
          resting: restingHeartRate
        },
        sleep: {
          hours: Math.round(sleepHours * 10) / 10,
          quality: sleepQuality
        },
        workouts
      });
    }
  }

  /**
   * Determine sleep quality based on hours
   */
  private determineSleepQuality(hours: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (hours >= 8) return 'excellent';
    if (hours >= 7) return 'good';
    if (hours >= 6) return 'fair';
    return 'poor';
  }

  /**
   * Generate realistic workout data
   */
  private generateWorkouts(date: Date, count: number): AppleHealthData['workouts'] {
    const workoutTypes = [
      { type: 'running', duration: [20, 60], intensity: 'vigorous' },
      { type: 'walking', duration: [30, 90], intensity: 'moderate' },
      { type: 'cycling', duration: [30, 120], intensity: 'moderate' },
      { type: 'weightlifting', duration: [45, 90], intensity: 'moderate' },
      { type: 'yoga', duration: [30, 60], intensity: 'light' },
      { type: 'swimming', duration: [30, 60], intensity: 'vigorous' }
    ];
    
    const workouts = [];
    
    for (let i = 0; i < count; i++) {
      const workoutType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      const duration = Math.floor(
        Math.random() * (workoutType.duration[1] - workoutType.duration[0]) + workoutType.duration[0]
      );
      
      const startHour = Math.floor(Math.random() * 14) + 6; // 6 AM to 8 PM
      const startMinute = Math.floor(Math.random() * 60);
      
      const startDate = new Date(date);
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + duration);
      
      const calories = this.calculateWorkoutCalories(workoutType.type, duration, workoutType.intensity);
      const heartRate = this.generateWorkoutHeartRate(workoutType.intensity);
      
      workouts.push({
        type: workoutType.type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration,
        calories,
        heartRate
      });
    }
    
    return workouts;
  }

  /**
   * Calculate calories for workout
   */
  private calculateWorkoutCalories(type: string, duration: number, intensity: string): number {
    const baseCaloriesPerMinute: { [key: string]: number } = {
      'running': 12,
      'walking': 5,
      'cycling': 8,
      'weightlifting': 6,
      'yoga': 3,
      'swimming': 10
    };
    
    const intensityMultiplier: { [key: string]: number } = {
      'light': 0.8,
      'moderate': 1.0,
      'vigorous': 1.4
    };
    
    const baseRate = baseCaloriesPerMinute[type] || 6;
    const multiplier = intensityMultiplier[intensity] || 1.0;
    
    return Math.floor(baseRate * duration * multiplier);
  }

  /**
   * Generate workout heart rate data
   */
  private generateWorkoutHeartRate(intensity: string): { average: number; max: number } {
    const baseHeartRate = 70;
    
    const intensityIncrease: { [key: string]: number } = {
      'light': 20,
      'moderate': 40,
      'vigorous': 70
    };
    
    const increase = intensityIncrease[intensity] || 30;
    const average = baseHeartRate + increase + Math.floor(Math.random() * 20) - 10;
    const max = average + Math.floor(Math.random() * 30) + 10;
    
    return { average, max };
  }

  /**
   * Fetch health data for a specific date
   */
  async fetchHealthData(date: Date): Promise<Partial<ActivityData> | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Apple Health');
      }

      const dateKey = date.toISOString().split('T')[0];
      const data = this.simulatedData.get(dateKey);
      
      if (!data) {
        // Generate data for requested date if not available
        this.generateDataForDate(date);
        return this.fetchHealthData(date);
      }

      // Convert to our ActivityData format
      return {
        steps: data.steps,
        distance_meters: data.distance,
        calories_burned: data.activeEnergy,
        heart_rate_avg: data.heartRate.average,
        heart_rate_resting: data.heartRate.resting,
        sleep_hours: data.sleep.hours,
        sleep_quality: data.sleep.quality,
        exercise_sessions: data.workouts.map(workout => ({
          exercise_type: workout.type,
          start_time: workout.startDate,
          end_time: workout.endDate,
          duration_minutes: workout.duration,
          calories_burned: workout.calories,
          heart_rate_avg: workout.heartRate?.average,
          heart_rate_max: workout.heartRate?.max,
          exercise_intensity: this.mapWorkoutIntensity(workout.type)
        })),
        data_source: 'apple_health'
      };
    } catch (error) {
      console.error('Failed to fetch Apple Health data:', error);
      return null;
    }
  }

  /**
   * Generate data for a specific date
   */
  private generateDataForDate(date: Date): void {
    const dateKey = date.toISOString().split('T')[0];
    
    if (this.simulatedData.has(dateKey)) return;
    
    // Use similar logic as generateSimulatedData but for single date
    const steps = Math.floor(8000 + Math.random() * 4000);
    const distance = Math.floor(6000 + Math.random() * 3000);
    const calories = Math.floor(300 + Math.random() * 200);
    const avgHeartRate = Math.floor(70 + Math.random() * 20 - 10);
    const restingHeartRate = Math.floor(avgHeartRate - 10 - Math.random() * 10);
    const sleepHours = 6 + Math.random() * 3;
    const workoutCount = Math.random() < 0.7 ? (Math.random() < 0.3 ? 2 : 1) : 0;
    
    this.simulatedData.set(dateKey, {
      steps,
      distance,
      activeEnergy: calories,
      heartRate: {
        average: avgHeartRate,
        resting: restingHeartRate
      },
      sleep: {
        hours: Math.round(sleepHours * 10) / 10,
        quality: this.determineSleepQuality(sleepHours)
      },
      workouts: this.generateWorkouts(date, workoutCount)
    });
  }

  /**
   * Map workout type to intensity
   */
  private mapWorkoutIntensity(type: string): 'light' | 'moderate' | 'vigorous' {
    const intensityMap: { [key: string]: 'light' | 'moderate' | 'vigorous' } = {
      'running': 'vigorous',
      'swimming': 'vigorous',
      'cycling': 'moderate',
      'walking': 'moderate',
      'weightlifting': 'moderate',
      'yoga': 'light'
    };
    
    return intensityMap[type] || 'moderate';
  }

  /**
   * Fetch exercise sessions for a date range
   */
  async fetchExerciseSessions(startDate: Date, endDate: Date): Promise<ExerciseSession[]> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Apple Health');
      }

      const sessions: ExerciseSession[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const data = this.simulatedData.get(dateKey);
        
        if (data?.workouts) {
          const dateSessions = data.workouts.map(workout => ({
            exercise_type: workout.type,
            start_time: workout.startDate,
            end_time: workout.endDate,
            duration_minutes: workout.duration,
            calories_burned: workout.calories,
            heart_rate_avg: workout.heartRate?.average,
            heart_rate_max: workout.heartRate?.max,
            exercise_intensity: this.mapWorkoutIntensity(workout.type)
          }));
          
          sessions.push(...dateSessions);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to fetch Apple Health exercise sessions:', error);
      return [];
    }
  }

  /**
   * Disconnect from Apple Health
   */
  async disconnect(): Promise<boolean> {
    try {
      this.isConnected = false;
      this.simulatedData.clear();
      
      console.log('Disconnected from Apple Health simulation');
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Apple Health:', error);
      return false;
    }
  }

  /**
   * Check if Apple Health is available (iOS detection)
   */
  static isAvailable(): boolean {
    // In a real implementation, this would check for Apple Health availability
    // For simulation, we'll check if we're on iOS
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
}

// Singleton instance
export const appleHealthAPI = new AppleHealthSimulation();