/**
 * Production-grade nutrition calculation engine
 * Implements industry-standard formulas with comprehensive error handling
 */

import { z } from 'zod';

// Type definitions for type safety
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

export interface NutritionGoals {
  daily_calories: number;
  daily_carbs: number;
  daily_fats: number;
  daily_proteins: number;
  bmr: number;
  tdee: number;
  macro_percentages: {
    carbs: number;
    protein: number;
    fat: number;
  };
}

export interface GoalType {
  key: string;
  label: string;
  macro_split: {
    carbs: number;
    protein: number;
    fat: number;
  };
}

// Validation schemas for production safety
const ProfileValidationSchema = z.object({
  age: z.number().min(12).max(120, "Age must be between 12 and 80"),
  gender: z.enum(['male', 'female', 'other']),
  height: z.number().min(120).max(250, "Height must be between 120cm and 250cm"),
  weight: z.number().min(30).max(300, "Weight must be between 30kg and 300kg"),
  target_weight: z.number().min(30).max(300, "Target weight must be between 30kg and 300kg"),
  user_type: z.enum(['diabetes', 'gym', 'general'])
});

// Macro distribution templates based on user type and goals
export const MACRO_TEMPLATES: Record<string, Record<string, GoalType>> = {
  diabetes: {
    maintain: {
      key: "diabetes_maintain",
      label: "Blood Sugar Control",
      macro_split: { carbs: 40, protein: 30, fat: 30 }
    }
  },
  gym: {
    bulk: {
      key: "gym_bulk",
      label: "Muscle Building",
      macro_split: { carbs: 40, protein: 35, fat: 25 }
    },
    cut: {
      key: "gym_cut", 
      label: "Fat Loss",
      macro_split: { carbs: 35, protein: 40, fat: 25 }
    },
    maintain: {
      key: "gym_maintain",
      label: "Maintenance",
      macro_split: { carbs: 40, protein: 30, fat: 30 }
    }
  },
  general: {
    weight_loss: {
      key: "general_weight_loss",
      label: "Weight Loss",
      macro_split: { carbs: 40, protein: 30, fat: 30 }
    },
    weight_gain: {
      key: "general_weight_gain",
      label: "Weight Gain", 
      macro_split: { carbs: 45, protein: 25, fat: 30 }
    },
    maintain: {
      key: "general_maintain",
      label: "Maintain Weight",
      macro_split: { carbs: 45, protein: 25, fat: 30 }
    }
  }
};

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
 * Most accurate formula for modern populations
 */
