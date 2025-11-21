import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Heart, 
  Dumbbell, 
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Target,
  Calendar,
  Utensils,
  TrendingUp,
  Loader2,
  Users
} from "lucide-react";
import { 
  calculateNutritionGoals, 
  determineGoalType, 
  type UserProfile,
  type NutritionGoals
} from "@/lib/nutritionCalculations";

interface OnboardingData {
  user_type: 'diabetes' | 'gym' | 'general' | '';
  primary_goal: string;
  workout_frequency?: string;
  diabetes_type?: string;
  medication?: string;
  dietary_restrictions?: string;
  specific_goals?: string;
}

const userTypes = [
  {
    value: 'diabetes' as const,
    label: 'Managing Diabetes',
    description: 'Get personalized nutrition plans for blood sugar control',
    icon: Heart,
    color: 'border-red-500 bg-red-500/10',
    features: ['Blood sugar tracking', 'Carb counting', 'Medication reminders']
  },
  {
    value: 'gym' as const,
    label: 'Gym & Fitness',
    description: 'Optimize your nutrition for workout and body goals',
    icon: Dumbbell,
    color: 'border-blue-500 bg-blue-500/10',
    features: ['Macro tracking', 'Pre/post workout nutrition', 'Body composition goals']
  },
  {
    value: 'general' as const,
    label: 'General Health',
    description: 'Maintain a balanced diet and healthy lifestyle',
    icon: Users,
    color: 'border-green-500 bg-green-500/10',
    features: ['Balanced nutrition', 'Weight management', 'Healthy habits']
  }
];

const gymGoals = [
  { value: 'bulk', label: 'Build Muscle (Bulk)', description: 'Gain muscle mass and strength' },
  { value: 'cut', label: 'Lose Fat (Cut)', description: 'Reduce body fat while maintaining muscle' },
  { value: 'maintain', label: 'Maintain', description: 'Maintain current physique and performance' }
];

const diabetesGoals = [
  { value: 'control', label: 'Blood Sugar Control', description: 'Focus on stable glucose levels' },
  { value: 'weight_loss', label: 'Weight Management', description: 'Healthy weight loss with diabetes management' }
];

