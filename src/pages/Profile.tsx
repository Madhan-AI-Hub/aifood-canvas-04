import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useProfile, UserProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { 
  User, 
  Edit3, 
  Target, 
  Heart,
  Scale,
  Ruler,
  Save,
  Loader2,
  Users,
  Calendar,
  Flame,
  Wheat,
  Beef,
  Droplets,
  Calculator,
  RefreshCw,
  AlertCircle
} from "lucide-react";

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" }
];

const userTypeOptions = [
  { value: "diabetes", label: "Diabetes Management", icon: Heart, color: "bg-red-500" },
  { value: "gym", label: "Gym & Fitness", icon: Target, color: "bg-blue-500" },
  { value: "general", label: "General Health", icon: Users, color: "bg-green-500" }
];

export default function Profile() {
  const [isSaving, setIsSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRecalculatingGoals, setIsRecalculatingGoals] = useState(false);
  
  const { toast } = useToast();
  const { profile, loading, updateProfile, refreshProfile, isProfileComplete, calculateUserNutritionGoals, saveNutritionGoals } = useProfile();
  const { user } = useAuth();
  const { goals: nutritionGoals, loading: goalsLoading, error: goalsError, refetch: refetchGoals } = useNutritionGoals();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await updateProfile(editedProfile);
      
      if (success) {
        // Check if nutrition-relevant fields changed (weight, height, age, user_type)
        const nutritionRelevantFields = ['weight', 'height', 'age', 'user_type', 'target_weight'];
        const changedNutritionFields = nutritionRelevantFields.some(field => 
          editedProfile[field as keyof UserProfile] !== undefined
        );

        if (changedNutritionFields && profile && profile.age && profile.gender && profile.height && profile.weight && profile.target_weight && profile.user_type) {
          setIsRecalculatingGoals(true);
          try {
            const newGoals = calculateUserNutritionGoals('maintain');
            if (newGoals) {
              await saveNutritionGoals(newGoals);
              await refetchGoals(); // Refresh nutrition goals display
              toast({
                title: "Profile & Goals Updated",
                description: "Your profile and nutrition goals have been recalculated based on your changes.",
              });
            }
          } catch (error) {
            console.error('Failed to recalculate nutrition goals:', error);
            toast({
              title: "Profile Updated",
              description: "Profile saved, but nutrition goals couldn't be recalculated. Please check the Dashboard.",
              variant: "destructive",
            });
          } finally {
            setIsRecalculatingGoals(false);
          }
        }
        
        setDialogOpen(false);
        setEditedProfile({});
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setEditedProfile(profile || {});
    setDialogOpen(true);
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number) => {
    // Add basic validation
    let validatedValue = value;
    
    if (field === 'age' && typeof value === 'number') {
      validatedValue = Math.max(1, Math.min(120, value)); // Age between 1-120
    } else if (field === 'height' && typeof value === 'number') {
      validatedValue = Math.max(50, Math.min(300, value)); // Height between 50-300 cm
    } else if ((field === 'weight' || field === 'target_weight') && typeof value === 'number') {
      validatedValue = Math.max(20, Math.min(500, value)); // Weight between 20-500 kg
    }

    setEditedProfile(prev => ({
      ...prev,
      [field]: validatedValue
    }));
  };

  const calculateBMI = (weight: number, height: number) => {
    const heightInM = height / 100;
    const bmi = weight / (heightInM * heightInM);
    return Math.round(bmi * 10) / 10;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "bg-blue-500" };
    if (bmi < 25) return { label: "Normal", color: "bg-green-500" };
    if (bmi < 30) return { label: "Overweight", color: "bg-yellow-500" };
    return { label: "Obese", color: "bg-red-500" };
  };

  const getUserTypeDisplay = (type: string | null) => {
    const userType = userTypeOptions.find(opt => opt.value === type);
    if (!userType) return { label: "Not Selected", icon: User, color: "bg-gray-500" };
    return userType;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-fitness-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="fitness-card">
          <CardContent className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <User className="h-12 w-12 text-fitness-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Profile Not Found</h3>
              <p className="text-fitness-light">Unable to load your profile data.</p>
              <Button onClick={refreshProfile} className="mt-4 fitness-button">
                Retry Loading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBMI = profile.weight && profile.height ? calculateBMI(profile.weight, profile.height) : null;
  const bmiCategory = currentBMI ? getBMICategory(currentBMI) : null;
  const userType = getUserTypeDisplay(profile.user_type);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-fitness-light">Manage your personal information and preferences</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleEdit} className="fitness-button">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto fitness-card border-0">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Profile</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-white">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editedProfile.full_name || ''}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="fitness-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-white">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      value={editedProfile.age || ''}
                      onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                      className="fitness-input"
                      placeholder="Enter your age"
                    />
                    <p className="text-xs text-fitness-muted">Age between 1-120 years</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-white">Gender</Label>
                    <Select
                      value={editedProfile.gender || ''}
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger className="fitness-input">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user_type" className="text-white">User Type</Label>
                    <Select
                      value={editedProfile.user_type || ''}
                      onValueChange={(value) => handleInputChange('user_type', value)}
                    >
                      <SelectTrigger className="fitness-input">
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        {userTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <option.icon className="w-4 h-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Physical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Physical Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height" className="text-white">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      min="50"
                      max="300"
                      value={editedProfile.height || ''}
                      onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || 0)}
                      className="fitness-input"
                      placeholder="e.g. 175"
                    />
                    <p className="text-xs text-fitness-muted">Height between 50-300 cm</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-white">Current Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="20"
                      max="500"
                      value={editedProfile.weight || ''}
                      onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                      className="fitness-input"
                      placeholder="e.g. 70.5"
                    />
                    <p className="text-xs text-fitness-muted">Weight between 20-500 kg</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_weight" className="text-white">Target Weight (kg)</Label>
                    <Input
                      id="target_weight"
                      type="number"
                      step="0.1"
                      min="20"
                      max="500"
                      value={editedProfile.target_weight || ''}
                      onChange={(e) => handleInputChange('target_weight', parseFloat(e.target.value) || 0)}
                      className="fitness-input"
                      placeholder="e.g. 65.0"
                    />
                    <p className="text-xs text-fitness-muted">Your desired weight goal</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving || isRecalculatingGoals}
                  className="fitness-button"
                >
                  {isSaving || isRecalculatingGoals ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isRecalculatingGoals ? 'Recalculating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>

              {/* Information Note */}
              <div className="mt-4 p-3 bg-fitness-dark/30 rounded-lg border border-fitness-muted/20">
                <div className="flex items-start gap-2">
                  <Calculator className="w-4 h-4 text-fitness-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-fitness-light">
                    <p className="font-semibold mb-1">Automatic Goal Recalculation</p>
                    <p>Changes to weight, height, age, user type, or target weight will automatically recalculate your nutrition goals to ensure optimal recommendations.</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="fitness-card">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-fitness-primary" />
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={profile.full_name || 'User'} />
                <AvatarFallback className="bg-fitness-primary text-white text-lg font-semibold">
                  {profile.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.[0].toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">{profile.full_name || 'Not provided'}</h3>
                <p className="text-fitness-light text-sm">{user?.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-fitness-light">Age</p>
                <p className="font-semibold text-white">{profile.age || '-'}</p>
              </div>
              <div>
                <p className="text-fitness-light">Gender</p>
                <p className="font-semibold text-white">
                  {genderOptions.find(g => g.value === profile.gender)?.label || '-'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-fitness-light text-sm">User Type</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${userType.color} text-white`}>
                  <userType.icon className="w-3 h-3 mr-1" />
                  {userType.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Stats */}
        <Card className="fitness-card">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-fitness-primary" />
              Physical Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-1 text-fitness-light">
                  <Ruler className="w-3 h-3" />
                  <span>Height</span>
                </div>
                <p className="font-semibold text-white">{profile.height ? `${profile.height} cm` : '-'}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-fitness-light">
                  <Scale className="w-3 h-3" />
                  <span>Weight</span>
                </div>
                <p className="font-semibold text-white">{profile.weight ? `${profile.weight} kg` : '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-fitness-light text-sm">Target Weight</p>
              <p className="font-semibold text-white">{profile.target_weight ? `${profile.target_weight} kg` : '-'}</p>
            </div>

            {currentBMI && bmiCategory && (
              <div>
                <p className="text-fitness-light text-sm">BMI</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-white">{currentBMI}</span>
                  <Badge className={`${bmiCategory.color} text-white text-xs`}>
                    {bmiCategory.label}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Completion */}
        <Card className="fitness-card">
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-fitness-primary" />
              Profile Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-fitness-light">Completion</span>
                <span className="font-semibold text-white">{profile.profile_completion_percentage}%</span>
              </div>
              <div className="w-full bg-fitness-dark rounded-full h-2">
                <div 
                  className="bg-fitness-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${profile.profile_completion_percentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isProfileComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm text-fitness-light">
                  {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                </span>
              </div>
              
              {profile.next_required_step && (
                <p className="text-sm text-fitness-primary">
                  Next: {profile.next_required_step}
                </p>
              )}
            </div>

            <div className="text-xs text-fitness-light">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Goals Section */}
      {profile && isProfileComplete && (
        <Card className="fitness-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-fitness-primary" />
              Current Nutrition Goals
            </CardTitle>
            <Button 
              variant="outline"
              size="sm"
              onClick={refetchGoals}
              disabled={goalsLoading}
              className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
            >
              {goalsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {goalsError && (
              <Alert className="mb-4 border-red-500/20 bg-red-500/10">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  {goalsError}
                </AlertDescription>
              </Alert>
            )}
            
            {goalsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-fitness-primary" />
                <span className="ml-2 text-fitness-light">Loading nutrition goals...</span>
              </div>
            ) : nutritionGoals ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-fitness-dark/50">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(nutritionGoals.daily_calories)}</div>
                  <div className="text-sm text-fitness-light">Calories</div>
                  <div className="text-xs text-fitness-muted mt-1">kcal/day</div>
                </div>

                <div className="text-center p-4 rounded-lg bg-fitness-dark/50">
                  <div className="flex items-center justify-center mb-2">
                    <Wheat className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(nutritionGoals.daily_carbs)}</div>
                  <div className="text-sm text-fitness-light">Carbs</div>
                  <div className="text-xs text-fitness-muted mt-1">grams/day</div>
                </div>

                <div className="text-center p-4 rounded-lg bg-fitness-dark/50">
                  <div className="flex items-center justify-center mb-2">
                    <Beef className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(nutritionGoals.daily_proteins)}</div>
                  <div className="text-sm text-fitness-light">Protein</div>
                  <div className="text-xs text-fitness-muted mt-1">grams/day</div>
                </div>

                <div className="text-center p-4 rounded-lg bg-fitness-dark/50">
                  <div className="flex items-center justify-center mb-2">
                    <Droplets className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(nutritionGoals.daily_fats)}</div>
                  <div className="text-sm text-fitness-light">Fats</div>
                  <div className="text-xs text-fitness-muted mt-1">grams/day</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 text-fitness-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Nutrition Goals Set</h3>
                <p className="text-fitness-light mb-4">
                  Complete your profile to calculate personalized nutrition goals.
                </p>
                <Button 
                  onClick={async () => {
                    if (profile && profile.age && profile.gender && profile.height && profile.weight && profile.target_weight && profile.user_type) {
                      setIsRecalculatingGoals(true);
                      try {
                        const goals = calculateUserNutritionGoals('maintain');
                        if (goals) {
                          await saveNutritionGoals(goals);
                          await refetchGoals();
                        }
                      } catch (error) {
                        console.error('Failed to calculate goals:', error);
                      } finally {
                        setIsRecalculatingGoals(false);
                      }
                    } else {
                      toast({
                        title: "Profile Incomplete",
                        description: "Please complete your profile first to calculate nutrition goals.",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!isProfileComplete || isRecalculatingGoals}
                  className="fitness-button"
                >
                  {isRecalculatingGoals ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate Goals
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {nutritionGoals && (
              <div className="mt-4 pt-4 border-t border-fitness-muted/20">
                <p className="text-xs text-fitness-muted text-center">
                  Goals calculated on {new Date(nutritionGoals.calculation_date).toLocaleDateString()}
                  {profile?.user_type && (
                    <> • Optimized for {profile.user_type === 'diabetes' ? 'Diabetes Management' : profile.user_type === 'gym' ? 'Fitness Goals' : 'General Health'}</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}