export function calculateBMR(
  weight: number,
  height: number, 
  age: number,
  gender: string
): number {
  try {
    const baseMetabolism = 10 * weight + 6.25 * height - 5 * age;
    
    switch (gender.toLowerCase()) {
      case 'male':
        return Math.round(baseMetabolism + 5);
      case 'female':
        return Math.round(baseMetabolism - 161);
      default:
        // Use average for non-binary
        return Math.round(baseMetabolism - 78);
    }
  } catch (error) {
    throw new Error(`BMR calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate Total Daily Energy Expenditure
 * Enhanced to support both static activity levels and real activity data
 */
export function calculateTDEE(
  bmr: number, 
  activityMultiplier?: number, 
  useDefaultMultiplier: boolean = true
): number {
  try {
    let multiplier: number;
    
    if (activityMultiplier && !useDefaultMultiplier) {
      // Use real activity data multiplier (from useActivityData hook)
      multiplier = activityMultiplier;
    } else {
      // Use moderate activity level (1.55) as default for general population
      multiplier = 1.55;
    }
    
    // Ensure multiplier is within reasonable bounds
    multiplier = Math.max(1.2, Math.min(2.0, multiplier));
    
    return Math.round(bmr * multiplier);
  } catch (error) {
    throw new Error(`TDEE calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced TDEE calculation using real activity data
 * Integrates with smart device data for more accurate calculations
 */
export function calculateTDEEWithActivity(
  bmr: number,
  activityData?: {
    steps?: number;
    activeMinutes?: number;
    exerciseCalories?: number;
    weeklyExerciseSessions?: number;
  }
): number {
  try {
    let activityMultiplier = 1.2; // Base sedentary
    
    if (activityData) {
      const { steps = 0, activeMinutes = 0, exerciseCalories = 0, weeklyExerciseSessions = 0 } = activityData;
      
      // Calculate activity multiplier based on real data
      // Base sedentary: 1.2
      // Add for steps: +0.0001 per step above 2000
      // Add for active minutes: +0.005 per minute above 30
      // Add for exercise sessions: +0.05 per session per day (weekly average)
      
      if (steps > 2000) {
        activityMultiplier += (steps - 2000) * 0.0001;
      }
      
      if (activeMinutes > 30) {
        activityMultiplier += (activeMinutes - 30) * 0.005;
      }
      
      if (weeklyExerciseSessions > 0) {
        const dailySessionAverage = weeklyExerciseSessions / 7;
        activityMultiplier += dailySessionAverage * 0.05;
      }
      
      // Additional calories from intense exercise
      if (exerciseCalories > 0) {
        const extraFromExercise = exerciseCalories / bmr;
        activityMultiplier += extraFromExercise * 0.1; // Conservative adjustment
      }
    }
    
    // Cap the multiplier to reasonable bounds (1.2 to 2.0)
    activityMultiplier = Math.max(1.2, Math.min(2.0, activityMultiplier));
    
    return Math.round(bmr * activityMultiplier);
  } catch (error) {
    throw new Error(`Activity-based TDEE calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate caloric adjustment based on goal
 */
export function calculateCaloricGoal(
  tdee: number,
  currentWeight: number,
  targetWeight: number,
  userType: string,
  goalType: string = 'maintain'
): number {
  try {
    const weightDifference = targetWeight - currentWeight;
    
    // Base caloric adjustment
    let adjustment = 0;
    
    if (Math.abs(weightDifference) < 2) {
      // Maintenance calories
      adjustment = 0;
    } else if (weightDifference < 0) {
      // Weight loss: create deficit
      const weeklyLossGoal = Math.min(Math.abs(weightDifference) * 0.1, 1); // Max 1kg/week
      adjustment = -500 * weeklyLossGoal; // 500 cal deficit ≈ 0.5kg/week
    } else {
      // Weight gain: create surplus
      const weeklyGainGoal = Math.min(weightDifference * 0.1, 0.5); // Max 0.5kg/week
      adjustment = 500 * weeklyGainGoal;
    }
    
    // User type specific adjustments
    if (userType === 'diabetes') {
      // More conservative approach for diabetics
      adjustment *= 0.8;
    } else if (userType === 'gym' && goalType === 'bulk') {
      // Aggressive bulk for gym users
      adjustment *= 1.2;
    }
    
    const targetCalories = tdee + adjustment;
    
    // Safety bounds
    const minCalories = userType === 'diabetes' ? 1400 : 1200;
    const maxCalories = tdee * 1.4; // Max 40% surplus
    
    return Math.round(Math.max(minCalories, Math.min(maxCalories, targetCalories)));
  } catch (error) {
    throw new Error(`Caloric goal calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate macro distribution in grams
 */
export function calculateMacros(
  calories: number,
  userType: string,
  goalType: string = 'maintain'
): { carbs: number; protein: number; fat: number; percentages: { carbs: number; protein: number; fat: number } } {
  try {
    const templates = MACRO_TEMPLATES[userType];
    
    if (!templates) {
      throw new Error(`Invalid user type: ${userType}`);
    }
    
    const template = templates[goalType] || templates.maintain;
    const percentages = template.macro_split;
    
    // Calculate grams (4 cal/g for carbs/protein, 9 cal/g for fat)
    const carbCalories = calories * (percentages.carbs / 100);
    const proteinCalories = calories * (percentages.protein / 100);
    const fatCalories = calories * (percentages.fat / 100);
    
    return {
      carbs: Math.round(carbCalories / 4),
      protein: Math.round(proteinCalories / 4), 
      fat: Math.round(fatCalories / 9),
      percentages
    };
  } catch (error) {
    throw new Error(`Macro calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main function to calculate complete nutrition goals
 * Production-grade with comprehensive validation and error handling
 */
export function calculateNutritionGoals(
  profile: UserProfile,
  goalType: string = 'maintain'
): NutritionGoals {
  try {
    // Validate input data
    const validatedProfile = ProfileValidationSchema.parse({
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      target_weight: profile.target_weight,
      user_type: profile.user_type
    });
    
    // Calculate BMR and TDEE
    const bmr = calculateBMR(
      validatedProfile.weight,
      validatedProfile.height,
      validatedProfile.age,
      validatedProfile.gender
    );
    
    const tdee = calculateTDEE(bmr);
    
    // Calculate target calories
    const targetCalories = calculateCaloricGoal(
      tdee,
      validatedProfile.weight,
      validatedProfile.target_weight,
      validatedProfile.user_type,
      goalType
    );
    
    // Calculate macros
    const macros = calculateMacros(targetCalories, validatedProfile.user_type, goalType);
    
    return {
      daily_calories: targetCalories,
      daily_carbs: macros.carbs,
      daily_fats: macros.fat,
      daily_proteins: macros.protein,
      bmr,
      tdee,
      macro_percentages: macros.percentages
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new Error(`Profile validation failed: ${issues}`);
    }
    
    throw new Error(`Nutrition calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced nutrition goals calculation with real activity data
 * Uses smart device integration for more accurate TDEE calculations
 */
export function calculateNutritionGoalsWithActivity(
  profile: UserProfile,
  activityData: {
    averageSteps?: number;
    averageActiveMinutes?: number;
    averageExerciseCalories?: number;
    weeklyExerciseSessions?: number;
  },
  goalType: string = 'maintain'
): NutritionGoals & { activityMultiplier: number; isActivityBased: boolean } {
  try {
    // Validate input data
    const validatedProfile = ProfileValidationSchema.parse({
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      target_weight: profile.target_weight,
      user_type: profile.user_type
    });
    
    // Calculate BMR
    const bmr = calculateBMR(
      validatedProfile.weight,
      validatedProfile.height,
      validatedProfile.age,
      validatedProfile.gender
    );
    
    // Calculate activity-based TDEE
    const activityTDEE = calculateTDEEWithActivity(bmr, activityData);
    
    // Calculate activity multiplier for reference
    const activityMultiplier = activityTDEE / bmr;
    
    // Calculate target calories
    const targetCalories = calculateCaloricGoal(
      activityTDEE,
      validatedProfile.weight,
      validatedProfile.target_weight,
      validatedProfile.user_type,
      goalType
    );
    
    // Calculate macros
    const macros = calculateMacros(targetCalories, validatedProfile.user_type, goalType);
    
    return {
      daily_calories: targetCalories,
      daily_carbs: macros.carbs,
      daily_fats: macros.fat,
      daily_proteins: macros.protein,
      bmr,
      tdee: activityTDEE,
      macro_percentages: macros.percentages,
      activityMultiplier: Math.round(activityMultiplier * 100) / 100,
      isActivityBased: true
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new Error(`Profile validation failed: ${issues}`);
    }
    
    throw new Error(`Activity-based nutrition calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility function to determine goal type based on weight difference
 */
export function determineGoalType(currentWeight: number, targetWeight: number, userType: string): string {
  const weightDifference = targetWeight - currentWeight;
  
  if (Math.abs(weightDifference) < 2) {
    return 'maintain';
  }
  
  if (userType === 'gym') {
    return weightDifference > 0 ? 'bulk' : 'cut';
  } else if (userType === 'general') {
    return weightDifference > 0 ? 'weight_gain' : 'weight_loss';
  }
  
  return 'maintain'; // Default for diabetes
}

/**
 * Calculate BMI with WHO classification
 */
export function calculateBMI(weight: number, height: number): { bmi: number; category: string; isHealthy: boolean } {
  try {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    let category: string;
    let isHealthy: boolean;
    
    if (bmi < 18.5) {
      category = 'Underweight';
      isHealthy = false;
    } else if (bmi < 25) {
      category = 'Normal weight';
      isHealthy = true;
    } else if (bmi < 30) {
      category = 'Overweight';
      isHealthy = false;
    } else {
      category = 'Obese';
      isHealthy = false;
    }
    
    return {
      bmi: Math.round(bmi * 10) / 10,
      category,
      isHealthy
    };
  } catch (error) {
    throw new Error(`BMI calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if nutrition goals are safe and realistic
 */
export function validateNutritionGoals(goals: NutritionGoals, profile: UserProfile): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check for extremely low calories
  if (goals.daily_calories < 1200) {
    warnings.push('Daily calories are below recommended minimum (1200)');
  }
  
  // Check for extremely high calories
  if (goals.daily_calories > goals.tdee * 1.5) {
    warnings.push('Daily calories are significantly above maintenance level');
  }
  
  // Check protein adequacy
  const proteinPerKg = goals.daily_proteins / (profile.weight || 70);
  if (proteinPerKg < 0.8) {
    warnings.push('Protein intake may be insufficient (recommended: 0.8-1.2g/kg)');
  }
  
  // Check for diabetes-specific concerns
  if (profile.user_type === 'diabetes' && goals.macro_percentages.carbs > 45) {
    warnings.push('Carbohydrate percentage may be too high for diabetes management');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

export default {
  calculateBMR,
  calculateTDEE,
  calculateTDEEWithActivity,
  calculateNutritionGoals,
  calculateNutritionGoalsWithActivity,
  calculateBMI,
  determineGoalType,
  validateNutritionGoals,
  MACRO_TEMPLATES
};