const generalGoals = [
  { value: 'weight_loss', label: 'Lose Weight', description: 'Healthy and sustainable weight loss' },
  { value: 'weight_gain', label: 'Gain Weight', description: 'Healthy weight gain and muscle building' },
  { value: 'maintain', label: 'Maintain Health', description: 'Maintain current weight and health status' }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    user_type: '',
    primary_goal: ''
  });
  const [calculatedGoals, setCalculatedGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, updateProfile, saveNutritionGoals, refreshProfile } = useProfile();
  const { user } = useAuth();

  const totalSteps = 3; // Welcome, User Type, Goals, Summary

  useEffect(() => {
    // If user already has a user_type, they don't need onboarding
    if (profile?.user_type) {
      navigate('/dashboard');
      return;
    }

    // Ensure profile is loaded
    if (!profile) {
      refreshProfile();
    }
  }, [profile, navigate, refreshProfile]);

  const updateOnboardingData = (field: keyof OnboardingData, value: string) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getGoalOptions = () => {
    switch (onboardingData.user_type) {
      case 'diabetes': return diabetesGoals;
      case 'gym': return gymGoals;
      case 'general': return generalGoals;
      default: return [];
    }
  };

  const calculateGoals = async () => {
    if (!profile || !onboardingData.user_type || !onboardingData.primary_goal) {
      toast({
        title: "Missing Information",
        description: "Please complete all fields to calculate your nutrition goals.",
        variant: "destructive"
      });
      return null;
    }

    // Validate user_type is one of the allowed values
    const validUserTypes = ['diabetes', 'gym', 'general'] as const;
    if (!validUserTypes.includes(onboardingData.user_type as typeof validUserTypes[number])) {
      toast({
        title: "Invalid User Type",
        description: "Please select a valid user type.",
        variant: "destructive"
      });
      return null;
    }

    try {
      const goalType = determineGoalType(
        profile.weight || 70,
        profile.target_weight || 70,
        onboardingData.user_type
      );

      const goals = calculateNutritionGoals(
        { ...profile, user_type: onboardingData.user_type } as UserProfile,
        goalType
      );

      setCalculatedGoals(goals);
      return goals;
    } catch (error) {
      console.error('Goal calculation error:', error);
      toast({
        title: "Calculation Error",
        description: "Unable to calculate your nutrition goals. Please check your profile data.",
        variant: "destructive"
      });
      return null;
    }
  };

  const completeOnboarding = async () => {
    if (!onboardingData.user_type || !calculatedGoals) {
      toast({
        title: "Incomplete Data",
        description: "Please complete all required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Update profile with onboarding data
      const profileUpdateSuccess = await updateProfile({
        user_type: onboardingData.user_type as 'diabetes' | 'gym' | 'general'
      });

      // Save nutrition goals even if profile update fails
      let goalsSuccess = false;
      try {
        goalsSuccess = await saveNutritionGoals(calculatedGoals);
      } catch (goalsError) {
        console.error('Failed to save nutrition goals:', goalsError);
      }

      if (!profileUpdateSuccess && !goalsSuccess) {
        toast({
          title: "Partial Setup",
          description: "Some settings couldn't be saved, but you can continue using the app.",
          variant: "destructive",
        });
      } else if (!profileUpdateSuccess) {
        toast({
          title: "Profile Update Issue",
          description: "Your goals were saved, but there was an issue updating your profile. You can update it later in settings.",
          variant: "destructive",
        });
      } else if (!goalsSuccess) {
        toast({
          title: "Goals Save Issue", 
          description: "Your profile was updated, but there was an issue saving your nutrition goals. You can set them later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Setup Complete! 🎉",
          description: "Your profile has been configured successfully.",
        });
      }

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast({
        title: "Setup Failed",
        description: "There was an error completing your setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === totalSteps - 1) {
      // Calculate goals before final step
      const goals = await calculateGoals();
      if (!goals) return; // Don't proceed if calculation failed
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Welcome step
      case 1: return !!onboardingData.user_type; // User type selection
      case 2: return !!onboardingData.primary_goal; // Goals selection
      default: return false;
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen w-full fitness-gradient flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full fitness-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="fitness-card border-0 shadow-elevated">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-fitness-primary">
                <Dumbbell className="h-8 w-8" />
                <Heart className="h-6 w-6" />
              </div>
            </div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Welcome to AI Nutrition Analyzer
              </CardTitle>
              <p className="text-fitness-light mt-2">
                Let's personalize your nutrition journey in just a few steps
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-sm text-fitness-light">
                <span>Step {currentStep + 1} of {totalSteps + 1}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <Progress 
                value={(currentStep / totalSteps) * 100} 
                className="h-2 bg-fitness-dark"
              />
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center space-y-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Let's Get Started! 🚀
                  </h2>
                  <p className="text-fitness-light leading-relaxed">
                    We'll help you create a personalized nutrition plan based on your goals, 
                    lifestyle, and health needs. This will only take a few minutes.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
                  <div className="text-center p-4">
                    <Target className="h-12 w-12 text-fitness-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-white mb-2">Set Your Goals</h3>
                    <p className="text-fitness-light text-sm">Define what you want to achieve</p>
                  </div>
                  <div className="text-center p-4">
                    <Calendar className="h-12 w-12 text-fitness-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-white mb-2">Get Your Plan</h3>
                    <p className="text-fitness-light text-sm">Receive personalized nutrition targets</p>
                  </div>
                  <div className="text-center p-4">
                    <TrendingUp className="h-12 w-12 text-fitness-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-white mb-2">Track Progress</h3>
                    <p className="text-fitness-light text-sm">Monitor your journey and improve</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: User Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    What's your primary focus?
                  </h2>
                  <p className="text-fitness-light">
                    Choose the option that best describes your health and fitness goals
                  </p>
                </div>

                <RadioGroup 
                  value={onboardingData.user_type}
                  onValueChange={(value) => updateOnboardingData('user_type', value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {userTypes.map((type) => (
                    <div key={type.value} className="relative">
                      <div className={`p-6 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${
                        onboardingData.user_type === type.value 
                          ? type.color + ' border-opacity-100 bg-opacity-20' 
                          : 'border-fitness-muted/20 hover:border-fitness-primary/50'
                      }`}>
                        <RadioGroupItem 
                          value={type.value} 
                          id={type.value}
                          className="absolute top-4 right-4"
                        />
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${onboardingData.user_type === type.value ? 'bg-white/10' : 'bg-fitness-muted/10'}`}>
                              <type.icon className="h-6 w-6 text-fitness-primary" />
                            </div>
                            <Label htmlFor={type.value} className="text-white font-semibold cursor-pointer">
                              {type.label}
                            </Label>
                          </div>
                          <p className="text-fitness-light text-sm">
                            {type.description}
                          </p>
                          <div className="space-y-1">
                            {type.features.map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-fitness-light">
                                <CheckCircle className="h-3 w-3 text-fitness-primary" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 2: Specific Goals */}
            {currentStep === 2 && onboardingData.user_type && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    What's your primary goal?
                  </h2>
                  <p className="text-fitness-light">
                    This helps us customize your nutrition plan
                  </p>
                </div>

                <RadioGroup 
                  value={onboardingData.primary_goal}
                  onValueChange={(value) => updateOnboardingData('primary_goal', value)}
                  className="space-y-3"
                >
                  {getGoalOptions().map((goal) => (
                    <div key={goal.value} className="flex items-center space-x-3 p-4 rounded-lg border border-fitness-muted/20 hover:border-fitness-primary/50 transition-colors">
                      <RadioGroupItem value={goal.value} id={goal.value} />
                      <div className="flex-1">
                        <Label htmlFor={goal.value} className="text-white font-medium cursor-pointer">
                          {goal.label}
                        </Label>
                        <p className="text-fitness-light text-sm mt-1">{goal.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                {/* Additional fields for specific user types */}
                {onboardingData.user_type === 'diabetes' && (
                  <div className="space-y-4 pt-4 border-t border-fitness-muted/20">
                    <h3 className="text-white font-semibold">Additional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="diabetes_type" className="text-white">Type of Diabetes (optional)</Label>
                        <Input
                          id="diabetes_type"
                          placeholder="e.g., Type 1, Type 2"
                          value={onboardingData.diabetes_type || ''}
                          onChange={(e) => updateOnboardingData('diabetes_type', e.target.value)}
                          className="fitness-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="medication" className="text-white">Current Medication (optional)</Label>
                        <Input
                          id="medication"
                          placeholder="e.g., Metformin, Insulin"
                          value={onboardingData.medication || ''}
                          onChange={(e) => updateOnboardingData('medication', e.target.value)}
                          className="fitness-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {onboardingData.user_type === 'gym' && (
                  <div className="space-y-4 pt-4 border-t border-fitness-muted/20">
                    <h3 className="text-white font-semibold">Workout Information</h3>
                    <div className="space-y-2">
                      <Label htmlFor="workout_frequency" className="text-white">Workout Frequency (optional)</Label>
                      <Input
                        id="workout_frequency"
                        placeholder="e.g., 4-5 times per week"
                        value={onboardingData.workout_frequency || ''}
                        onChange={(e) => updateOnboardingData('workout_frequency', e.target.value)}
                        className="fitness-input"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="dietary_restrictions" className="text-white">Dietary Restrictions/Preferences (optional)</Label>
                  <Textarea
                    id="dietary_restrictions"
                    placeholder="e.g., Vegetarian, no nuts, low sodium..."
                    value={onboardingData.dietary_restrictions || ''}
                    onChange={(e) => updateOnboardingData('dietary_restrictions', e.target.value)}
                    className="fitness-input min-h-20"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Summary & Nutrition Goals */}
            {currentStep === 3 && calculatedGoals && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Your Personalized Nutrition Plan 🎯
                  </h2>
                  <p className="text-fitness-light">
                    Based on your goals and profile, here's your recommended daily nutrition targets
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="fitness-card border border-fitness-muted/20">
                    <CardContent className="p-4 text-center">
                      <Utensils className="h-8 w-8 text-fitness-primary mx-auto mb-2" />
                      <p className="text-fitness-light text-sm">Daily Calories</p>
                      <p className="text-2xl font-bold text-white">{calculatedGoals.daily_calories}</p>
                    </CardContent>
                  </Card>

                  <Card className="fitness-card border border-fitness-muted/20">
                    <CardContent className="p-4 text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">C</span>
                      </div>
                      <p className="text-fitness-light text-sm">Carbs</p>
                      <p className="text-2xl font-bold text-white">{calculatedGoals.daily_carbs}g</p>
                    </CardContent>
                  </Card>

                  <Card className="fitness-card border border-fitness-muted/20">
                    <CardContent className="p-4 text-center">
                      <div className="w-8 h-8 bg-red-500 rounded mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <p className="text-fitness-light text-sm">Protein</p>
                      <p className="text-2xl font-bold text-white">{calculatedGoals.daily_proteins}g</p>
                    </CardContent>
                  </Card>

                  <Card className="fitness-card border border-fitness-muted/20">
                    <CardContent className="p-4 text-center">
                      <div className="w-8 h-8 bg-yellow-500 rounded mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">F</span>
                      </div>
                      <p className="text-fitness-light text-sm">Fat</p>
                      <p className="text-2xl font-bold text-white">{calculatedGoals.daily_fats}g</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-fitness-dark/30 rounded-lg p-6 space-y-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Your Profile Summary
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-fitness-light">Focus Area</p>
                      <p className="text-white font-medium">
                        {userTypes.find(t => t.value === onboardingData.user_type)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-fitness-light">Primary Goal</p>
                      <p className="text-white font-medium">
                        {getGoalOptions().find(g => g.value === onboardingData.primary_goal)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-fitness-light">BMR</p>
                      <p className="text-white font-medium">{calculatedGoals.bmr} calories</p>
                    </div>
                    <div>
                      <p className="text-fitness-light">TDEE</p>
                      <p className="text-white font-medium">{calculatedGoals.tdee} calories</p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-fitness-light">
                  <p>These targets are calculated based on your current profile and can be adjusted anytime in your settings.</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-8 border-t border-fitness-muted/20">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === 0}
                className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center space-x-2 text-sm text-fitness-light">
                {Array.from({ length: totalSteps + 1 }).map((_, index) => (
                  <div 
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-fitness-primary' : 'bg-fitness-muted/30'
                    }`}
                  />
                ))}
              </div>

              {currentStep === totalSteps ? (
                <Button 
                  onClick={completeOnboarding}
                  disabled={loading || !calculatedGoals}
                  className="fitness-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="fitness-button"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}